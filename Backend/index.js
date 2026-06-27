import express from "express";
import cors from "cors";
import { analyzeSourceCode } from "./services/aiService.js";

const app = express();

// All origins allowed taake extension bina CORS block ke hit kare
app.use(cors({ origin: "*" }));
app.use(express.json());

app.post("/api/audit", async (req, res) => {
    const { codeStream } = req.body;
    console.log(`🚀 Connection Stable! Received stream for audit (${codeStream ? codeStream.length : 0} chars). Processing...`);
    
    try {
        const result = await analyzeSourceCode(codeStream);
        return res.json(result);
    } catch (error) {
        console.error("❌ Route processing error:", error.message);
        return res.status(500).json({ issues: [] });
    }
});

// 🔥 DYNAMIC PORT BINDING FOR CLOUD HOSTING
const PORT = process.env.PORT || 5000;
// 🔥 FIXED FOR VERCEL: Only listen if NOT running on Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running locally on port ${PORT}`);
    });
}

module.exports = app;
