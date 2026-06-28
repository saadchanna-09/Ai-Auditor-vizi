// ✅ UPGRADED: Frontend/src/App.tsx
// Fixed: URL endpoint typo (audit" → /api/audit correctly)  
// Fixed: Backend URL updated to match your actual deployment
// Added: "Code Paste" tab alongside URL tab (connects to /api/audit with codeStream)
// Added: Scrape stats banner when URL mode used
// Kept: Your exact Bento Grid design, all animations, all Framer Motion variants

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, Monitor, Tablet, Smartphone, CheckCircle, AlertTriangle, RefreshCw, Cpu, Layers, Layout, Flame, ExternalLink, Code2, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ← Update this to your actual deployed backend URL
const BACKEND_URL = 'https://ai-auditor-vizi.vercel.app';

interface AuditIssue {
  type: string;
  element: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fixSuggestion: string;
  oldCode: string;
  fixedCode: string;
}

interface AuditData {
  issues: AuditIssue[];
  scrapeStats?: {
    originalSize: number;
    cleanSize: number;
    reduction: string;
  };
  url?: string;
}

type InputMode = 'url' | 'code';

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);

    try {
      let response: Response;

      if (inputMode === 'url') {
        // URL mode → /api/audit-url
        response = await fetch(`${BACKEND_URL}/api/audit-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
      } else {
        // Code paste mode → /api/audit (your existing extension endpoint)
        response = await fetch(`${BACKEND_URL}/api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeStream: codeInput }),
        });
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Something went wrong');

      // Normalize: both endpoints return { issues: [...] }
      const normalizedData: AuditData = {
        issues: result.issues || [],
        scrapeStats: result.scrapeStats,
        url: result.url || url,
      };

      setTimeout(() => {
        setData(normalizedData);
        setLoading(false);
      }, 800);

    } catch (err: any) {
      setError(err.message || 'Failed to connect to the AI server.');
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!data) return [];
    const issues = data.issues;
    return [
      { name: 'UI / UX Layout', count: issues.filter(i => i.type?.includes('Layout') || i.type?.includes('UI')).length },
      { name: 'Accessibility', count: issues.filter(i => i.type?.includes('Access') || i.type?.includes('ARIA')).length },
      { name: 'Tailwind / CSS', count: issues.filter(i => i.type?.includes('Tailwind') || i.type?.includes('CSS')).length },
      { name: 'React / JS', count: issues.filter(i => i.type?.includes('React') || i.type?.includes('JS') || i.type?.includes('Logic')).length },
    ];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 10 },
    },
  } as const;

  return (
    <div className="min-h-screen bg-[#060913] text-gray-100 p-4 md:p-8 font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden">

      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-7xl mx-auto mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-800/60 pb-6 relative z-10"
      >
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-500/20 relative group overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            />
            <Terminal size={26} className="relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">ViziAudit AI Engine</h1>
              <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold">Live Core</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono"><Cpu size={12} className="text-slate-500" /> Gemini 2.5 Flash · Neural Audit Suite v2.0</p>
          </div>
        </div>

        {/* Input Mode Toggle + Form */}
        <div className="w-full lg:w-auto flex-1 max-w-2xl">
          {/* Mode Tabs */}
          <div className="flex bg-[#0c1325] border border-slate-800 rounded-xl p-1 mb-3 w-fit">
            <button
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${inputMode === 'url' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Globe size={13} /> Live URL
            </button>
            <button
              onClick={() => setInputMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${inputMode === 'code' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Code2 size={13} /> Paste Code
            </button>
          </div>

          <form onSubmit={handleAudit} className="flex flex-col gap-3">
            <AnimatePresence mode="wait">
              {inputMode === 'url' ? (
                <motion.div key="url" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  <input
                    type="url"
                    placeholder="Enter URL to audit (e.g. https://example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-[#0c1325]/80 border border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none px-4 py-3 rounded-2xl w-full text-sm text-slate-100 placeholder-slate-500 transition-all duration-300 backdrop-blur-md"
                  />
                </motion.div>
              ) : (
                <motion.div key="code" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  <textarea
                    placeholder="Paste your HTML, React JSX, Tailwind, or JavaScript code here..."
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    disabled={loading}
                    required
                    rows={4}
                    className="bg-[#0c1325]/80 border border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none px-4 py-3 rounded-2xl w-full text-sm text-slate-100 placeholder-slate-500 transition-all duration-300 backdrop-blur-md resize-none font-mono"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || (inputMode === 'url' ? !url : !codeInput.trim())}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-800 disabled:to-slate-900 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer border border-blue-400/20"
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : `Execute ${inputMode === 'url' ? 'URL' : 'Code'} Audit`}
            </button>
          </form>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto relative z-10">

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-red-950/20 border border-red-500/30 text-red-300 p-4 rounded-2xl flex items-start gap-3 mb-8 text-sm backdrop-blur-md"
            >
              <ShieldAlert className="shrink-0 mt-0.5 text-red-500" size={18} />
              <div><span className="font-bold uppercase tracking-wider text-xs block text-red-400 mb-0.5">Connection Error</span> {error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="border border-slate-800/80 rounded-3xl p-16 text-center max-w-2xl mx-auto mt-16 bg-gradient-to-b from-[#0e162b]/40 to-transparent backdrop-blur-md relative overflow-hidden group shadow-2xl"
          >
            <div className="bg-[#131d37] border border-slate-700/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg text-slate-400 group-hover:text-blue-400 transition-colors">
              <Layout size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-200">System Awaiting Input</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Enter a live URL or paste code above. ViziAudit will detect your framework automatically and run a full AI audit.
            </p>
          </motion.div>
        )}

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-28 bg-[#0c1325]/20 border border-slate-800/60 rounded-3xl backdrop-blur-xl max-w-3xl mx-auto shadow-2xl"
            >
              <div className="relative mb-6">
                <motion.div
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-blue-500 border-t-transparent"
                />
                <Cpu className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={22} />
              </div>
              <h4 className="text-base font-bold text-slate-200 tracking-wide font-mono">
                {inputMode === 'url' ? 'SCRAPING DOM + RUNNING AI AUDIT...' : 'ANALYZING CODE WITH AI ENGINE...'}
              </h4>
              <p className="text-xs text-slate-400 mt-2 text-center max-w-md px-6 leading-relaxed font-mono">
                {inputMode === 'url' ? '[Cheerio Scraper] Cleaning DOM tree...' : '[Token Stream] Parsing framework tokens...'}<br />
                <span className="text-blue-400">[Gemini 2.5 Flash]</span> Running deep audit analysis...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard */}
        {data && !loading && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Scrape stats (URL mode only) */}
            {data.scrapeStats && (
              <motion.div variants={itemVariants} className="lg:col-span-12 bg-[#071220]/70 border border-blue-900/30 rounded-2xl px-6 py-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                <span className="text-blue-400 font-bold">🌐 URL Scraped</span>
                <span className="truncate max-w-xs text-slate-300">{data.url}</span>
                <span>Original: <span className="text-slate-200">{Math.round(data.scrapeStats.originalSize / 1024)}KB</span></span>
                <span>Clean DOM: <span className="text-emerald-400">{Math.round(data.scrapeStats.cleanSize / 1024)}KB</span></span>
                <span>Reduction: <span className="text-emerald-400 font-bold">{data.scrapeStats.reduction}</span></span>
              </motion.div>
            )}

            {/* Metrics Card */}
            <motion.div variants={itemVariants} className="lg:col-span-4 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent pointer-events-none" />
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <Layers size={14} className="text-blue-500" /><span>Audit Metrics</span>
                </div>
                <div className="mt-6 flex items-baseline gap-2.5">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tighter">{data.issues.length}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pb-2">Total Issues</span>
                </div>
              </div>
              <div className="mt-8 space-y-2.5 border-t border-slate-800/80 pt-5">
                <div className="flex justify-between items-center bg-[#101931]/40 border border-slate-800/40 px-3 py-2.5 rounded-xl hover:bg-[#101931]/70 transition-colors">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><Flame size={14} className="text-red-500 animate-pulse" /> Critical / High</span>
                  <span className="font-mono text-xs font-bold text-red-400 px-2 py-0.5 rounded bg-red-950/30 border border-red-500/20">
                    {data.issues.filter(i => ['high', 'critical'].includes(String(i.severity).toLowerCase())).length}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#101931]/40 border border-slate-800/40 px-3 py-2.5 rounded-xl hover:bg-[#101931]/70 transition-colors">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><AlertTriangle size={14} className="text-yellow-500" /> Medium Warning</span>
                  <span className="font-mono text-xs font-bold text-yellow-400 px-2 py-0.5 rounded bg-yellow-950/30 border border-yellow-500/20">
                    {data.issues.filter(i => ['medium', 'warning'].includes(String(i.severity).toLowerCase())).length}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#101931]/40 border border-slate-800/40 px-3 py-2.5 rounded-xl hover:bg-[#101931]/70 transition-colors">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Low / Suggestions</span>
                  <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/20">
                    {data.issues.filter(i => ['low', 'info'].includes(String(i.severity).toLowerCase())).length}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-8 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors relative overflow-hidden">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Fault Density Vectors
              </h2>
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', fontSize: '11px', color: '#f1f5f9' }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#chartGlow)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Issues Feed - full width */}
            <motion.div variants={itemVariants} className="lg:col-span-12 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 flex flex-col backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Cpu size={14} className="text-purple-400" /> AI Engineering Remediations ({data.issues.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {data.issues.length > 0 ? data.issues.map((issue, index) => {
                  const sev = String(issue.severity || '').toLowerCase();
                  const severityColor =
                    ['high', 'critical'].includes(sev) ? 'border-red-500/40 bg-red-950/10' :
                    ['medium', 'warning'].includes(sev) ? 'border-yellow-500/40 bg-yellow-950/10' :
                    'border-blue-900/40 bg-blue-950/10';
                  const severityTextColor =
                    ['high', 'critical'].includes(sev) ? 'text-red-400' :
                    ['medium', 'warning'].includes(sev) ? 'text-yellow-400' : 'text-emerald-400';

                  return (
                    <motion.div
                      key={index}
                      initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}
                      className={`border ${severityColor} p-4 rounded-2xl text-xs space-y-2 hover:border-slate-700/60 transition-colors`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-0.5 rounded-lg font-bold font-mono tracking-wide text-[10px] border border-blue-900/50 bg-blue-950/50 text-blue-400">
                          {issue.type || 'UI Error'}
                        </span>
                        <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${severityTextColor}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          Target: <code className="text-slate-200 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/30">{issue.element}</code>
                        </span>
                        <p className="text-slate-300 leading-relaxed mt-1.5 text-[11px]">{issue.description}</p>
                      </div>
                      {issue.fixSuggestion && (
                        <div className="bg-[#050812] p-3 rounded-xl border border-slate-900/80 font-mono text-cyan-400 hover:border-slate-800 transition-colors">
                          <span className="text-[9px] text-slate-500 block mb-1 uppercase font-sans font-bold tracking-wider">Suggested Fix:</span>
                          <span className="text-[11px] block text-slate-300">{issue.fixSuggestion}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-2 text-center py-12 text-slate-400">🎉 No issues found!</div>
                )}
              </div>
            </motion.div>

          </motion.div>
        )}
      </main>
    </div>
  );
}
