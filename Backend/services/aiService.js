// ✅ UPGRADED: services/aiService.js
// Changes: gemini-1.5-pro (raw axios) → gemini-2.5-flash (@google/generative-ai SDK)
// Added: React/JSX, Tailwind conflict, JS logic categories
// Fixed: API key from .env only (no hardcoded key)
// Kept: Your existing chunking logic (just improved thresholds)

import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── STRICT JSON SCHEMA (Gemini is LOCKED to this — formatting crash = 0%) ────
const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            description: "Issue category name",
          },
          element: {
            type: SchemaType.STRING,
            description: "CSS selector, tag name, or React component name",
          },
          severity: {
            type: SchemaType.STRING,
            enum: ["critical", "high", "medium", "low"],
          },
          description: {
            type: SchemaType.STRING,
            description: "Clear explanation of the issue",
          },
          fixSuggestion: {
            type: SchemaType.STRING,
            description: "Human-readable fix guidance",
          },
          oldCode: {
            type: SchemaType.STRING,
            description: "Exact code snippet from the input that needs replacing",
          },
          fixedCode: {
            type: SchemaType.STRING,
            description: "Complete corrected replacement code snippet",
          },
        },
        required: ["type", "element", "severity", "description", "fixSuggestion", "oldCode", "fixedCode"],
      },
    },
  },
  required: ["issues"],
};

// ─── SYSTEM INSTRUCTION ───────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are ViziAudit AI, an expert frontend compiler and UI/UX static analysis engine.

You analyze submitted code and return ONLY valid structured JSON — no markdown, no backticks, no extra text.

Your audit scope covers ALL of these:
1. HTML / CSS: layout bugs, box model errors, z-index conflicts, overflow issues
2. React JSX / TSX: missing keys in lists, improper hook usage, component anti-patterns, prop issues
3. Tailwind CSS: utility class conflicts (e.g. flex + block on same element), missing responsive prefixes, duplicate spacing classes
4. JavaScript: logic errors causing UI bugs (wrong event binding, async state updates, unguarded null access)
5. Accessibility (WCAG 2.1 AA): missing alt text, missing ARIA roles, low color contrast, keyboard traps
6. Responsiveness: missing breakpoints, fixed pixel widths that break on mobile

For oldCode: copy the EXACT substring from the provided code (it will be used for find-and-replace).
For fixedCode: provide the complete corrected replacement, paste-ready.
For severity: critical = breaks layout/functionality, high = significant issue, medium = warning, low = suggestion.`;

// ─── DETECT FRAMEWORK ─────────────────────────────────────────────────────────
function detectFramework(code) {
  if (/<[A-Z]/.test(code) || code.includes("import React") || code.includes("from 'react'")) {
    return "React JSX/TSX";
  }
  if (/className=["'][^"']*\b(flex|grid|text-|bg-|p-\d|m-\d|w-|h-)/.test(code)) {
    return "Tailwind CSS + React";
  }
  if (/<html|<!DOCTYPE|<div|<style/i.test(code)) return "HTML/CSS";
  if (code.includes("=>") || code.includes("function") || code.includes("const ")) return "JavaScript";
  return "Mixed Frontend Code";
}

// ─── SINGLE GEMINI CALL ───────────────────────────────────────────────────────
const executeGeminiCall = async (codeSnippet) => {
  const framework = detectFramework(codeSnippet);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  });

  const prompt = `Analyze this ${framework} code for all UI/UX issues, layout bugs, framework-specific anti-patterns, and accessibility violations.

Detected framework: ${framework}

CODE TO AUDIT:
${codeSnippet}

Return a complete JSON audit with every issue found. For every issue provide exact oldCode (copy from above) and fixedCode (paste-ready replacement).`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    // Safety net: extract JSON from any accidental wrapping
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1) {
      return JSON.parse(text.substring(first, last + 1));
    }
    console.error("❌ JSON parse failed after cleanup");
    return { issues: [] };
  }
};

// ─── CHUNK SPLITTER (your existing logic, improved thresholds) ─────────────────
const splitCodeIntoChunks = (code, maxChunkSize = 12000, overlap = 1500) => {
  const chunks = [];
  let currentIndex = 0;
  while (currentIndex < code.length) {
    const chunk = code.substring(currentIndex, currentIndex + maxChunkSize);
    chunks.push(chunk);
    currentIndex += maxChunkSize - overlap;
  }
  return chunks;
};

// ─── DEDUPLICATE (your existing logic — kept exactly) ─────────────────────────
const deduplicateIssues = (issues) =>
  issues.filter(
    (issue, index, self) =>
      index === self.findIndex(
        (t) => t.oldCode === issue.oldCode && t.description === issue.description
      )
  );

// ─── MAIN EXPORT (same function name as before — drop-in replacement) ─────────
export const analyzeSourceCode = async (codeStream) => {
  if (!codeStream || codeStream.length < 10) {
    return { issues: [] };
  }

  // Small files: direct single call
  if (codeStream.length <= 12000) {
    try {
      return await executeGeminiCall(codeStream);
    } catch (e) {
      console.error("❌ Single audit call failed:", e.message);
      return { issues: [] };
    }
  }

  // Large files: sliding window chunking
  console.log(`⚠️ Heavy stream detected (${codeStream.length} chars). Activating chunker...`);
  const chunks = splitCodeIntoChunks(codeStream, 12000, 1500);
  let masterIssuesList = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 Scanning chunk [${i + 1}/${chunks.length}]...`);
    try {
      const chunkResult = await executeGeminiCall(chunks[i]);
      if (chunkResult?.issues) {
        masterIssuesList = masterIssuesList.concat(chunkResult.issues);
      }
    } catch (chunkErr) {
      console.error(`❌ Chunk ${i + 1} failed:`, chunkErr.message);
    }
  }

  return { issues: deduplicateIssues(masterIssuesList) };
};
