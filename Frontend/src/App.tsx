import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, Monitor, Tablet, Smartphone, CheckCircle, AlertTriangle, RefreshCw, Cpu, Layers, Layout, Flame, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface AuditIssue {
  id: string;
  type: 'UI' | 'Accessibility' | 'Responsiveness';
  device: string;
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  fixSuggestion: string;
}

interface AuditData {
  success: boolean;
  url: string;
  report: { issues: AuditIssue[] };
  previews: { mobile: string; tablet: string; desktop: string };
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('https://viziaudit-backend.vercel.app/api/audit"', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Something went wrong');
      
      // Artificial dynamic delay added to show off premium loading sequences
      setTimeout(() => {
        setData(result);
        setLoading(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the central AI server.');
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!data) return [];
    const issues = data.report.issues;
    return [
      { name: 'UI / UX Layout', count: issues.filter(i => i.type === 'UI').length },
      { name: 'Accessibility', count: issues.filter(i => i.type === 'Accessibility').length },
      { name: 'Responsive Breakpoints', count: issues.filter(i => i.type === 'Responsiveness').length },
    ];
  };

  // Animation Variants for Bento Grid Elements
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring" as const, // <--- type ke aage bhi 'as const' laga sakte ho ya pure object ke end par
      stiffness: 100, 
      damping: 10 
    } 
  }
} as const; // <--- Pure object ke aakhir mein lazmi lagayein // <--- Yeh 'as const' lagane se charo errors gayab ho jayenge

  return (
    <div className="min-h-screen bg-[#060913] text-gray-100 p-4 md:p-8 font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden">
      
      {/* Dynamic Cyber Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none" />

      {/* Premium Header */}
      <motion.header 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-7xl mx-auto mb-10 flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-slate-800/60 pb-6 relative z-10"
      >
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-500/20 relative group overflow-hidden">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
            />
            <Terminal size={26} className="relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">VisiAudit AI Engine</h1>
              <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold">Live Core</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono"><Cpu size={12} className="text-slate-500" /> Distributed Neural Agent Suite v1.2</p>
          </div>
        </div>

        {/* Input Interface with Sleek Neon Focus Effects */}
        <form onSubmit={handleAudit} className="flex w-full lg:w-auto items-center gap-3 max-w-xl flex-1 relative">
          <div className="relative w-full group">
            <input
              type="url"
              placeholder="Inject endpoint URL to diagnose (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="bg-[#0c1325]/80 border border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none px-4 py-3 rounded-2xl w-full text-sm text-slate-100 placeholder-slate-500 transition-all duration-300 backdrop-blur-md shadow-inner"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-800 disabled:to-slate-900 text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer whitespace-nowrap border border-blue-400/20"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : 'Execute Audit'}
          </button>
        </form>
      </motion.header>

      <main className="max-w-7xl mx-auto relative z-10">
        
        {/* Error Sequence */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-red-950/20 border border-red-500/30 text-red-300 p-4 rounded-2xl flex items-start gap-3 mb-8 text-sm backdrop-blur-md"
            >
              <ShieldAlert className="shrink-0 mt-0.5 text-red-500" size={18} />
              <div><span className="font-bold uppercase tracking-wider text-xs block text-red-400 mb-0.5">Core Sync Pipeline Fractured</span> {error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial Welcome/Empty State Screen */}
        {!loading && !data && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-slate-800/80 rounded-3xl p-16 text-center max-w-2xl mx-auto mt-16 bg-gradient-to-b from-[#0e162b]/40 to-transparent backdrop-blur-md relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />
            <div className="bg-[#131d37] border border-slate-700/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg text-slate-400 group-hover:text-blue-400 transition-colors">
              <Layout size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-200">System Awaiting URL Injection</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Provide an accessible web deployment target above. Our orchestrator will command a multi-device viewport sandbox to ingest visual UI frames for deep architectural neural checks.
            </p>
          </motion.div>
        )}

        {/* Realistic High-Tech Loading Block */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-28 bg-[#0c1325]/20 border border-slate-800/60 rounded-3xl backdrop-blur-xl max-w-3xl mx-auto shadow-2xl"
            >
              <div className="relative mb-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-blue-500 border-t-transparent"
                />
                <Cpu className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={22} />
              </div>
              <h4 className="text-base font-bold text-slate-200 tracking-wide font-mono">CRITICAL TASK: INGESTING breaks</h4>
              <p className="text-xs text-slate-400 mt-2 text-center max-w-md px-6 leading-relaxed font-mono">
                [Puppeteer Core] Instantiating Headless Chromium Sandbox Instance... <br />
                <span className="text-blue-400">[Active Log]</span> Capturing snapshots across Responsive Nodes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPREHENSIVE HIGH-TECH BENTO DASHBOARD */}
        {data && !loading && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            
            {/* ITEM 1: Diagnostics Scorecard */}
            <motion.div variants={itemVariants} className="lg:col-span-4 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent pointer-events-none" />
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <Layers size={14} className="text-blue-500" />
                  <span>Audit Metrics</span>
                </div>
                <div className="mt-6 flex items-baseline gap-2.5">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tighter">{data.report.issues.length}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pb-2">Structural Faults</span>
                </div>
              </div>
              
              <div className="mt-8 space-y-2.5 border-t border-slate-800/80 pt-5">
                <div className="flex justify-between items-center bg-[#101931]/40 border border-slate-800/40 px-3 py-2.5 rounded-xl hover:bg-[#101931]/70 transition-colors">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><Flame size={14} className="text-red-500 animate-pulse" /> High Severity Defect</span>
                  <span className="font-mono text-xs font-bold text-red-400 px-2 py-0.5 rounded bg-red-950/30 border border-red-500/20">{data.report.issues.filter(i => i.severity === 'high').length}</span>
                </div>
                <div className="flex justify-between items-center bg-[#101931]/40 border border-slate-800/40 px-3 py-2.5 rounded-xl hover:bg-[#101931]/70 transition-colors">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><AlertTriangle size={14} className="text-yellow-500" /> Medium Warning</span>
                  <span className="font-mono text-xs font-bold text-yellow-400 px-2 py-0.5 rounded bg-yellow-950/30 border border-yellow-500/20">{data.report.issues.filter(i => i.severity === 'medium').length}</span>
                </div>
                <div className="flex justify-between items-center bg-[#101931]/40 border border-slate-800/40 px-3 py-2.5 rounded-xl hover:bg-[#101931]/70 transition-colors">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Optimization Pass</span>
                  <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/20">{data.report.issues.filter(i => i.severity === 'low').length}</span>
                </div>
              </div>
            </motion.div>

            {/* ITEM 2: Elegant Glowing Area Distribution Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-8 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors relative overflow-hidden">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Fault Density Vectors
              </h2>
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
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

            {/* ITEM 3: Multi-Device Simulated Viewport Frame */}
            <motion.div variants={itemVariants} className="lg:col-span-7 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 flex flex-col backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Sandbox Inspection Node</h2>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono">
                    <span className="truncate max-w-[180px] md:max-w-xs">{data.url}</span>
                    <ExternalLink size={10} />
                  </div>
                </div>
                <div className="flex bg-[#101930] p-1 rounded-xl border border-slate-800/80 shadow-inner">
                  <button onClick={() => setActiveTab('desktop')} className={`p-2 rounded-lg transition-all cursor-pointer ${activeTab === 'desktop' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-400 hover:text-slate-200'}`} title="Desktop Viewport"><Monitor size={15} /></button>
                  <button onClick={() => setActiveTab('tablet')} className={`p-2 rounded-lg transition-all cursor-pointer ${activeTab === 'tablet' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-400 hover:text-slate-200'}`} title="Tablet Viewport"><Tablet size={15} /></button>
                  <button onClick={() => setActiveTab('mobile')} className={`p-2 rounded-lg transition-all cursor-pointer ${activeTab === 'mobile' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-400 hover:text-slate-200'}`} title="Mobile Viewport"><Smartphone size={15} /></button>
                </div>
              </div>

              {/* Viewport Dynamic Frame with Smooth Scale Transition */}
              <div className="bg-[#050811] border border-slate-900/60 rounded-2xl p-4 flex justify-center items-center flex-1 min-h-[400px] shadow-inner relative group">
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full flex justify-center items-center"
                  >
                    <img
                      src={data.previews[activeTab]}
                      alt={`${activeTab} audit viewport`}
                      className={`rounded-xl border border-slate-800/80 max-h-[380px] object-contain shadow-2xl transition-all duration-300 group-hover:border-slate-700`}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ITEM 4: Highly Streamlined AI Diagnosis Feed */}
            <motion.div variants={itemVariants} className="lg:col-span-5 bg-[#0c1325]/70 border border-slate-800/80 rounded-3xl p-6 flex flex-col backdrop-blur-md shadow-xl hover:border-slate-700/60 transition-colors">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Cpu size={14} className="text-purple-400" /> Engineering Remediations
              </h2>
              <div className="space-y-4 overflow-y-auto max-h-[440px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {data.report.issues.map((issue, index) => (
                  <motion.div 
                    key={issue.id} 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-[#101931]/50 border border-slate-800/60 p-4 rounded-2xl text-xs space-y-3 relative group overflow-hidden hover:border-slate-700/60 transition-colors"
                  >
                    <div className="flex justify-between items-center relative z-10">
                      <span className={`px-2.5 py-0.5 rounded-lg font-bold font-mono tracking-wide text-[10px] border ${
                        issue.type === 'UI' ? 'bg-blue-950/50 text-blue-400 border-blue-900/50' :
                        issue.type === 'Accessibility' ? 'bg-purple-950/50 text-purple-400 border-purple-900/50' :
                        'bg-pink-950/50 text-pink-400 border-pink-900/50'
                      }`}>{issue.type}</span>
                      <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${issue.severity === 'high' ? 'text-red-400' : issue.severity === 'medium' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        // {issue.severity} priority
                      </span>
                    </div>
                    
                    <div className="relative z-10">
                      <span className="text-[11px] text-slate-400 block font-mono">DOM Root: <code className="text-slate-200 bg-slate-800/50 px-1.5 py-0.5 rounded font-mono border border-slate-700/30">{issue.element}</code></span>
                      <p className="text-slate-300 leading-relaxed mt-2 text-[11px]">{issue.description}</p>
                    </div>
                    
                    <div className="bg-[#050812] p-3 rounded-xl border border-slate-900/80 font-mono text-cyan-400 mt-2 relative overflow-hidden group-hover:border-slate-800 transition-colors">
                      <span className="text-[9px] text-slate-500 block mb-1 uppercase font-sans font-bold tracking-wider">Suggested Fix / Patch Command:</span>
                      <span className="text-[11px] block text-slate-300">{issue.fixSuggestion}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

          </motion.div>
        )}
      </main>
    </div>
  );
}