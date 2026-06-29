// ================================================================
// ViziAudit v3 — aiService.js  (COMPLETE REWRITE)
// Root cause fix: Gemini 20-25 line React code mein bugs nahi
// dhundhta tha kyunki prompt bahut generic tha.
// Solution: Framework auto-detect + ultra-specific prompts per
// language + strict JSON schema via SDK (not raw axios).
// ================================================================

import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing from .env file!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================================================================
// STRICT JSON SCHEMA — Gemini is hard-locked to this structure.
// No markdown, no text outside JSON, zero formatting crashes.
// ================================================================
const AUDIT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    detectedFramework: { type: SchemaType.STRING },
    totalIssues: { type: SchemaType.NUMBER },
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:           { type: SchemaType.STRING },
          type:         { type: SchemaType.STRING },
          element:      { type: SchemaType.STRING },
          line:         { type: SchemaType.NUMBER },
          severity:     { type: SchemaType.STRING, enum: ["critical", "high", "medium", "low"] },
          description:  { type: SchemaType.STRING },
          fixSuggestion:{ type: SchemaType.STRING },
          oldCode:      { type: SchemaType.STRING },
          fixedCode:    { type: SchemaType.STRING },
          rule:         { type: SchemaType.STRING },
        },
        required: ["id","type","element","line","severity","description","fixSuggestion","oldCode","fixedCode","rule"],
      },
    },
  },
  required: ["detectedFramework", "totalIssues", "issues"],
};

// ================================================================
// FRAMEWORK DETECTOR — reads actual code patterns
// ================================================================
export function detectFramework(code) {
  const hasJSX        = /<[A-Z][a-zA-Z]*[\s/>]/.test(code) || /return\s*\([\s\S]*</.test(code);
  const hasReactImport= /from ['"]react['"]/i.test(code) || /import React/i.test(code);
  const hasTailwind   = /className=["'][^"']*(?:flex|grid|text-|bg-|p-\d|m-\d|w-\d|h-\d|rounded|border|shadow)[^"']*["']/.test(code);
  const hasHooks      = /use[A-Z][a-zA-Z]+\(/.test(code);
  const hasCSS        = /\{[\s\S]*:[\s\S]*;[\s\S]*\}/.test(code) && !hasJSX;
  const hasHTML       = /<html|<!DOCTYPE|<head|<body/i.test(code);

  if ((hasJSX || hasReactImport) && hasTailwind) return "react-tailwind";
  if (hasJSX || hasReactImport || hasHooks)      return "react";
  if (hasTailwind)                               return "tailwind-html";
  if (hasHTML)                                   return "html-css";
  if (hasCSS)                                    return "css";
  return "javascript";
}

// ================================================================
// FRAMEWORK-SPECIFIC SYSTEM INSTRUCTIONS
// Yeh woh root fix hai — generic prompt ki jagah har framework
// ke liye alag aur aggressive instructions
// ================================================================
const SYSTEM_INSTRUCTIONS = {

  "react": `You are ViziAudit, an expert React code auditor and UI/UX analyzer.
You MUST find bugs in EVERY React code snippet — even 10-20 line snippets almost always have issues.

MANDATORY CHECKS — examine every single one:
1. HOOKS VIOLATIONS: useState/useEffect inside conditions, loops, or nested functions (Rules of Hooks)
2. MISSING DEPENDENCY ARRAY: useEffect without deps array = infinite loop
3. STALE CLOSURE: useEffect reading state/props not listed in deps
4. MISSING KEY PROP: Any .map() rendering JSX without key={unique_id}
5. DIRECT STATE MUTATION: obj.property = value instead of setState({...obj, property: value})
6. CONDITIONAL RENDERING BUGS: {count && <Comp/>} renders "0" when count=0, use {count > 0 && <Comp/>}
7. EVENT HANDLER MISTAKES: onClick={handleClick()} immediately invokes, should be onClick={handleClick}
8. MISSING ERROR BOUNDARIES: async operations without try/catch
9. PROP DRILLING: passing props 3+ levels deep — suggest Context
10. ACCESSIBILITY: buttons without aria-label, images without alt, inputs without labels
11. PERFORMANCE: missing React.memo, missing useCallback for passed functions, missing useMemo for expensive calculations
12. CLEANUP: useEffect with subscriptions/timers without return cleanup function

You MUST report AT MINIMUM 2-3 issues for any code snippet. If the code looks clean, look harder — find performance, accessibility, or best-practice issues.

For oldCode: copy the EXACT line(s) from input (verbatim, for find-and-replace to work).
For fixedCode: complete corrected replacement.
For line: estimate the line number (1-based).
For rule: cite the React/accessibility rule (e.g. "Rules of Hooks", "WCAG 1.1.1", "React Performance").`,

  "react-tailwind": `You are ViziAudit, an expert React + Tailwind CSS auditor.
You MUST find bugs in EVERY code snippet — even short ones have issues.

MANDATORY CHECKS:
TAILWIND CONFLICTS:
1. flex + block on same element (block overrides flex)
2. w-full inside a flex container without flex-shrink-0 
3. absolute positioning without relative parent
4. text-center on block element that needs w-full to work
5. overflow-hidden cutting off dropdown/tooltip children
6. z-index without isolation context
7. Conflicting spacing: px-4 + pl-6 on same element (pl overrides px on left)
8. Missing responsive prefixes: fixed widths without md: lg: breakpoints
9. hover: without focus: (accessibility — keyboard users can't trigger hover)
10. dark: variant used without dark mode configured in tailwind.config

REACT ISSUES (all from react ruleset above):
11-20. All React hooks, keys, state, event handler checks

ACCESSIBILITY (Tailwind-specific):
21. Color contrast — e.g. text-gray-400 on bg-gray-800 may fail WCAG AA
22. Interactive div/span instead of button (no keyboard access)
23. Missing focus:ring- on interactive elements

Report MINIMUM 3 issues per snippet.`,

  "html-css": `You are ViziAudit, an expert HTML/CSS auditor.
You MUST find bugs in EVERY code snippet.

MANDATORY CHECKS:
1. BOX MODEL: width:100% + padding causing overflow (use box-sizing:border-box)
2. FLEXBOX BUGS: flex children without flex-shrink, overflow on flex containers
3. POSITIONING: absolute without positioned parent, z-index without stacking context
4. RESPONSIVE: fixed px widths, missing viewport meta, no media queries
5. SPECIFICITY: overly specific selectors, !important abuse
6. ACCESSIBILITY: missing alt, missing label[for], missing ARIA roles, low contrast
7. SEMANTIC HTML: div soup instead of nav/main/section/article
8. PERFORMANCE: render-blocking CSS, large unoptimized images, no lazy loading
9. CSS RESETS: conflicting margin:0 auto with other layout rules
10. INHERITANCE: font not set on body, color not cascading properly

Report MINIMUM 3 issues.`,

  "tailwind-html": `You are ViziAudit, an expert Tailwind CSS + HTML auditor.
Focus on Tailwind utility conflicts AND HTML structure.

MANDATORY CHECKS — all Tailwind conflicts + HTML accessibility checks.
Report MINIMUM 3 issues.`,

  "javascript": `You are ViziAudit, an expert JavaScript/UI logic auditor.
You MUST find bugs in EVERY code snippet.

MANDATORY CHECKS:
1. NULL/UNDEFINED ACCESS: obj.property without null check
2. ASYNC BUGS: missing await, unhandled promise rejections, async without try/catch
3. EVENT LISTENER LEAKS: addEventListener without removeEventListener cleanup
4. DOM MANIPULATION: innerHTML = userInput (XSS), direct style manipulation instead of classes
5. CLOSURE ISSUES: var in loops (use let/const), stale closures
6. TYPE COERCION: == instead of ===, + operator with mixed types
7. ARRAY MUTATIONS: .sort() mutating original array, .splice() side effects
8. MEMORY LEAKS: setInterval without clearInterval, detached DOM nodes
9. ERROR HANDLING: no try/catch around JSON.parse, fetch without .catch()
10. PERFORMANCE: DOM queries inside loops, synchronous heavy operations

Report MINIMUM 3 issues.`,

  "css": `You are ViziAudit, an expert CSS auditor.
Find all layout bugs, specificity issues, performance problems, and accessibility violations.
Report MINIMUM 3 issues.`,
};

// ================================================================
// MAIN GEMINI CALL — per-framework prompt
// ================================================================
async function executeGeminiCall(codeSnippet, framework) {
  const systemInstruction = SYSTEM_INSTRUCTIONS[framework] || SYSTEM_INSTRUCTIONS["javascript"];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: AUDIT_SCHEMA,
      temperature: 0.15,      // Low but not zero — allows nuanced findings
      topP: 0.85,
      maxOutputTokens: 8192,  // Enough for detailed reports
    },
  });

  const lineCount = codeSnippet.split("\n").length;
  const charCount = codeSnippet.length;

  const prompt = `Audit the following ${framework.toUpperCase()} code.

File stats: ${lineCount} lines, ${charCount} characters.

IMPORTANT: This is a ${lineCount}-line snippet. You MUST find issues — short code almost always has missing keys, hooks violations, accessibility problems, or Tailwind conflicts. Look carefully at EVERY line.

CODE TO AUDIT:
\`\`\`
${codeSnippet}
\`\`\`

Find ALL issues. Be specific — include exact line numbers and exact code snippets for oldCode.
Return complete JSON with every issue found.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const parsed = JSON.parse(text);
    // Ensure IDs are set
    parsed.issues = (parsed.issues || []).map((issue, i) => ({
      ...issue,
      id: issue.id || `issue_${String(i + 1).padStart(3, "0")}`,
    }));
    parsed.totalIssues = parsed.issues.length;
    return parsed;
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1) {
      return JSON.parse(text.substring(first, last + 1));
    }
    throw new Error("JSON parse failed after cleanup");
  }
}

// ================================================================
// SMART CHUNKER — line-aware, preserves JSX component boundaries
// ================================================================
function smartChunk(code, maxLines = 300) {
  const lines = code.split("\n");
  if (lines.length <= maxLines) return [code];

  const chunks = [];
  let currentChunk = [];
  let depth = 0; // Track JSX/brace depth to avoid splitting mid-component

  for (const line of lines) {
    depth += (line.match(/[({[<]/g) || []).length;
    depth -= (line.match(/[)}\]>]/g) || []).length;
    depth = Math.max(0, depth);

    currentChunk.push(line);

    // Only split at "safe" points: depth=0 (top level) and chunk is big enough
    if (currentChunk.length >= maxLines && depth === 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk.join("\n"));
  return chunks;
}

// ================================================================
// DEDUPLICATE — smarter than before (fuzzy match on description)
// ================================================================
function deduplicateIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.element}::${issue.type}::${(issue.description || "").slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.set(key);
    return true;
  });
}

// ================================================================
// MAIN EXPORT
// ================================================================
export const analyzeSourceCode = async (codeStream) => {
  if (!codeStream || typeof codeStream !== "string") {
    return { detectedFramework: "unknown", totalIssues: 0, issues: [] };
  }

  const code = codeStream.trim();

  // Framework detection BEFORE chunking (detect on full code)
  const framework = detectFramework(code);
  console.log(`🔍 Framework detected: ${framework} | ${code.split("\n").length} lines | ${code.length} chars`);

  // For small code (≤ 300 lines): single direct call — no chunking overhead
  const lineCount = code.split("\n").length;

  if (lineCount <= 300) {
    try {
      const result = await executeGeminiCall(code, framework);
      result.detectedFramework = framework;
      console.log(`✅ Audit complete: ${result.totalIssues} issues found`);
      return result;
    } catch (e) {
      console.error("❌ Single call failed:", e.message);
      return { detectedFramework: framework, totalIssues: 0, issues: [], error: e.message };
    }
  }

  // Large files: smart chunking
  console.log(`⚠️ Large file (${lineCount} lines) — activating smart chunker...`);
  const chunks = smartChunk(code, 280);
  console.log(`📦 Split into ${chunks.length} chunks`);

  let allIssues = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 Scanning chunk [${i + 1}/${chunks.length}]...`);
    try {
      const result = await executeGeminiCall(chunks[i], framework);
      if (result?.issues?.length) {
        allIssues = allIssues.concat(result.issues);
      }
    } catch (err) {
      console.error(`❌ Chunk ${i + 1} failed: ${err.message}`);
    }
  }

  const unique = deduplicateIssues(allIssues);
  console.log(`✅ Chunked audit complete: ${unique.length} unique issues (from ${allIssues.length} raw)`);

  return {
    detectedFramework: framework,
    totalIssues: unique.length,
    issues: unique,
  };
};
