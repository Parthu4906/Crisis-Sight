
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TriageResult } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main analysis function with robust retry logic and language enforcement.
 */
export const analyzeDisasterSite = async (
  base64Data: string, 
  mimeType: string,
  language: string,
  location?: { lat: number, lng: number },
  maxRetries = 3
): Promise<TriageResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const locationStr = location 
    ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`
    : 'Unknown Location';

  const executeRequest = async () => {
    return await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `ACT AS AN EMERGENCY RESPONSE COORDINATOR. 
            
            STRICT LANGUAGE REQUIREMENT: 
            THE ENTIRE OUTPUT JSON CONTENT MUST BE IN ${language}. 
            Do not use English for: damageType, urgency, description, checklist, or sosMessage.
            
            CONTEXT: The victim is at ${locationStr}. 
            
            CRITICAL INSTRUCTIONS:
            1. DISASTER TRIAGE: Identify the disaster and urgency.
            2. PRECISION RESOURCE SEARCH: Use Google Search to find the 3-5 ABSOLUTE CLOSEST hospitals, fire stations, or relief centers to ${locationStr}. 
               - You MUST provide accurate, verified Latitude and Longitude for each.
            3. SURVIVAL CHECKLIST: 4 clear, prioritized, localized steps.
            4. SOS BEACON: A concise message for emergency services including the exact location.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            damageType: { type: Type.STRING },
            urgency: { type: Type.STRING },
            description: { type: Type.STRING },
            explanation: { type: Type.STRING },
            checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            firstActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            sosMessage: { type: Type.STRING },
            authorityGuidance: {
              type: Type.OBJECT,
              properties: {
                dos: { type: Type.ARRAY, items: { type: Type.STRING } },
                donts: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["dos", "donts"]
            },
            nearbyResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Hospital', 'Fire Station', 'Police', 'Shelter', 'Other'] },
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  distance: { type: Type.STRING }
                },
                required: ["name", "type", "lat", "lng", "distance"]
              }
            }
          },
          required: ["damageType", "urgency", "description", "explanation", "checklist", "firstActions", "sosMessage", "authorityGuidance", "nearbyResources"]
        }
      }
    });
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await executeRequest();
      const rawJson = JSON.parse(response.text || '{}');
      const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter(Boolean) || [];

      return {
        id: `REC-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        timestamp: Date.now(),
        ...rawJson,
        location: location ? { lat: location.lat, lng: location.lng } : undefined,
        groundingSources
      };
    } catch (error: any) {
      if ((error?.message?.includes('429') || error?.status === 429) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
};

/**
 * Translates an existing triage result into a new language to ensure UI consistency.
 */
export const translateTriageResult = async (result: TriageResult, targetLanguage: string): Promise<TriageResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Translate the following disaster triage data into ${targetLanguage}. 
    Keep all numeric values (coordinates, distances) as is. 
    Ensure the tone remains professional and urgent.
    
    Data to translate:
    Damage Type: ${result.damageType}
    Urgency: ${result.urgency}
    Description: ${result.description}
    Explanation: ${result.explanation}
    SOS Message: ${result.sosMessage}
    Checklist: ${result.checklist.join(' | ')}
    First Actions: ${result.firstActions.join(' | ')}
    Authority Do's: ${result.authorityGuidance.dos.join(' | ')}
    Authority Don'ts: ${result.authorityGuidance.donts.join(' | ')}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          damageType: { type: Type.STRING },
          urgency: { type: Type.STRING },
          description: { type: Type.STRING },
          explanation: { type: Type.STRING },
          sosMessage: { type: Type.STRING },
          checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          firstActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          dos: { type: Type.ARRAY, items: { type: Type.STRING } },
          donts: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["damageType", "urgency", "description", "explanation", "sosMessage", "checklist", "firstActions", "dos", "donts"]
      }
    }
  });

  const translation = JSON.parse(response.text || '{}');
  
  return {
    ...result,
    damageType: translation.damageType,
    urgency: translation.urgency,
    description: translation.description,
    explanation: translation.explanation,
    sosMessage: translation.sosMessage,
    checklist: translation.checklist,
    firstActions: translation.firstActions,
    authorityGuidance: {
      dos: translation.dos,
      donts: translation.donts
    }
  };
};
