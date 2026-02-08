
import { TriageResult } from "../types";

/**
 * MongoDB Atlas Integration Service
 * Connection String: mongodb+srv://parthu2905_db_user:<db_password>@cluster0.1qtnzcc.mongodb.net/
 * 
 * NOTE: For security, direct MongoDB access is handled via a backend proxy/API.
 * This service simulates the logging of disaster triage records.
 */

export const logTriageToDatabase = async (result: TriageResult): Promise<void> => {
  try {
    // In a production environment, this would be:
    // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(result) });
    console.log(`[DATABASE] Logging disaster record ${result.id} to MongoDB Atlas...`, result);
    
    // Simulating network latency for DB write
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error("[DATABASE] Error logging to MongoDB:", error);
  }
};
