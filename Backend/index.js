// ================================================================
// ViziAudit v3 — Backend/index.js
// New: /api/audit-url (Cheerio scraper)
// New: In-memory cache (same code = instant response)
// New: Rate limiting (abuse prevention for FYP demo)
// New: /api/health with version info
// ================================================================

import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { analyzeSourceCode } from "./services/aiService.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// ================================================================
// IN-MEMORY CACHE — same code submitted twice = instant response
// Cache key = SHA256 of codeStream. TTL = 10 minutes.
// ================================================================
const auditCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function getFromCache(key) {
  const entry = auditCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    auditCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Keep cache small (max 50 entries)
  if (auditCache.size >= 50) {
    const firstKey = auditCache.keys().next().value;
    auditCache.delete(firstKey);
  }
  auditCache.set(key, { data, timestamp: Date.now() });
}

// ================================================================
// SIMPLE RATE LIMITER — max 20 requests per IP per minute
// ================================================================
const rateMap = new Map();

function rateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReq = 20;

  const entry = rateMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > windowMs) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count++;
  }

  rateMap.set(ip, entry);

  if (entry.count > maxReq) {
    return res.status(429).json({
      error: "Rate limit exceeded. Max 20 requests per minute.",
      retryAfter: Math.ceil((windowMs - (now - entry.start)) / 1000),
    });
  }
  next();
}

// ================================================================
// ROUTE 1: /api/audit — Code paste (existing, upgraded)
// ================================================================
app.post("/api/audit", rateLimiter, async (req, res) => {
  const { codeStream } = req.body;

  if (!codeStream || typeof codeStream !== "string" || codeStream.trim().length < 5) {
    return res.status(400).json({ error: "codeStream is required (minimum 5 characters)" });
  }

  const code = codeStream.trim();
  console.log(`🚀 /api/audit received: ${code.split("\n").length} lines, ${code.length} chars`);

  // Check cache first
  const cacheKey = getCacheKey(code);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log("⚡ Cache hit — returning instant result");
    return res.json({ ...cached, cached: true });
  }

  try {
    const result = await analyzeSourceCode(code);
    setCache(cacheKey, result);
    return res.json(result);
  } catch (error) {
    console.error("❌ /api/audit error:", error.message);
    return res.status(500).json({
      detectedFramework: "unknown",
      totalIssues: 0,
      issues: [],
      error: "Audit engine failed. Please try again.",
    });
  }
});

// ================================================================
// ROUTE 2: /api/audit-url — Live URL scraper + audit
// ================================================================
const STRIP_TAGS = ["script", "style", "link", "svg", "img", "video", "audio", "iframe", "canvas", "noscript"];
const KEEP_ATTRS = new Set(["class", "id", "style", "role", "aria-label", "aria-hidden",
  "aria-expanded", "aria-controls", "tabindex", "type", "placeholder", "alt", "for", "name", "href"]);

app.post("/api/audit-url", rateLimiter, async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Valid http/https URL required" });
  }

  try {
    const response = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ViziAudit/3.0)", Accept: "text/html" },
      maxContentLength: 5 * 1024 * 1024,
    });

    const $ = cheerio.load(response.data);
    STRIP_TAGS.forEach((tag) => $(tag).remove());

    $("*").each((_, el) => {
      const attrs = el.attribs || {};
      Object.keys(attrs).forEach((attr) => {
        if (!KEEP_ATTRS.has(attr)) delete el.attribs[attr];
      });
      if (el.attribs.src?.startsWith("data:")) delete el.attribs.src;
    });

    const cleanHtml = $.html("body") || $.html();
    const scrapeStats = {
      originalSize: Buffer.byteLength(response.data, "utf8"),
      cleanSize: Buffer.byteLength(cleanHtml, "utf8"),
      reduction: `${Math.round((1 - cleanHtml.length / response.data.length) * 100)}%`,
    };

    console.log(`🌐 Scraped ${url}: ${scrapeStats.reduction} reduction → ${scrapeStats.cleanSize} chars`);

    const auditResult = await analyzeSourceCode(cleanHtml);
    return res.json({ ...auditResult, scrapeStats, url });

  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      return res.status(400).json({ error: "Cannot reach this URL. Make sure it is publicly accessible." });
    }
    if (err.response?.status === 403) {
      return res.status(400).json({ error: "Site blocks scrapers (403). Paste the code directly instead." });
    }
    console.error("❌ /api/audit-url error:", err.message);
    return res.status(500).json({ error: "URL audit failed", detail: err.message });
  }
});

// ================================================================
// ROUTE 3: /health — Status check with version
// ================================================================
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    version: "3.0.0",
    uptime: Math.floor(process.uptime()),
    cacheEntries: auditCache.size,
    timestamp: new Date().toISOString(),
  });
});

// ================================================================
// START
// ================================================================
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`🚀 ViziAudit v3 backend running on port ${PORT}`));
}

export default app;
