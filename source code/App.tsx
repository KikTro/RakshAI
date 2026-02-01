import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
  ShieldAlert,
  Search,
  Zap,
  RefreshCw,
  ImageIcon,
  Bot,
  Info,
  Newspaper,
  FileCheck,
  TrendingUp,
  X,
  Activity,
  MessageSquare,
  Globe,
  ExternalLink,
  ChevronDown,
  Settings,
  Key,
  Brain,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Configuration Helpers ---
type Provider = 'perplexity' | 'gemini';

const getProvider = (): Provider => {
  return (localStorage.getItem('AI_PROVIDER') as Provider) || 'perplexity';
};

const getApiKey = (provider: Provider) => {
  try {
    const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'PERPLEXITY_API_KEY';

    // 1. Local Storage
    const localKey = localStorage.getItem(keyName);
    if (localKey) return localKey;

    // 2. Vite Env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[`VITE_${keyName}`];
    }
    // 3. Process Env
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[keyName];
    }
  } catch (e) {
    console.warn("Environment variables not accessible");
  }
  return "";
};

// --- Design Tokens ---
const APPLE_EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];
const APPLE_TRANSITION: any = { duration: 0.8, ease: APPLE_EASE };
const MOBILE_TRANSITION: any = { duration: 0.7, ease: [0.32, 0.72, 0, 1] };
const MODAL_TRANSITION = { type: "spring" as const, damping: 25, stiffness: 200 };
const GLASS_STYLE = "blur-glass border border-white/10 rounded-apple shadow-apple-card shadow-apple-inner";

const SIGNAL_MAP = [
  { key: 'Fear', label: 'Fear', color: '#FF3B30' },
  { key: 'Urgency', label: 'Urgency', color: '#FF9500' },
  { key: 'Authority', label: 'Authority', color: '#5856D6' },
  { key: 'Greed', label: 'Greed', color: '#34C759' },
  { key: 'Scarcity', label: 'Scarcity', color: '#AF52DE' },
  { key: 'SocialProof', label: 'Social Proof', color: '#007AFF' }
];

// --- Types ---
type Category = 'rumour' | 'insurance' | 'sms' | 'investment';

interface AnalysisResult {
  score: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  chartData: { name: string; value: number; color: string }[];
  explanation: string;
  specificMetrics: { label: string; value: string | number; status: 'good' | 'warning' | 'bad' }[];
  sources?: { title: string; uri: string }[];
}

// --- Helpers ---
const getScoreColor = (score: number) => {
  if (score < 35) return 'text-[#34C759]';
  if (score < 75) return 'text-[#FF9500]';
  return 'text-[#FF3B30]';
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

// --- Analysis Logic ---
const analyzeContent = async (text: string, category: Category, isDeep: boolean): Promise<AnalysisResult> => {
  const provider = getProvider();
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new Error(`${provider === 'gemini' ? 'Gemini' : 'Perplexity'} API Key missing. Please configure it in Settings.`);
  }

  const jsonStructure = JSON.stringify({
    score: 0,
    riskLevel: "Low|Medium|High|Critical",
    radarValues: { Fear: 0, Urgency: 0, Authority: 0, Greed: 0, Scarcity: 0, SocialProof: 0 },
    explanation: "string",
    metrics: [{ label: "string", value: "string", status: "good|warning|bad" }]
  }, null, 2);

  const systemInstruction = `You are RakshAI, an elite protective intelligence engine. 
  Analyze the user's input for the category: "${category}".
  
  Your goal is to identify fraud, misinformation, psychological manipulation, or risk.
  
  You MUST return ONLY a valid JSON object.
  
  Follow this JSON structure exactly:
  ${jsonStructure}
  
  Definitions:
  - score: 0 to 100 (100 is highest threat/risk).
  - radarValues: 0 to 100 for each psychological trigger.
  - metrics: Extract 3-4 key data points relevant to the category (e.g. for Investment: "Promised ROI", "Regulation Status").
  - explanation: A concise, professional forensic summary of why this score was given.
  `;

  try {
    let json: any = {};
    let sources: { title: string; uri: string }[] = [];

    if (provider === 'gemini') {
      // --- GEMINI IMPLEMENTATION ---
      const ai = new GoogleGenAI({ apiKey });
      const modelName = isDeep ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: text,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          // Deep reasoning/search tools could be added here for 'gemini-3-pro-preview' if desired
          tools: isDeep ? [{ googleSearch: {} }] : undefined
        },
      });

      const responseText = response.text || "{}";
      json = JSON.parse(responseText);

      // Extract Grounding Metadata for Gemini
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        sources = groundingChunks
          .filter((c: any) => c.web?.uri && c.web?.title)
          .map((c: any) => ({
            title: c.web.title,
            uri: c.web.uri
          }));
      }

    } else {
      // --- PERPLEXITY IMPLEMENTATION ---
      const model = isDeep ? 'sonar-pro' : 'sonar';
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: text }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content || "{}";
      content = content.replace(/```json\n?|```/g, '').trim();
      json = JSON.parse(content);

      // Extract Sources for Perplexity
      if (data.citations) {
        sources = data.citations.map((url: string) => ({
          title: new URL(url).hostname.replace('www.', ''),
          uri: url
        }));
      }
    }

    // Map to App Domain
    const chartData = SIGNAL_MAP.map(s => ({
      name: s.label,
      value: (json.radarValues?.[s.key] || 0) as number,
      color: s.color
    }));

    return {
      score: json.score || 0,
      riskLevel: json.riskLevel || "Low",
      chartData,
      explanation: json.explanation || "Analysis complete.",
      specificMetrics: json.metrics || [],
      sources: sources.length > 0 ? sources : undefined
    };

  } catch (e: any) {
    console.error("Analysis Error:", e);
    throw new Error(e.message || "Failed to parse analysis results.");
  }
};

const performOCR = async (file: File): Promise<string> => {
  const provider = getProvider();

  if (provider === 'gemini') {
    try {
      const apiKey = getApiKey('gemini');
      if (!apiKey) throw new Error("Gemini API Key required for Image Analysis.");

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = await fileToBase64(file);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: "Extract all legible text from this image. Return only the raw text, no markdown or comments." }
          ]
        }
      });

      return response.text || "";
    } catch (e: any) {
      console.error("OCR Error:", e);
      throw new Error(`Image analysis failed: ${e.message}`);
    }
  } else {
    // Perplexity stub
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Image analysis requires Gemini provider. Please switch in Settings."));
      }, 500);
    });
  }
};

// --- Components ---

const AppleButton = ({ children, onClick, disabled, primary = true, icon: Icon, className = "", isMobile = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center gap-3 ${isMobile ? 'w-full py-5 text-lg' : 'px-6 py-3'} rounded-pill font-bold tracking-tight transition-all active:scale-[0.96] disabled:opacity-40 shadow-apple-pill whitespace-nowrap shrink-0 ${primary ? 'bg-primary text-white hover:brightness-110' : 'bg-white/10 text-white hover:bg-white/15'
      } ${className}`}
    style={{ minHeight: isMobile ? '60px' : '44px' }}
  >
    {Icon && <Icon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />}
    {children}
  </button>
);

const ImageUploadButton = ({ onUpload, className = "", isMobile = false }: { onUpload: (file: File) => void, className?: string, isMobile?: boolean }) => {
  const provider = getProvider();
  const isDisabled = provider !== 'gemini';

  return (
    <label
      className={`flex items-center justify-center gap-3 ${isMobile ? 'w-full py-5 text-lg' : 'px-6 py-3'} rounded-pill font-bold tracking-tight transition-all active:scale-[0.96] ${isDisabled ? 'bg-white/5 text-white/40 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20 cursor-pointer'} shadow-none whitespace-nowrap shrink-0 ${className}`}
      style={{ minHeight: isMobile ? '60px' : '44px' }}
      title={isDisabled ? "Switch to Gemini for Image Analysis" : "Upload Image"}
    >
      <ImageIcon className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
      <span>Image</span>
      <input
        type="file"
        className="hidden"
        disabled={isDisabled}
        onChange={(e) => {
          if (e.target.files?.[0]) onUpload(e.target.files[0]);
        }}
        accept="image/*"
      />
    </label>
  );
};

const SelectInput = ({ value, onChange, options }: { value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[] }) => (
  <div className="relative w-full group">
    <select
      value={value}
      onChange={onChange}
      className="w-full p-5 pr-12 appearance-none rounded-apple bg-white/5 border border-white/5 font-bold text-white focus:bg-white/10 focus:border-primary/50 outline-none transition-all cursor-pointer hover:bg-white/10"
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-zinc-900 text-white">{opt}</option>
      ))}
    </select>
    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover:text-white/60 transition-colors">
      <ChevronDown className="w-5 h-5" />
    </div>
  </div>
);

const MetricTile = ({ label, value, status, isMobile }: any) => (
  <div className={`${isMobile ? 'p-6' : 'p-[1.5vw]'} ${GLASS_STYLE} flex flex-col gap-2`}>
    <span className="font-black text-white/30 uppercase tracking-widest fluid-text-xs leading-none">{label}</span>
    <span className={`font-bold ${status === 'bad' ? 'text-red-400' : status === 'warning' ? 'text-orange-400' : 'text-emerald-400'
      } fluid-text-lg`}>{value}</span>
  </div>
);

const DualChartCard = ({ data, isMobile }: { data: AnalysisResult['chartData'], isMobile: boolean }) => {
  const [view, setView] = useState<'radar' | 'ring'>('radar');

  return (
    <div
      className={`relative ${GLASS_STYLE} ${isMobile ? 'h-[360px]' : 'h-[25vh]'} min-h-[240px] cursor-pointer group overflow-hidden`}
      onClick={(e) => {
        e.stopPropagation();
        setView(view === 'radar' ? 'ring' : 'radar');
      }}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-1 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${view === 'radar' ? 'bg-primary' : 'bg-white/20'}`} />
        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${view === 'ring' ? 'bg-primary' : 'bg-white/20'}`} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, x: isMobile ? 30 : 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isMobile ? -30 : -60 }}
          transition={isMobile ? MOBILE_TRANSITION : APPLE_TRANSITION}
          className="w-full h-full flex items-center justify-center p-6"
        >
          {view === 'radar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} />
                <Radar name="Risk Signal" dataKey="value" stroke="#007aff" fill="#007aff" fillOpacity={0.5} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" paddingAngle={6} dataKey="value" stroke="none">
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(20px)', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// --- Mobile Components ---

const MobileTabBar = ({ categories, activeCategory, onSelect }: any) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[400px]">
    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-pill p-1.5 shadow-apple-pill backdrop-blur-3xl w-full">
      {categories.map((cat: any) => {
        const Icon = cat.icon;
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`relative flex items-center justify-center flex-1 h-12 rounded-pill transition-all ${isActive ? 'text-white' : 'text-white/40'}`}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-pill-bg"
                className="absolute inset-0 bg-white/10 border border-white/20 rounded-pill shadow-inner"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <Icon className="w-5 h-5" />
              {isActive && <span className="text-[9px] font-bold mt-0.5">{cat.label.split(' ')[0]}</span>}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const LogicToggleMobile = ({ isDeep, onToggle }: { isDeep: boolean, onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`relative px-4 py-2 rounded-full border flex items-center gap-2 transition-all overflow-hidden ${isDeep ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-white/10'}`}
  >
    <div className={`w-2 h-2 rounded-full ${isDeep ? 'bg-primary shadow-[0_0_8px_rgba(0,122,255,0.8)]' : 'bg-white/30'}`} />
    <span className="text-[10px] font-bold uppercase tracking-widest">{isDeep ? 'Deep' : 'Fast'}</span>
  </button>
);

// --- Content Views ---

const AnalysisSidebar = ({ result, isMobile }: { result: AnalysisResult | null, isMobile: boolean }) => (
  <div className={`${isMobile ? 'w-full pb-8' : 'col-span-5 h-full overflow-y-auto pr-2 custom-scroll flex flex-col'} gap-[var(--gap-standard)]`}>
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          initial={{ opacity: 0, y: isMobile ? 50 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={isMobile ? MOBILE_TRANSITION : APPLE_TRANSITION}
          className="space-y-[var(--gap-standard)]"
        >
          <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-2'} gap-[var(--gap-standard)]`}>
            <div className={`${isMobile ? 'p-8' : 'p-[1.5vw]'} ${GLASS_STYLE} flex flex-col justify-center items-center gap-2`}>
              <span className={`font-black tracking-tighter fluid-text-5xl ${getScoreColor(result.score)}`}>{result.score}%</span>
              <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Threat Index</span>
            </div>
            <DualChartCard data={result.chartData} isMobile={isMobile} />
          </div>

          <div className={`${isMobile ? 'p-8' : 'p-[2vw]'} ${GLASS_STYLE} space-y-4`}>
            <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.25em]">Forensic Intelligence</h3>
            <p className="leading-relaxed text-white/90 font-light fluid-text-lg">{result.explanation}</p>
          </div>

          {result.sources && (
            <div className={`${isMobile ? 'p-8' : 'p-[2vw]'} ${GLASS_STYLE} space-y-4`}>
              <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.25em] flex items-center gap-2">
                <Globe className="w-3 h-3" /> Verified Sources
              </h3>
              <div className="flex flex-col gap-3">
                {result.sources.map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 rounded-xl bg-white/5 border border-white/5 group active:bg-white/10 transition-colors">
                    <span className="text-sm font-medium text-white/80 truncate pr-4">{source.title}</span>
                    <ExternalLink className="w-4 h-4 text-white/20" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className={`${isMobile ? 'grid grid-cols-1' : 'grid grid-cols-2'} gap-[var(--gap-standard)]`}>
            {result.specificMetrics.map((m: any, i: number) => <MetricTile key={i} {...m} isMobile={isMobile} />)}
          </div>
        </motion.div>
      ) : (
        <div className={`border-2 border-dashed border-white/5 rounded-apple flex flex-col items-center justify-center text-white/10 ${isMobile ? 'py-24' : 'h-full p-10'}`}>
          <Search className="w-16 h-16 mb-6 opacity-30" />
          <p className="fluid-text-lg font-bold opacity-30 uppercase tracking-widest text-center">Awaiting Analysis Stream</p>
        </div>
      )}
    </AnimatePresence>
  </div>
);

const RumourView = ({ result, isAnalyzing, onAnalyze, onOCR, isMobile }: any) => {
  const [content, setContent] = useState('');
  return (
    <div className={`flex flex-col h-full w-full gap-[var(--gap-standard)] fluid-padding max-w-[1400px] mx-auto`}>
      <div className="flex flex-col items-center text-center">
        <h1 className="fluid-text-5xl font-black tracking-tight mb-2">Verification</h1>
        <p className="text-white/50 font-medium max-w-3xl fluid-text-lg">Verifies rumors and checks the authenticity of reports or articles.</p>
      </div>
      <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-12'} gap-[var(--gap-standard)] flex-1 min-h-0`}>
        <div className={`${isMobile ? '' : 'col-span-7 flex flex-col min-h-0'}`}>
          <div className={`${GLASS_STYLE} relative flex flex-col overflow-hidden`}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste article content here..."
              className={`w-full bg-transparent resize-none focus:outline-none leading-relaxed placeholder-white/5 fluid-padding fluid-text-xl font-light ${isMobile ? 'min-h-[300px]' : 'flex-1'} overflow-y-auto custom-scroll`}
            />
            <div className={`${isMobile ? 'p-6 gap-4' : 'p-[1.5vw]'} border-t border-white/5 bg-black/40 flex ${isMobile ? 'flex-col-reverse' : 'items-center justify-between gap-4'} shrink-0`}>
              <ImageUploadButton onUpload={async (f) => { try { const text = await onOCR(f); setContent(prev => prev + "\n" + text); } catch (e: any) { alert(e.message); } }} isMobile={isMobile} />
              <AppleButton onClick={() => onAnalyze(content)} disabled={!content || isAnalyzing} isMobile={isMobile}>
                {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Run Scan
              </AppleButton>
            </div>
          </div>
        </div>
        <AnalysisSidebar result={result} isMobile={isMobile} />
      </div>
    </div>
  );
};

const InsuranceView = ({ result, isAnalyzing, onAnalyze, onOCR, isMobile }: any) => {
  const [form, setForm] = useState({ type: 'Vehicle', event: 'Accident', desc: '' });
  return (
    <div className={`flex flex-col h-full w-full gap-[var(--gap-standard)] fluid-padding max-w-[1400px] mx-auto`}>
      <div className="flex flex-col items-center text-center">
        <h1 className="fluid-text-5xl font-black tracking-tight mb-2">Claim Guard</h1>
        <p className="text-white/50 font-medium max-w-3xl fluid-text-lg">Identify potential insurance claim scams and inconsistencies.</p>
      </div>
      <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-12'} gap-[var(--gap-standard)] flex-1 min-h-0`}>
        <div className={`${isMobile ? '' : 'col-span-7 flex flex-col min-h-0'}`}>
          <div className={`${GLASS_STYLE} flex flex-col overflow-hidden`}>
            <div className="fluid-padding space-y-8 flex-1 overflow-y-auto custom-scroll">
              <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-2'} gap-6`}>
                <div className="space-y-3">
                  <label className="text-xs font-black text-white/30 uppercase tracking-widest px-1">Policy Domain</label>
                  <SelectInput
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    options={['Vehicle', 'Health', 'Property']}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-white/30 uppercase tracking-widest px-1">Incident Type</label>
                  <SelectInput
                    value={form.event}
                    onChange={e => setForm({ ...form, event: e.target.value })}
                    options={['Accident', 'Theft', 'Damage']}
                  />
                </div>
              </div>
              <textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} className={`w-full p-6 rounded-apple bg-white/5 border-none outline-none resize-none fluid-text-xl font-light ${isMobile ? 'min-h-[250px]' : 'h-64'}`} placeholder="Detailed incident description..." />
            </div>
            <div className={`${isMobile ? 'p-6 gap-4' : 'p-[1.5vw]'} border-t border-white/5 bg-black/40 flex ${isMobile ? 'flex-col-reverse' : 'items-center justify-between gap-4'} shrink-0`}>
              <ImageUploadButton onUpload={async (f) => { try { const text = await onOCR(f); setForm(prev => ({ ...prev, desc: prev.desc + "\n" + text })); } catch (e: any) { alert(e.message); } }} isMobile={isMobile} />
              <AppleButton onClick={() => onAnalyze(JSON.stringify(form))} disabled={!form.desc || isAnalyzing} isMobile={isMobile}>Execute Scan</AppleButton>
            </div>
          </div>
        </div>
        <AnalysisSidebar result={result} isMobile={isMobile} />
      </div>
    </div>
  );
};

const SmsView = ({ result, isAnalyzing, onAnalyze, onOCR, isMobile }: any) => {
  const [msg, setMsg] = useState('');
  return (
    <div className={`flex flex-col h-full w-full gap-[var(--gap-standard)] fluid-padding max-w-[1400px] mx-auto`}>
      <div className="flex flex-col items-center text-center">
        <h1 className="fluid-text-5xl font-black tracking-tight mb-2">Messages</h1>
        <p className="text-white/50 font-medium max-w-3xl fluid-text-lg">Forensic analysis of social engineering streams.</p>
      </div>
      <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-12'} gap-[var(--gap-standard)] flex-1 min-h-0`}>
        <div className={`${isMobile ? '' : 'col-span-7 flex flex-col min-h-0'}`}>
          <div className={`${GLASS_STYLE} flex flex-col overflow-hidden`}>
            <div className={`flex-1 ${isMobile ? 'p-6' : 'fluid-padding'} space-y-6 flex flex-col justify-start overflow-y-auto custom-scroll`}>
              <div className={`bg-white/5 p-6 rounded-apple border border-white/5 shadow-apple-inner w-full flex-1 min-h-[240px]`}>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type or paste message text here..." className={`w-full bg-transparent border-none focus:ring-0 resize-none font-light fluid-text-xl h-full`} />
              </div>
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="self-end bg-primary/10 p-6 rounded-apple rounded-tr-none border border-primary/20 shadow-apple-inner max-w-[90%]">
                    <span className="block text-[9px] font-black uppercase text-primary mb-2 tracking-widest">RakshAI Verdict</span>
                    <p className="font-bold text-white/90 fluid-text-lg">{result.riskLevel} threat identified.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className={`${isMobile ? 'p-6 gap-4' : 'p-[1.5vw]'} border-t border-white/5 bg-black/40 flex ${isMobile ? 'flex-col-reverse' : 'items-center justify-between gap-4'} shrink-0`}>
              <ImageUploadButton onUpload={async (f) => { try { setMsg(await onOCR(f)); } catch (e: any) { alert(e.message); } }} isMobile={isMobile} />
              <AppleButton onClick={() => onAnalyze(msg)} disabled={!msg || isAnalyzing} isMobile={isMobile}>Analyze Stream</AppleButton>
            </div>
          </div>
        </div>
        <AnalysisSidebar result={result} isMobile={isMobile} />
      </div>
    </div>
  );
};

const InvestmentView = ({ result, isAnalyzing, onAnalyze, onOCR, isMobile }: any) => {
  const [opp, setOpp] = useState({ platform: '', roi: 15, period: 'Month', pitch: '' });
  return (
    <div className={`flex flex-col h-full w-full gap-[var(--gap-standard)] fluid-padding max-w-[1400px] mx-auto`}>
      <div className="flex flex-col items-center text-center">
        <h1 className="fluid-text-5xl font-black tracking-tight mb-2">Risk Terminal</h1>
        <p className="text-white/50 font-medium max-w-3xl fluid-text-lg">Predictive quantification of financial risk indices.</p>
      </div>
      <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-12'} gap-[var(--gap-standard)] flex-1 min-h-0`}>
        <div className={`${isMobile ? '' : 'col-span-7 flex flex-col min-h-0'}`}>
          <div className={`${GLASS_STYLE} flex flex-col overflow-hidden`}>
            <div className="fluid-padding space-y-8 flex-1 overflow-y-auto custom-scroll">
              <div className="space-y-3">
                <label className="text-xs font-black text-white/30 uppercase tracking-widest px-1">Entity Name</label>
                <input value={opp.platform} onChange={e => setOpp({ ...opp, platform: e.target.value })} className="w-full p-5 rounded-apple bg-white/5 border-none font-bold" placeholder="e.g. Nexus Capital" />
              </div>
              <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-2'} gap-6`}>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">ROI (%)</label>
                  <input type="number" value={opp.roi} onChange={e => setOpp({ ...opp, roi: Number(e.target.value) })} className="w-full p-5 rounded-apple bg-white/5 border-none font-bold" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Cycle</label>
                  <SelectInput
                    value={opp.period}
                    onChange={e => setOpp({ ...opp, period: e.target.value })}
                    options={['Day', 'Week', 'Month', 'Year']}
                  />
                </div>
              </div>
              <textarea value={opp.pitch} onChange={e => setOpp({ ...opp, pitch: e.target.value })} className={`w-full p-6 rounded-apple bg-white/5 border-none resize-none fluid-text-xl font-light ${isMobile ? 'min-h-[250px]' : 'h-56'}`} placeholder="Marketing pitch details..." />
            </div>
            <div className={`${isMobile ? 'p-6 gap-4' : 'p-[1.5vw]'} border-t border-white/5 bg-black/40 flex ${isMobile ? 'flex-col-reverse' : 'items-center justify-between gap-4'} shrink-0`}>
              <ImageUploadButton onUpload={async (f) => { try { const text = await onOCR(f); setOpp(prev => ({ ...prev, pitch: prev.pitch + "\n" + text })); } catch (e: any) { alert(e.message); } }} isMobile={isMobile} />
              <AppleButton onClick={() => onAnalyze(JSON.stringify(opp))} disabled={!opp.platform || isAnalyzing} isMobile={isMobile}>Simulate Risk</AppleButton>
            </div>
          </div>
        </div>
        <AnalysisSidebar result={result} isMobile={isMobile} />
      </div>
    </div>
  );
};

// --- Settings Modal ---
const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const [provider, setProvider] = useState<Provider>('perplexity');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    setProvider((localStorage.getItem('AI_PROVIDER') as Provider) || 'perplexity');
    setPerplexityKey(localStorage.getItem('PERPLEXITY_API_KEY') || '');
    setGeminiKey(localStorage.getItem('GEMINI_API_KEY') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('AI_PROVIDER', provider);
    localStorage.setItem('PERPLEXITY_API_KEY', perplexityKey);
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={MODAL_TRANSITION} className={`max-w-[500px] w-full p-10 ${GLASS_STYLE} relative`} onClick={e => e.stopPropagation()}>
        <X className="absolute top-6 right-6 w-6 h-6 text-white/40 cursor-pointer active:scale-90" onClick={onClose} />
        <h2 className="fluid-text-2xl font-black mb-6 flex items-center gap-3"><Settings className="w-6 h-6" /> Settings</h2>

        <div className="space-y-8">

          <div className="space-y-4">
            <label className="text-[10px] text-white/50 uppercase font-black tracking-widest">AI Provider</label>

            <div className="flex flex-col gap-3">
              <div className="relative flex w-full bg-white/5 border border-white/10 rounded-pill p-1.5 shadow-inner overflow-hidden">

                <button
                  onClick={() => setProvider('perplexity')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-4 rounded-pill transition-all duration-300 ${provider === 'perplexity' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  <Brain className="w-5 h-5" />
                  <span className="font-bold text-sm tracking-tight">Perplexity</span>
                  {provider === 'perplexity' && (
                    <motion.div
                      layoutId="provider-pill"
                      className="absolute inset-0 bg-primary rounded-pill shadow-lg shadow-primary/30 border border-white/10 z-[-1]"
                      transition={APPLE_TRANSITION}
                    />
                  )}
                </button>

                <button
                  onClick={() => setProvider('gemini')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-4 rounded-pill transition-all duration-300 ${provider === 'gemini' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  <Cpu className="w-5 h-5" />
                  <span className="font-bold text-sm tracking-tight">Gemini</span>
                  {provider === 'gemini' && (
                    <motion.div
                      layoutId="provider-pill"
                      className="absolute inset-0 bg-primary rounded-pill shadow-lg shadow-primary/30 border border-white/10 z-[-1]"
                      transition={APPLE_TRANSITION}
                    />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 px-2">
                <p className="text-[10px] text-emerald-400/80 font-medium text-center leading-tight tracking-wide">
                  way faster, more accurate, more details
                </p>
                <p className="text-[10px] text-orange-400/80 font-medium text-center leading-tight tracking-wide">
                  only use if uploading image
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {provider === 'perplexity' ? (
                <motion.div key="px" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                  <label className="text-[10px] text-white/50 uppercase font-black tracking-widest flex items-center gap-2">
                    <Key className="w-3 h-3" /> Perplexity API Key
                  </label>
                  <input
                    type="password"
                    value={perplexityKey}
                    onChange={(e) => setPerplexityKey(e.target.value)}
                    placeholder="pplx-..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:border-primary focus:bg-white/10 outline-none transition-all"
                  />
                  <p className="text-xs text-white/30 leading-relaxed">Required for web search and deep verification.</p>
                </motion.div>
              ) : (
                <motion.div key="gm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                  <label className="text-[10px] text-white/50 uppercase font-black tracking-widest flex items-center gap-2">
                    <Key className="w-3 h-3" /> Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:border-primary focus:bg-white/10 outline-none transition-all"
                  />
                  <p className="text-xs text-white/30 leading-relaxed">Enables Multimodal (Image) analysis and Google Search grounding.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={handleSave} className="w-full py-4 bg-primary rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg">
            Save Configuration
          </button>
        </div>
      </motion.div>
    </div>
  );
};


// --- Main App ---

const App = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('rumour');
  const [isDeep, setIsDeep] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Immediate check on mount
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await analyzeContent(text, activeCategory, isDeep);
      setResult(res);
    } catch (e: any) {
      console.error(e);
      if (e.message.includes("API Key missing")) {
        setShowSettings(true);
      }
      alert(e.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const categories = useMemo(() => [
    { id: 'rumour', label: 'Verification', icon: Newspaper },
    { id: 'insurance', label: 'Claim Guard', icon: FileCheck },
    { id: 'sms', label: 'Messages', icon: MessageSquare },
    { id: 'investment', label: 'Risk Terminal', icon: TrendingUp },
  ], []);

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col relative">
      <AnimatePresence>
        {showWelcome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`max-w-[420px] w-full p-10 flex flex-col items-center text-center gap-8 ${GLASS_STYLE}`}>
              <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl">
                <ShieldAlert className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tight">RakshAI</h2>
                <p className="text-white/60 fluid-text-lg leading-relaxed font-medium">Predictive layer for identifying misinformation, fraud, and psychological manipulation.</p>
              </div>
              <button onClick={() => setShowWelcome(false)} className="w-full py-5 bg-primary text-white rounded-pill fluid-text-xl font-black active:scale-95 transition-transform shadow-2xl">Get Started</button>
            </motion.div>
          </motion.div>
        )}
        {showInfo && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8" onClick={() => setShowInfo(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={MODAL_TRANSITION} className={`max-w-[500px] w-full p-10 ${GLASS_STYLE} relative`} onClick={e => e.stopPropagation()}>
              <X className="absolute top-6 right-6 w-6 h-6 text-white/40 cursor-pointer active:scale-90" onClick={() => setShowInfo(false)} />
              <h2 className="fluid-text-2xl font-black mb-4">RakshAI</h2>
              <p className="text-white/70 leading-relaxed fluid-text-base mb-8">AI-powered system to verify information, prevent insurance fraud, intercept phishing messages, and simulate investment risk.</p>
              <div className="border-t border-white/10 pt-6 grid grid-cols-2 gap-4">
                <div><p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Author</p><p className="font-bold">Krishnendu Halder</p></div>
                <div><p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Core</p><p className="font-bold">Protective Intel</p></div>
              </div>
            </motion.div>
          </div>
        )}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      <motion.div animate={{ backgroundImage: `linear-gradient(to bottom, ${activeCategory === 'rumour' ? '#0A1E3F' : activeCategory === 'insurance' ? '#2B124C' : activeCategory === 'sms' ? '#3A0D0D' : '#0F2A1D'}, #000000)` }} transition={{ duration: 1.5 }} className="absolute inset-0 z-0" />

      <header className={`h-24 flex items-center justify-between px-[5vw] z-[500] ${isMobile ? 'sticky top-0 header-glass' : 'relative'}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"><ShieldAlert className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-black tracking-tighter">RakshAI</span>
        </div>

        {!isMobile && (
          <div className="flex bg-black/40 border border-white/10 rounded-pill p-1 shadow-apple-pill backdrop-blur-3xl">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.id as Category); setResult(null); }} className={`relative px-8 py-3 rounded-pill text-sm font-black transition-all ${activeCategory === cat.id ? 'text-white' : 'text-white/40'}`}>
                {activeCategory === cat.id && <motion.div layoutId="desktop-pill" className="absolute inset-0 bg-white/10 border border-white/20 rounded-pill" transition={APPLE_TRANSITION} />}
                <span className="relative z-10">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {isMobile && <LogicToggleMobile isDeep={isDeep} onToggle={() => setIsDeep(!isDeep)} />}
          <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:bg-white/10 transition-colors"><Settings className="w-6 h-6 text-white/50" /></button>
          <button onClick={() => setShowInfo(true)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:bg-white/10 transition-colors"><Info className="w-6 h-6 text-white/50" /></button>
        </div>
      </header>

      <main className={`flex-1 relative z-[400] ${isMobile ? 'mobile-scroll-container' : 'overflow-hidden'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, x: isMobile ? 20 : 0, y: isMobile ? 0 : 30 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMobile ? -20 : 0, y: isMobile ? 0 : -30 }}
            transition={isMobile ? MOBILE_TRANSITION : APPLE_TRANSITION}
            className="h-full w-full"
          >
            {activeCategory === 'rumour' && <RumourView result={result} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} onOCR={performOCR} isMobile={isMobile} />}
            {activeCategory === 'insurance' && <InsuranceView result={result} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} onOCR={performOCR} isMobile={isMobile} />}
            {activeCategory === 'sms' && <SmsView result={result} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} onOCR={performOCR} isMobile={isMobile} />}
            {activeCategory === 'investment' && <InvestmentView result={result} isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} onOCR={performOCR} isMobile={isMobile} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isMobile && (
        <div className="fixed bottom-12 right-12 z-[600]">
          <div className={`p-4 ${GLASS_STYLE} bg-black/60 shadow-apple-pill flex items-center gap-6`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shadow-inner"><Bot className="w-5 h-5 text-primary" /></div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase opacity-30 tracking-widest leading-none mb-1">Logic Tier</span>
                <span className="font-bold text-white/80 uppercase text-xs">{isDeep ? (getProvider() === 'gemini' ? 'Gemini Pro 1.5' : 'Sonar Pro') : (getProvider() === 'gemini' ? 'Gemini Flash' : 'Sonar')}</span>
              </div>
            </div>
            <button onClick={() => setIsDeep(!isDeep)} className="w-14 h-8 rounded-pill bg-white/10 relative transition-all active:scale-90 border border-white/5">
              <motion.div animate={{ x: isDeep ? 28 : 4 }} transition={APPLE_TRANSITION} className={`absolute top-1 w-6 h-6 rounded-full shadow-md ${isDeep ? 'bg-primary shadow-primary/30' : 'bg-white/30'}`} />
            </button>
          </div>
        </div>
      )}

      {isMobile && <MobileTabBar categories={categories} activeCategory={activeCategory} onSelect={(id: Category) => { setActiveCategory(id); setResult(null); }} />}
    </div>
  );
};

export default App;