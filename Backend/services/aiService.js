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
    console.log("⚡ Forcing Mock JSON Response to test Extension Webview UI!");
    
    // Hardcoded response direct return karega bina Gemini ko hit kiye
    return {
        "issues": [
            {
                "type": "Critical Layout Breakage",
                "element": "div.flex",
                "severity": "critical",
                "description": "Hardcoded pixel width detected on parent container. This completely destroys the responsive layout on mobile screen dimensions.",
                "fixSuggestion": "Replace style={{ width: '1000px' }} with responsive Tailwind utility classes like w-full max-w-5xl.",
                "oldCode": "style={{ width: '1000px', height: '200px' }}",
                "fixedCode": "className='w-full max-w-5xl h-52'"
            },
            {
                "type": "Tailwind Class Conflict",
                "element": "div.flex",
                "severity": "warning",
                "description": "Multiple padding utilities (class-conflict-px-4-px-8) are conflicting on the same element.",
                "fixSuggestion": "Remove duplicate padding utility classes and keep only one standard spacing helper.",
                "oldCode": "class-conflict-px-4-px-8 class-conflict-p-2-p-4",
                "fixedCode": "px-4 py-2"
            }
        ]
    };
};
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
