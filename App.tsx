
import React, { useState, useRef, useEffect } from 'react';
import * as L from 'leaflet';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Camera, 
  Copy, 
  ShieldCheck, 
  Zap, 
  Languages, 
  Map as MapIcon, 
  Activity,
  Heart,
  PhoneCall,
  LifeBuoy,
  Send,
  History,
  ChevronDown,
  MapPin,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { analyzeDisasterSite, translateTriageResult } from './services/geminiService';
import { logTriageToDatabase } from './services/dbService';
import { TriageResult, NearbyResource } from './types';

const LANGUAGES = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Bengali', label: 'Bengali', native: 'বাংলা' },
  { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { code: 'Marathi', label: 'Marathi', native: 'मराठी' },
  { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'Urdu', label: 'Urdu', native: 'اردو' },
  { code: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'Odia', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
];

const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    protocol: 'CrisisSight survivor mode',
    scanGps: 'SCANNING GPS...',
    recent: 'Recent Signals',
    emergencySignal: 'Emergency Signal',
    scanPrompt: 'Point your camera at the danger. I will analyze the scene and find help.',
    tapScan: 'Tap to Scan Scene',
    callEmergency: 'Call Emergency',
    survivalGuide: 'Survival Guide (NDMA PDF)',
    analyzing: 'Analyzing Surroundings...',
    translating: 'Updating Language...',
    reliefMap: 'Tactical Radar',
    broadcast: 'Broadcast SOS',
    callDispatch: 'Call Dispatcher (112)',
    reset: 'New Scan',
    footer: 'CrisisSight Terminal • Emergency Support',
    copied: 'Copied',
    noLogs: 'No Logs Found',
    verifyMaps: 'Search Live on Google Maps',
    quotaError: 'Emergency Capacity Reached',
    quotaDesc: 'Service limits exceeded. Please wait a moment and try again.',
    tryAgain: 'Try Again',
    immediateActions: 'Immediate Survival Checklist',
    hospital: 'Hospitals',
    fireStation: 'Fire Stations',
    shelter: 'Shelters',
    navigate: 'NAVIGATE',
    distanceLabel: 'Distance:',
    helpNeeded: 'Immediate help needed here.',
    incidentLocation: 'INCIDENT LOCATION',
    emergencyProtocols: 'Emergency Protocols',
    protocolsDesc: 'Signal detection active in this quadrant. Local authorities will be notified on SOS broadcast.',
    threatDetected: 'Threat Detected'
  },
  Hindi: {
    protocol: 'क्राइसिस-साइट सर्वाइवर मोड',
    scanGps: 'जीपीएस स्कैनिंग...',
    recent: 'हाल के संकेत',
    emergencySignal: 'आपातकालीन संकेत',
    scanPrompt: 'खतरे की ओर कैमरा घुमाएँ। मैं दृश्य का विश्लेषण करूँगा और मदद ढूँढूँगा।',
    tapScan: 'स्कैन करने के लिए टैप करें',
    callEmergency: 'आपातकालीन कॉल',
    survivalGuide: 'सर्वाइवल गाइड (NDMA PDF)',
    analyzing: 'परिवेश का विश्लेषण...',
    translating: 'भाषा अपडेट हो रही है...',
    reliefMap: 'सामरिक रडार',
    broadcast: 'SOS प्रसारित करें',
    callDispatch: 'डिस्पैचर को कॉल करें (112)',
    reset: 'नया स्कैन',
    footer: 'क्राइसिस-साइट टर्मिनल • आपातकालीन सहायता',
    copied: 'कॉपी हो गया',
    noLogs: 'कोई लॉग नहीं मिला',
    verifyMaps: 'Google मैप्स पर लाइव खोजें',
    quotaError: 'आपातकालीन क्षमता समाप्त',
    quotaDesc: 'सेवा सीमा पार हो गई। कृपया कुछ देर प्रतीक्षा करें।',
    tryAgain: 'पुनः प्रयास करें',
    immediateActions: 'तत्काल उत्तरजीविता चेकलिस्ट',
    hospital: 'अस्पताल',
    fireStation: 'दमकल केंद्र',
    shelter: 'आश्रय स्थल',
    navigate: 'नेविगेट करें',
    distanceLabel: 'दूरी:',
    helpNeeded: 'यहाँ तुरंत मदद की ज़रूरत है।',
    incidentLocation: 'घटना स्थल',
    emergencyProtocols: 'आपातकालीन प्रोटोकॉल',
    protocolsDesc: 'इस चतुर्थांश में सिग्नल का पता लगा है। स्थानीय अधिकारियों को सूचित किया जाएगा।',
    threatDetected: 'खतरे का पता चला'
  },
  Bengali: {
    protocol: 'CrisisSight সারভাইভার মোড',
    scanGps: 'GPS স্ক্যান করা হচ্ছে...',
    recent: 'সাম্প্রতিক সংকেত',
    emergencySignal: 'জরুরি সংকেত',
    scanPrompt: 'বিপদের দিকে আপনার ক্যামেরা ধরুন। আমি দৃশ্যটি বিশ্লেষণ করব এবং সাহায্য খুঁজব।',
    tapScan: 'স্ক্যান করতে ট্যাপ করুন',
    callEmergency: 'জরুরি কল করুন',
    survivalGuide: 'সারভাইভাল গাইড (NDMA PDF)',
    analyzing: 'পরিবেশ বিশ্লেষণ করা হচ্ছে...',
    translating: 'ভাষা আপডেট করা হচ্ছে...',
    reliefMap: 'কৌশলগত রাডার',
    broadcast: 'SOS ব্রডকাস্ট করুন',
    callDispatch: 'ডিসপ্যাচারকে কল করুন (১১২)',
    reset: 'নতুন স্ক্যান',
    footer: 'CrisisSight টার্মিনাল • জরুরি সহায়তা',
    copied: 'কপি করা হয়েছে',
    noLogs: 'কোনো লগ পাওয়া যায়নি',
    verifyMaps: 'Google Maps-এ সরাসরি খুঁজুন',
    quotaError: 'জরুরি ক্ষমতা শেষ',
    quotaDesc: 'পরিষেবা সীমা অতিক্রম করেছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।',
    tryAgain: 'আবার চেষ্টা করুন',
    immediateActions: 'তাত্ক্ষণিক জীবনরক্ষার চেকলিস্ট',
    hospital: 'হাসপাতাল',
    fireStation: 'ফায়ার স্টেশন',
    shelter: 'আশ্রয় কেন্দ্র',
    navigate: 'নেভিগেট',
    distanceLabel: 'দূরত্ব:',
    helpNeeded: 'এখানে অবিলম্বে সাহায্যের প্রয়োজন।',
    incidentLocation: 'ঘটনার স্থান',
    emergencyProtocols: 'জরুরি প্রোটোকল',
    protocolsDesc: 'এই অঞ্চলে সংকেত সনাক্তকরণ সক্রিয়। স্থানীয় কর্তৃপক্ষকে জানানো হবে।',
    threatDetected: 'হুমকি শনাক্ত করা হয়েছে'
  }
  // ... Other languages can be added here following the same structure
};

const createAdvancedMarker = (color: string, iconHtml: string) => {
  return L.divIcon({
    html: `
      <div class="marker-pin-wrapper">
        <div class="marker-pin-pulse ${color}"></div>
        <div class="marker-pin-body ${color}">
          ${iconHtml}
        </div>
      </div>
    `,
    className: 'custom-advanced-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const InteractiveMap: React.FC<{ 
  incidentLocation: { lat: number; lng: number } | undefined;
  resources: NearbyResource[];
  onSearchFallback: () => void;
  lang: string;
}> = ({ incidentLocation, resources, onSearchFallback, lang }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const getT = (key: string) => UI_TRANSLATIONS[lang]?.[key] || UI_TRANSLATIONS['English'][key];

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([0, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstanceRef.current);
      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (markersLayer) markersLayer.clearLayers();

    if (incidentLocation && markersLayer) {
      const center: L.LatLngExpression = [incidentLocation.lat, incidentLocation.lng];
      const victimIcon = createAdvancedMarker('bg-red-600', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>');
      L.marker(center, { icon: victimIcon, zIndexOffset: 1000 }).addTo(markersLayer).bindPopup(`
        <div class="custom-infowindow">
          <div class="header-red">${getT('incidentLocation')}</div>
          <div class="body">${getT('helpNeeded')}</div>
        </div>
      `);

      const uniqueResources = resources.slice(0, 5);
      uniqueResources.forEach(res => {
        let colorClass = 'bg-blue-600';
        let iconSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M12 3v18"/></svg>';
        const localizedType = res.type === 'Hospital' ? getT('hospital') : 
                            res.type === 'Fire Station' ? getT('fireStation') : 
                            res.type === 'Shelter' ? getT('shelter') : res.type;

        if (res.type === 'Hospital') colorClass = 'bg-rose-500';
        else if (res.type === 'Fire Station') colorClass = 'bg-amber-500';
        else if (res.type === 'Shelter') colorClass = 'bg-indigo-500';

        const resIcon = createAdvancedMarker(colorClass, iconSvg);
        L.marker([res.lat, res.lng], { icon: resIcon }).addTo(markersLayer).bindPopup(`
          <div class="custom-infowindow">
            <div class="header-blue">${res.name}</div>
            <div class="body">
              <span class="type-tag ${colorClass}">${localizedType}</span>
              <p><b>${getT('distanceLabel')}</b> ${res.distance || 'N/A'}</p>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${res.lat},${res.lng}" target="_blank" class="nav-link">${getT('navigate')}</a>
            </div>
          </div>
        `);
      });

      if (uniqueResources.length > 0) {
        const bounds = L.latLngBounds([center, ...uniqueResources.map(r => [r.lat, r.lng] as L.LatLngExpression)]);
        map.fitBounds(bounds.pad(0.3));
      } else {
        map.setView(center, 15);
      }
    }
  }, [incidentLocation, resources, lang]);

  return (
    <div className="relative w-full h-full rounded-[3.5rem] overflow-hidden group bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full border-2 border-slate-800" />
      <div className="absolute bottom-6 left-6 z-[1000] max-w-[calc(100%-3rem)] pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl pointer-events-auto flex flex-col gap-5 border-l-4 border-l-blue-600">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-3">
            <MapIcon className="w-4 h-4" /> {getT('reliefMap')}
          </h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"></div>
              <span>{getT('hospital')}</span>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"></div>
              <span>{getT('fireStation')}</span>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"></div>
              <span>{getT('shelter')}</span>
            </div>
          </div>
          <button 
            onClick={onSearchFallback}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-[8px] font-black uppercase text-white tracking-widest leading-none">
              {getT('verifyMaps')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [history, setHistory] = useState<TriageResult[]>([]);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lang, setLang] = useState<string>('English');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.error("Location access denied", err),
        { enableHighAccuracy: true }
      );
    }
    const saved = localStorage.getItem('victim_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const triggerTranslation = async () => {
      if (result && !isAnalyzing && !isTranslating) {
        setIsTranslating(true);
        try {
          const translated = await translateTriageResult(result, lang);
          setResult(translated);
        } catch (e) {
          console.error("Translation failed", e);
        } finally {
          setIsTranslating(false);
        }
      }
    };
    triggerTranslation();
  }, [lang]);

  const runAnalysis = async (base64: string, type: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await analyzeDisasterSite(base64, type, lang, location || undefined);
      setResult(res);
      await logTriageToDatabase(res);
      const newHistory = [res, ...history];
      setHistory(newHistory);
      localStorage.setItem('victim_history', JSON.stringify(newHistory));
    } catch (err: any) {
      if (err?.message?.includes('429')) setAnalysisError('QUOTA_EXCEEDED');
      else setAnalysisError('GENERIC_ERROR');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const base64Promise = new Promise<string>(resolve => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    const cleanBase64 = await base64Promise;
    await runAnalysis(cleanBase64, file.type);
  };

  const getT = (key: string) => UI_TRANSLATIONS[lang]?.[key] || UI_TRANSLATIONS['English'][key];

  useEffect(() => {
    document.dir = (lang === 'Urdu') ? 'rtl' : 'ltr';
  }, [lang]);

  return (
    <div className={`min-h-screen flex flex-col bg-[#0F1115] text-slate-100 font-sans selection:bg-red-900/50 ${lang === 'Urdu' ? 'font-urdu' : ''}`}>
      {/* HEADER */}
      <div className="bg-red-600/10 border-b border-red-500/20 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-[1000] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-600 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">CrisisSight</h1>
            <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-[0.2em]">{getT('protocol')}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative group">
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)}
                className="appearance-none bg-slate-800/80 backdrop-blur-md text-[11px] font-black px-10 py-3 rounded-full border border-slate-700 hover:bg-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-xl"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native} ({l.label})</option>)}
              </select>
              <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 pointer-events-none" />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
           </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-[2560px] mx-auto p-4 md:p-8 xl:p-12">
        {result ? (
          /* RESULT VIEW - FULL WIDTH */
          <div className="w-full max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-16 duration-700">
             <div className="bg-white rounded-[4rem] p-8 md:p-12 text-slate-900 flex flex-col gap-8 shadow-3xl border-4 border-red-600/30">
                <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 rounded-2xl">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-[0.2em] text-red-600">{getT('broadcast')}</h4>
                  </div>
                  <button onClick={() => {navigator.clipboard.writeText(result.sosMessage); alert(getT('copied'));}} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><Copy className="w-6 h-6 text-slate-300 hover:text-red-600" /></button>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] font-mono text-base leading-relaxed border border-slate-200 italic text-slate-800">
                  {result.sosMessage}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => window.location.href=`sms:112?body=${encodeURIComponent(result.sosMessage)}`} className="py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-red-600 hover:bg-red-700 text-white shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95">
                    <ShieldAlert className="w-7 h-7" /> {getT('broadcast')}
                  </button>
                  <button onClick={() => window.location.href='tel:112'} className="py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-slate-900 text-white flex items-center justify-center gap-4 transition-all hover:bg-black active:scale-95">
                    <PhoneCall className="w-7 h-7 text-red-500" /> {getT('callDispatch')}
                  </button>
                </div>
              </div>

              <div className="bg-red-600 rounded-[4rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10 flex flex-col gap-10">
                    <div className="flex items-center gap-6">
                       <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/20">
                          <CheckCircle2 className="w-10 h-10 text-white" />
                       </div>
                       <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none text-white">{getT('immediateActions')}</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {result.checklist.map((step, i) => (
                        <div key={i} className="flex gap-6 bg-black/20 p-8 rounded-[2.5rem] border border-white/10 text-white font-black text-base shadow-lg">
                          <span className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center text-sm font-black flex-shrink-0">{i+1}</span>
                          <span className="leading-snug">{step}</span>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900 rounded-[5rem] p-4 border-2 border-slate-800 h-[600px] relative shadow-3xl overflow-hidden">
                 <InteractiveMap incidentLocation={result.location} resources={result.nearbyResources} onSearchFallback={() => window.open(`https://www.google.com/maps/search/emergency+hospitals/@${result.location?.lat},${result.location?.lng},14z`)} lang={lang} />
              </div>

              <div className="flex justify-center pt-8">
                <button onClick={() => setResult(null)} className="px-12 py-5 text-[11px] font-black text-slate-500 hover:text-white uppercase tracking-[0.4em] transition-all hover:bg-white/5 rounded-full border border-slate-800/50">
                  {getT('reset')}
                </button>
              </div>
          </div>
        ) : (
          /* HOME VIEW - 3 COLUMN GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: RECENT SIGNALS */}
            <aside className="lg:col-span-3 lg:order-1 h-fit lg:sticky lg:top-32 order-2">
              <div className="bg-slate-900/40 rounded-[3rem] p-8 border border-slate-800 backdrop-blur-xl shadow-2xl">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center justify-between">
                   <span className="flex items-center gap-3"><History className="w-4 h-4" /> {getT('recent')}</span>
                   <span className="bg-slate-800 px-2 py-1 rounded text-[9px]">{history.length}</span>
                 </h3>
                 <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {history.length > 0 ? history.map((item, idx) => (
                      <button 
                        key={idx} onClick={() => setResult(item)}
                        className="w-full text-left p-6 rounded-[2rem] border transition-all bg-slate-800/30 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50"
                      >
                        <p className="text-sm font-black truncate mb-2">{item.damageType}</p>
                        <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${item.urgency.toLowerCase().includes('crit') ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.urgency}</span>
                        </div>
                      </button>
                    )) : <div className="text-center py-16 opacity-30 italic"><span className="text-[11px] font-black uppercase tracking-[0.2em]">{getT('noLogs')}</span></div>}
                 </div>
              </div>
            </aside>

            {/* MIDDLE: MAIN SCAN INTERFACE */}
            <section className="lg:col-span-6 lg:order-2 space-y-10 order-1">
              {isAnalyzing || isTranslating ? (
                <div className="bg-slate-900/30 rounded-[5rem] p-24 text-center border-2 border-slate-800 flex flex-col items-center justify-center gap-12 shadow-2xl min-h-[500px]">
                  <div className="relative">
                    <Loader2 className="w-32 h-32 text-red-600 animate-spin" strokeWidth={1.5} />
                    <Zap className="absolute inset-0 m-auto w-12 h-12 text-red-600 animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase">{isTranslating ? getT('translating') : getT('analyzing')}</h3>
                </div>
              ) : analysisError ? (
                <div className="bg-slate-900/30 rounded-[5rem] p-16 text-center border-2 border-red-900/50 flex flex-col items-center justify-center gap-8 shadow-2xl animate-in zoom-in">
                  <AlertTriangle className="w-20 h-20 text-red-500" />
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black tracking-tighter text-red-500 uppercase">{getT('quotaError')}</h3>
                    <p className="text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">{getT('quotaDesc')}</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="px-12 py-5 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-4">
                    <RefreshCw className="w-5 h-5" /> {getT('tryAgain')}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900/20 rounded-[5rem] p-12 md:p-20 text-center border-4 border-dashed border-slate-800 flex flex-col items-center justify-center gap-12 shadow-inner min-h-[600px]">
                   <button onClick={() => fileInputRef.current?.click()} className="relative w-56 h-56 md:w-72 md:h-72 bg-red-600 hover:bg-red-500 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 border-8 border-red-400/10">
                      <Camera className="w-20 h-20 md:w-24 md:h-24 mb-4 text-white" />
                      <span className="font-black text-xs md:text-sm uppercase tracking-[0.3em] text-white/90">{getT('tapScan')}</span>
                   </button>
                   <div className="max-w-xl space-y-4">
                     <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight uppercase">{getT('emergencySignal')}</h2>
                     <p className="text-slate-500 text-lg font-medium leading-relaxed">{getT('scanPrompt')}</p>
                   </div>
                </div>
              )}
            </section>

            {/* RIGHT: EMERGENCY PROTOCOLS */}
            <aside className="lg:col-span-3 lg:order-3 space-y-8 h-fit lg:sticky lg:top-32 order-3">
               <div className="bg-gradient-to-br from-indigo-700 to-blue-900 rounded-[4rem] p-10 text-white shadow-3xl relative overflow-hidden group">
                 <Heart className="absolute -bottom-12 -right-12 opacity-10 w-48 h-48 fill-white transition-transform group-hover:scale-110" />
                 <div className="relative z-10 space-y-4">
                    <ShieldCheck className="w-8 h-8 opacity-70" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-70">{getT('emergencyProtocols')}</h4>
                    <p className="text-xs font-black leading-relaxed text-white/90">{getT('protocolsDesc')}</p>
                 </div>
               </div>
               <button onClick={() => window.open('https://ndma.gov.in/sites/default/files/PDF/pocketbook-do-dont.pdf')} className="w-full bg-slate-800/40 hover:bg-slate-800/60 p-8 rounded-[3rem] border border-slate-700 flex flex-col items-center gap-4 text-slate-300 font-black uppercase text-[10px] tracking-widest transition-all">
                  <LifeBuoy className="w-8 h-8 text-blue-500" /> {getT('survivalGuide')}
               </button>
               <div className="bg-red-600/10 hover:bg-red-600/20 p-8 rounded-[3rem] border border-red-500/20 flex flex-col items-center gap-4 text-red-500 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer" onClick={() => window.location.href='tel:112'}>
                  <PhoneCall className="w-8 h-8" /> {getT('callEmergency')}
               </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="p-12 text-center border-t border-slate-900/50 bg-slate-950/50">
        <p className="text-[9px] font-black uppercase tracking-[0.8em] text-slate-700">{getT('footer')}</p>
      </footer>
      <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={handleFileUpload} />
    </div>
  );
};

export default App;
