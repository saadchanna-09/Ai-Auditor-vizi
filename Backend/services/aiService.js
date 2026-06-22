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

const executeGeminiCall = async (codeSnippet) => {
    // 💀 UPDATED BRUTE-FORCE PROMPT
    const systemInstruction = `
        You are ViziAudit AI, an expert front-end compiler and UI/UX static analysis engine.
        Analyze the provided raw HTML, React, CSS, JavaScript, or Tailwind CSS code stream for layout flaws, responsive breakage, flexbox/grid conflicts, and spacing bugs.
        
        CRITICAL RULES:
        1. YOU MUST FIND AND REPORT at least ONE potential layout or responsive flaw, even if minor (e.g., hardcoded widths, absolute positioning, lack of responsive classes, font-sizing issues).
        2. Reply ONLY with a valid JSON object matching this schema exactly.
        3. Do NOT include markdown backticks like \`\`\`json. Do NOT add any conversational text.
        
        Response JSON Format (Schema):
        {
          "issues": [
            {
              "type": "Layout Bug Type",
              "element": "React class or Tag",
              "severity": "critical",
              "description": "Describe what is breaking dynamically",
              "fixSuggestion": "How to fix it",
              "oldCode": "the exact character snippet from codeStream that needs fixing",
              "fixedCode": "the corrected exact snippet to replace oldCode"
            }
          ]
        }
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        
        // 🚀 BACK TO STANDARD CONFIG FOR BRUTE FORCE
        const response = await axios.post(url, {
            contents: [
                {
                    parts: [
                        { text: `${systemInstruction}\n\nAnalyze this raw code stream now:\n\n${codeSnippet}` }
                    ]
                }
            ]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.data.candidates || response.data.candidates.length === 0) {
            throw new Error("Empty response from Gemini Gateway.");
        }

        let rawText = response.data.candidates[0].content.parts[0].text.trim();
        console.log("📥 Raw Gemini Response text:", rawText);

        // Standard markdown removal fallback
        if (rawText.includes("```")) {
            rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        }

        return JSON.parse(rawText);

    } catch (e) {
        if (e.response && e.response.data) {
            console.log("❌ Raw Google API Error Payload:", JSON.stringify(e.response.data));
        } else {
            console.log("❌ Core Error Details:", e.message);
        }
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
