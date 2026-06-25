import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// Environment variable se key uthayega, fallback local testing ke liye hai
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCNGtERMCdLKpToEwSlPSr2cpQE5WTqhVU";

const splitCodeIntoChunks = (code, maxChunkSize = 8000, overlap = 1000) => {
    const chunks = [];
    let currentIndex = 0;
    while (currentIndex < code.length) {
        const chunk = code.substring(currentIndex, currentIndex + maxChunkSize);
        chunks.push(chunk);
        currentIndex += (maxChunkSize - overlap);
    }
    return chunks;
};

import axios from 'axios';

const apiKey = process.env.GEMINI_API_KEY || "YOUR_FALLBACK_KEY_IF_NEEDED";

export const executeGeminiCall = async (codeSnippet) => {
    const systemInstruction = `
        You are ViziAudit AI, an expert front-end compiler and UI/UX static analysis engine.
        Analyze the provided HTML, React, CSS, JavaScript, or Tailwind CSS code stream for layout flaws, responsive breakage, flexbox/grid misalignment, and utility conflicts.
        
        CRITICAL: You must detect any potential responsiveness issues, improper flex layouts, or bad spacing.
        You must reply with a valid JSON object matching this schema structure exactly:
        {
          "issues": [
            {
              "type": "Layout Bug",
              "element": "className or tag",
              "severity": "warning",
              "description": "Describe what is breaking or could be better dynamically",
              "fixSuggestion": "Provide the fix utility or style",
              "oldCode": "the snippet that needs fixing",
              "fixedCode": "the corrected snippet"
            }
          ]
        }
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        
        const response = await axios.post(url, {
            contents: [
                {
                    parts: [
                        { text: `${systemInstruction}\n\nAnalyze this raw code snippet now:\n\n${codeSnippet}` }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.data.candidates || response.data.candidates.length === 0) {
            throw new Error("Empty response from Gemini Gateway.");
        }

        let rawText = response.data.candidates[0].content.parts[0].text.trim();
        
        // Scope ke andar hi return ho raha hai
        return JSON.parse(rawText);

    } catch (e) {
        console.error("❌ Core Error Details:", e.message);
        return { issues: [] };
    }
};

export const analyzeSourceCode = async (codeStream) => {
    if (!codeStream || codeStream.length < 10) {
        return { issues: [] };
    }

    if (codeStream.length <= 9000) {
        return await executeGeminiCall(codeStream);
    }

    console.log(`⚠️ Heavy Stream Detected (${codeStream.length} chars). Activating Sliding Window Chunking...`);
    const codeChunks = splitCodeIntoChunks(codeStream, 8000, 1000);
    let masterIssuesList = [];

    for (let i = 0; i < codeChunks.length; i++) {
        console.log(`🔄 Scanning Window Chunk [${i + 1}/${codeChunks.length}]...`);
        try {
            const chunkResult = await executeGeminiCall(codeChunks[i]);
            if (chunkResult && chunkResult.issues) {
                masterIssuesList = masterIssuesList.concat(chunkResult.issues);
            }
        } catch (chunkErr) {
            console.error(`❌ Error scanning chunk ${i + 1}...`);
        }
    }

    const uniqueIssues = masterIssuesList.filter((issue, index, self) =>
        index === self.findIndex((t) => (
            t.oldCode === issue.oldCode && t.description === issue.description
        ))
    );

    return { issues: uniqueIssues };
};
