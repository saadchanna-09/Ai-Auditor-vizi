// ✅ UPGRADED: Backend/index.js
// Added: /api/audit-url route (Axios + Cheerio DOM scraper)
// Kept: /api/audit route (your existing codeStream endpoint — unchanged)
// Fixed: express.json limit raised for large code files

import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import { analyzeSourceCode } from "./services/aiService.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" })); // Raised from default 100kb

// ─── EXISTING ROUTE (unchanged — your extension already hits this) ─────────────
app.post("/api/audit", async (req, res) => {
  const { codeStream } = req.body;
  console.log(`🚀 Audit request received (${codeStream ? codeStream.length : 0} chars). Processing...`);

  try {
    const result = await analyzeSourceCode(codeStream);
    return res.json(result);
  } catch (error) {
    console.error("❌ Audit route error:", error.message);
    return res.status(500).json({ issues: [] });
  }
});

// ─── NEW ROUTE: URL Scraper (Phase 2) ──────────────────────────────────────────
// Frontend sends: { url: "https://example.com" }
// Response: { issues: [...], scrapeStats: { originalSize, cleanSize, reduction } }

// Tags to fully remove (heavy / not relevant to layout audit)
const STRIP_TAGS = [
  "script", "style", "link", "svg", "img", "video",
  "audio", "iframe", "canvas", "noscript", "head",
];

// Only keep layout-relevant attributes
const KEEP_ATTRS = new Set([
  "class", "id", "style", "role", "aria-label", "aria-hidden",
  "aria-expanded", "aria-controls", "tabindex", "type", "placeholder",
  "alt", "for", "name", "href",
]);

app.post("/api/audit-url", async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Valid http/https URL required" });
  }

  try {
    // Step 1: Fetch the page
    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ViziAudit/1.0)",
        "Accept": "text/html",
      },
      maxContentLength: 5 * 1024 * 1024,
    });

    const rawHtml = response.data;

    // Step 2: Clean with Cheerio
    const $ = cheerio.load(rawHtml);

    // Remove heavy tags
    STRIP_TAGS.forEach((tag) => $(tag).remove());

    // Strip non-layout attributes
    $("*").each((_, el) => {
      const attrs = el.attribs || {};
      Object.keys(attrs).forEach((attr) => {
        if (!KEEP_ATTRS.has(attr)) delete el.attribs[attr];
      });
      // Remove data: URIs
      if (el.attribs.src?.startsWith("data:")) delete el.attribs.src;
      if (el.attribs.href?.startsWith("data:")) delete el.attribs.href;
    });

    // Remove whitespace-only text nodes
    $("*").contents().filter(function () {
      return this.type === "text" && this.data.trim() === "";
    }).remove();

    const cleanHtml = $.html("body") || $.html();

    const scrapeStats = {
      originalSize: Buffer.byteLength(rawHtml, "utf8"),
      cleanSize: Buffer.byteLength(cleanHtml, "utf8"),
      reduction: `${Math.round((1 - cleanHtml.length / rawHtml.length) * 100)}%`,
    };

    console.log(`🌐 URL scraped: ${url} | ${scrapeStats.reduction} size reduction → ${scrapeStats.cleanSize} chars`);

    // Step 3: Run AI audit on clean DOM
    const auditResult = await analyzeSourceCode(cleanHtml);

    return res.json({
      ...auditResult,
      scrapeStats,
      url,
    });

  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      return res.status(400).json({ error: "Could not reach this URL. Make sure it is publicly accessible." });
    }
    if (err.response?.status === 403) {
      return res.status(400).json({ error: "This site blocks scrapers (403). Paste the code directly instead." });
    }
    console.error("❌ /api/audit-url error:", err.message);
    return res.status(500).json({ error: "URL audit failed", detail: err.message });
  }
});

// ─── HEALTH CHECK (Render/Railway/Vercel need this) ───────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ─── START (your exact existing logic) ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 ViziAudit backend running on port ${PORT}`);
  });
}

export default app;
