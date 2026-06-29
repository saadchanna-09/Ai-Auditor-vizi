// ViziAudit v3 — Frontend/src/App.tsx
// Complete glassmorphism redesign with:
// - Live framework badge detection
// - Real-time streaming progress
// - Expandable issue cards with before/after code diff
// - Severity filter bar
// - Scrape stats for URL mode
// - Copy fix button
// - Export report button

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, ShieldAlert, CheckCircle, AlertTriangle,
  RefreshCw, Cpu, Flame, Globe, Code2, Copy, Check,
  ChevronDown, ChevronUp, Download, Zap, Shield, Search,
  Activity, GitBranch, Layers3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://ai-auditor-vizi.vercel.app';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditIssue {
  id: string;
  type: string;
  element: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fixSuggestion: string;
  oldCode: string;
  fixedCode: string;
  rule: string;
}

interface AuditResult {
  detectedFramework: string;
  totalIssues: number;
  issues: AuditIssue[];
  cached?: boolean;
  scrapeStats?: { originalSize: number; cleanSize: number; reduction: string };
  url?: string;
}

type InputMode = 'code' | 'url';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEV_CONFIG = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-500',    label: 'Critical' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', label: 'High'     },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500', label: 'Medium'   },
  low:      { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',dot: 'bg-emerald-500',label: 'Low'      },
};

const FRAMEWORK_ICONS: Record<string, string> = {
  'react':          '⚛️',
  'react-tailwind': '⚛️',
  'tailwind-html':  '🎨',
  'html-css':       '🌐',
  'css':            '🎨',
  'javascript':     '⚡',
  'unknown':        '📄',
};

function frameworkLabel(fw: string) {
  const map: Record<string, string> = {
    'react':          'React JSX',
    'react-tailwind': 'React + Tailwind',
    'tailwind-html':  'HTML + Tailwind',
    'html-css':       'HTML / CSS',
    'css':            'CSS',
    'javascript':     'JavaScript',
  };
  return map[fw] || fw;
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition-all"
    >
      {copied ? <><Check size={10} className="text-emerald-400" /> Copied!</> : <><Copy size={10} /> {label}</>}
    </button>
  );
}

// ── IssueCard ────────────────────────────────────────────────────────────────
function IssueCard({ issue, index }: { issue: AuditIssue; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV_CONFIG[issue.severity] || SEV_CONFIG.low;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 120, damping: 14 }}
      className={`rounded-2xl border ${sev.border} ${sev.bg} backdrop-blur-xl overflow-hidden`}
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 group"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot} ring-2 ring-current/20`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${sev.border} ${sev.color} ${sev.bg}`}>
                {sev.label}
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                {issue.type}
              </span>
              {issue.line > 0 && (
                <span className="text-[10px] font-mono text-slate-600 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  Line {issue.line}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-200 font-medium leading-snug">
              {issue.element} — {issue.description}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors mt-0.5">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">

              {/* Fix suggestion */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">Suggested Fix</p>
                <p className="text-xs text-slate-300 leading-relaxed">{issue.fixSuggestion}</p>
              </div>

              {/* Rule */}
              {issue.rule && (
                <p className="text-[10px] text-slate-500 font-mono">
                  <span className="text-slate-600">Rule:</span> {issue.rule}
                </p>
              )}

              {/* Code diff */}
              {(issue.oldCode || issue.fixedCode) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {issue.oldCode && (
                    <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold">❌ Before</span>
                        <CopyButton text={issue.oldCode} label="Copy" />
                      </div>
                      <pre className="text-[11px] text-red-300/80 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                        {issue.oldCode}
                      </pre>
                    </div>
                  )}
                  {issue.fixedCode && (
                    <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">✅ After</span>
                        <CopyButton text={issue.fixedCode} label="Copy Fix" />
                      </div>
                      <pre className="text-[11px] text-emerald-300/80 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                        {issue.fixedCode}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<InputMode>('code');
  const [code, setCode] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');

  const LOADING_MSGS = [
    'Detecting framework...', 'Parsing code tokens...', 'Running AI engine...',
    'Scanning for React violations...', 'Checking Tailwind conflicts...', 'Compiling audit report...',
  ];

  const runAudit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null); setFilter('all'); setSearchQuery('');

    let msgIndex = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    const msgTimer = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIndex]);
    }, 1800);

    try {
      const endpoint = mode === 'url' ? '/api/audit-url' : '/api/audit';
      const body = mode === 'url' ? { url } : { codeStream: code };

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });

      clearInterval(msgTimer);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data: AuditResult = await res.json();
      // Normalize for legacy shape
      if (!data.issues && (data as any).report?.issues) {
        data.issues = (data as any).report.issues;
      }
      data.issues = data.issues || [];
      data.totalIssues = data.issues.length;
      setResult(data);
    } catch (err: any) {
      clearInterval(msgTimer);
      setError(err.name === 'TimeoutError' ? 'Request timed out. Try a smaller code snippet.' : err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  }, [mode, code, url]);

  // Filtered issues
  const filteredIssues = (result?.issues || []).filter((issue) => {
    const matchesSeverity = filter === 'all' || issue.severity === filter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || issue.description.toLowerCase().includes(q) ||
      issue.element.toLowerCase().includes(q) || issue.type.toLowerCase().includes(q);
    return matchesSeverity && matchesSearch;
  });

  // Chart data
  const chartData = result ? [
    { name: 'Critical', count: result.issues.filter(i => i.severity === 'critical').length },
    { name: 'High',     count: result.issues.filter(i => i.severity === 'high').length },
    { name: 'Medium',   count: result.issues.filter(i => i.severity === 'medium').length },
    { name: 'Low',      count: result.issues.filter(i => i.severity === 'low').length },
  ] : [];

  // Export report
  const exportReport = () => {
    if (!result) return;
    const report = {
      generatedAt: new Date().toISOString(),
      framework: result.detectedFramework,
      totalIssues: result.totalIssues,
      issues: result.issues,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `viziaudit-report-${Date.now()}.json`; a.click();
  };

  const counts = {
    critical: result?.issues.filter(i => i.severity === 'critical').length || 0,
    high:     result?.issues.filter(i => i.severity === 'high').length || 0,
    medium:   result?.issues.filter(i => i.severity === 'medium').length || 0,
    low:      result?.issues.filter(i => i.severity === 'low').length || 0,
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 font-sans overflow-x-hidden">

      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-700/8 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-600/6 blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-blue-700/5 blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-2xl bg-[#05070f]/70">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Terminal size={15} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">ViziAudit</span>
              <span className="ml-2 text-[9px] uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full font-bold">v3.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Live</span>
            </div>
            <span className="hidden sm:block font-mono">Gemini 2.5 Flash</span>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        {/* ── HERO / INPUT SECTION ── */}
        <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>

            {/* Heading */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-5">
                <Zap size={10} /> AI-Powered Frontend Audit Engine
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 mb-3">
                Find UI Bugs Instantly
              </h1>
              <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
                Paste your React, HTML, CSS, Tailwind, or JavaScript code. ViziAudit detects the framework automatically and runs a deep AI audit.
              </p>
            </div>

            {/* Glass Input Card */}
            <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 shadow-2xl shadow-black/40">

              {/* Mode Toggle */}
              <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit mb-5">
                {(['code', 'url'] as InputMode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      mode === m ? 'bg-white/10 text-white shadow backdrop-blur-sm border border-white/10' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m === 'code' ? <><Code2 size={13} /> Paste Code</> : <><Globe size={13} /> Live URL</>}
                  </button>
                ))}
              </div>

              <form onSubmit={runAudit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {mode === 'code' ? (
                    <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                      <textarea
                        value={code} onChange={e => setCode(e.target.value)}
                        placeholder={`// Paste React, HTML, CSS, Tailwind, or JS code here...\n// Example:\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return <div onClick={setCount(count + 1)}>{count}</div>;\n}`}
                        rows={12}
                        disabled={loading}
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 font-mono resize-y outline-none transition-all min-h-[200px]"
                      />
                      {code && (
                        <p className="text-[10px] text-slate-600 mt-1 font-mono">
                          {code.split('\n').length} lines · {code.length} chars
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="url" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                      <input
                        type="url" value={url} onChange={e => setUrl(e.target.value)}
                        placeholder="https://your-website.com"
                        disabled={loading} required
                        className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={loading || (mode === 'code' ? !code.trim() : !url.trim())}
                  className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 active:scale-[0.99]"
                >
                  {loading
                    ? <><RefreshCw size={15} className="animate-spin" /> {loadingMsg}</>
                    : <><Shield size={15} /> Run AI Audit</>
                  }
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* ── ERROR ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-6 mb-6"
            >
              <div className="backdrop-blur-xl bg-red-950/20 border border-red-500/25 rounded-2xl p-4 flex items-start gap-3 text-sm">
                <ShieldAlert size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-bold text-xs uppercase tracking-wider mb-0.5">Audit Failed</p>
                  <p className="text-red-300/80">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RESULTS DASHBOARD ── */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-6 pb-16 space-y-6"
            >

              {/* Top bar — framework badge, cache indicator, export */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-3"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xl">{FRAMEWORK_ICONS[result.detectedFramework] || '📄'}</span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Detected Framework</p>
                    <p className="text-sm font-bold text-white">{frameworkLabel(result.detectedFramework)}</p>
                  </div>
                  {result.cached && (
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap size={9} /> Cached Result
                    </span>
                  )}
                  {result.scrapeStats && (
                    <span className="text-[10px] text-slate-400 font-mono bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                      DOM cleaned: {result.scrapeStats.reduction} reduction
                    </span>
                  )}
                </div>
                <button onClick={exportReport}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Download size={12} /> Export JSON
                </button>
              </motion.div>

              {/* Stats grid + chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Severity counters */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="lg:col-span-5 backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Activity size={14} className="text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Audit Metrics</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-5">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{result.totalIssues}</span>
                    <span className="text-xs text-slate-500 pb-1">total issues</span>
                  </div>
                  <div className="space-y-2">
                    {(['critical','high','medium','low'] as const).map(sev => {
                      const cfg = SEV_CONFIG[sev];
                      const count = counts[sev];
                      const pct = result.totalIssues ? Math.round((count / result.totalIssues) * 100) : 0;
                      return (
                        <div key={sev} className={`flex items-center justify-between ${cfg.bg} ${cfg.border} border rounded-xl px-3 py-2`}>
                          <span className={`text-xs flex items-center gap-2 ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full ${cfg.dot} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`font-mono text-xs font-bold ${cfg.color}`}>{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Chart */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="lg:col-span-7 backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Layers3 size={14} className="text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Severity Distribution</span>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f1629', borderColor: 'rgba(124,58,237,0.3)', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }}
                          cursor={{ stroke: 'rgba(124,58,237,0.3)', strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#g1)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Issues list */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
              >
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Issues ({filteredIssues.length})
                    </span>
                  </div>

                  {/* Severity filter pills */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all','critical','high','medium','low'] as const).map(f => {
                      const cfg = f !== 'all' ? SEV_CONFIG[f] : null;
                      return (
                        <button key={f} onClick={() => setFilter(f)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            filter === f
                              ? cfg ? `${cfg.color} ${cfg.bg} ${cfg.border}` : 'text-violet-400 bg-violet-500/10 border-violet-500/30'
                              : 'text-slate-500 bg-white/[0.03] border-white/[0.08] hover:text-slate-300'
                          }`}
                        >
                          {f === 'all' ? `All (${result.totalIssues})` : `${f} (${counts[f]})`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 ml-auto">
                    <Search size={12} className="text-slate-500" />
                    <input
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search issues..."
                      className="bg-transparent outline-none text-xs text-slate-300 placeholder-slate-600 w-32"
                    />
                  </div>
                </div>

                {/* Issue cards */}
                {filteredIssues.length > 0 ? (
                  <div className="space-y-2">
                    {filteredIssues.map((issue, i) => (
                      <IssueCard key={issue.id || i} issue={issue} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">
                    <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500/50" />
                    <p className="text-sm">No issues match your filter.</p>
                  </div>
                )}
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ── EMPTY STATE ── */}
        {!loading && !result && !error && (
          <div className="max-w-4xl mx-auto px-6 pb-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {[
                { icon: <Cpu size={20} className="text-violet-400" />, title: 'Auto Framework Detection', desc: 'Detects React, Tailwind, HTML/CSS, and JS automatically from your code.' },
                { icon: <Flame size={20} className="text-orange-400" />, title: 'Deep React Analysis', desc: 'Finds hooks violations, missing keys, stale closures, event handler bugs — even in 10-line snippets.' },
                { icon: <Shield size={20} className="text-emerald-400" />, title: 'One-Click Fixes', desc: 'Every issue comes with exact before/after code. Copy the fix instantly.' },
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                  className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-3">{f.icon}</div>
                  <p className="text-sm font-bold text-white mb-1">{f.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
