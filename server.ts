import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import compression from "compression";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { generateInitialsAvatar, sanitizeAvatarUrl } from "./src/utils/avatar";
import { getCanonicalPlan, isValidPlan, calculateDiscount, TataPlan } from "./src/plans";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Local development .env file loader (jika file .env ada di disk, muat variabel tanpa menimpa yang sudah diset di runtime)
const localEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  try {
    const envRaw = fs.readFileSync(localEnvPath, 'utf-8');
    for (const line of envRaw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.substring(0, eqIdx).trim();
        let v = trimmed.substring(eqIdx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  } catch (err) {
    console.warn('[Tata Config] Gagal membaca file .env lokal:', err);
  }
}

// Security: In-Memory IP Rate Limiter to prevent Bot/DDoS abuse
const apiRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_MINUTE = process.env.NODE_ENV === 'production' ? 60 : 1000; // 60 req/min di produksi, 1000 di dev/test

function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
  const ip = rawIp.split(',')[0].trim();
  const now = Date.now();
  const clientData = apiRateLimitMap.get(ip);

  if (!clientData || now > clientData.resetTime) {
    apiRateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (clientData.count >= MAX_REQUESTS_PER_MINUTE) {
    res.setHeader('Retry-After', Math.ceil((clientData.resetTime - now) / 1000));
    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: "Terlalu banyak permintaan API. Silakan tunggu 1 menit sebelum mencoba lagi. / Too many API requests. Please wait a minute."
    });
  }

  clientData.count += 1;
  next();
}

// Utility to redact & obfuscate any API keys from string outputs/errors
function sanitizeApiKeySecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/sk-[A-Za-z0-9_-]{30,}/g, "[REDACTED_API_KEY]")
    .replace(/xai-[A-Za-z0-9_-]{30,}/g, "[REDACTED_XAI_KEY]")
    .replace(/gsk_[A-Za-z0-9_-]{30,}/g, "[REDACTED_GROQ_KEY]")
    .replace(/sk-or-[A-Za-z0-9_-]{30,}/g, "[REDACTED_OPENROUTER_KEY]");
}

// =========================================================================
// SESSION & AUTH SECRET CONFIGURATION VALIDATION
// =========================================================================

// Validasi konfigurasi SESSION_SECRET (Sesi Pengguna - Wajib >= 32 karakter & berbeda dari ADMIN_SESSION_SECRET)
function checkSessionSecretConfig(): { valid: boolean; error?: string; envName?: string } {
  const raw = process.env.SESSION_SECRET?.trim() || "tata_user_session_secret_default_super_secure_key_2026_safe_v1";
  if (raw.length < 32) {
    return { 
      valid: false, 
      error: 'SESSION_SECRET terlalu pendek (wajib minimal 32 karakter).', 
      envName: 'SESSION_SECRET' 
    };
  }
  const adminRaw = process.env.ADMIN_SESSION_SECRET?.trim() || "tata_admin_session_secret_default_super_secure_key_2026_safe_v1";
  if (raw === adminRaw) {
    return { 
      valid: false, 
      error: 'SESSION_SECRET tidak boleh sama dengan ADMIN_SESSION_SECRET.', 
      envName: 'SESSION_SECRET' 
    };
  }
  return { valid: true };
}

function getUserSessionSecret(): string {
  const custom = process.env.SESSION_SECRET?.trim();
  if (custom && custom.length >= 32) return custom;
  return "tata_user_session_secret_default_super_secure_key_2026_safe_v1";
}

// Validasi konfigurasi ADMIN_SESSION_SECRET (Sesi Admin - Wajib >= 32 karakter & berbeda dari SESSION_SECRET)
function checkAdminSessionSecretConfig(): { valid: boolean; error?: string; envName?: string } {
  const raw = process.env.ADMIN_SESSION_SECRET?.trim() || "tata_admin_session_secret_default_super_secure_key_2026_safe_v1";
  if (raw.length < 32) {
    return { 
      valid: false, 
      error: 'ADMIN_SESSION_SECRET terlalu pendek (wajib minimal 32 karakter).', 
      envName: 'ADMIN_SESSION_SECRET' 
    };
  }
  const userRaw = process.env.SESSION_SECRET?.trim() || "tata_user_session_secret_default_super_secure_key_2026_safe_v1";
  if (raw === userRaw) {
    return { 
      valid: false, 
      error: 'ADMIN_SESSION_SECRET tidak boleh sama dengan SESSION_SECRET.', 
      envName: 'ADMIN_SESSION_SECRET' 
    };
  }
  return { valid: true };
}

function getAdminSessionSecret(): string {
  const custom = process.env.ADMIN_SESSION_SECRET?.trim();
  if (custom && custom.length >= 32) return custom;
  return "tata_admin_session_secret_default_super_secure_key_2026_safe_v1";
}

// Body parsers
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Apply Rate Limiter to API routes
app.use("/api", apiRateLimiter);

// Sesi Guard: Cegah akses dari akun yang diblokir di satu tempat terpusat
app.use("/api", async (req, res, next) => {
  const p = req.path;
  // Lewatkan endpoint publik, admin, developer test, webhook, health, dan alur login awal
  if (
    p.startsWith("/admin") ||
    p.startsWith("/dev") ||
    p === "/health" ||
    p === "/cms/content" ||
    p === "/auth/google-client-id" ||
    p === "/account/request-otp" ||
    p === "/account/verify-otp" ||
    p === "/account/google-auth" ||
    p === "/payment/midtrans-webhook" ||
    p === "/account/logout"
  ) {
    return next();
  }

  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    const session = await getSession(token);
    if (session && session.email) {
      const account = await getAccount(session.email);
      if (account && account.isBlocked) {
        return res.status(403).json({
          error: "account_blocked",
          message: "Akun diblokir",
          reason: account.blockedReason || "Akun Anda telah dinonaktifkan oleh administrator."
        });
      }
    }
  } catch (err) {
    console.warn("[Tata Session Guard] Error checking blocked status:", err);
  }

  next();
});

// Compression
app.use(compression());

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
    hsts: false,
    dnsPrefetchControl: { allow: false },
    frameguard: false,
    hidePoweredBy: true,
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: false,
  })
  );

  // Serve security headers & permissions policy
  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=*, microphone=(), geolocation=(), interest-cohort=()");
    next();
  });

  app.get("/api/health", (req, res) => {
    const hasRedis = Boolean(
      (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim() &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
    );
    res.json({
      status: "ok",
      app: "Tata",
      mode: "offline-first",
      storage: hasRedis ? "upstash_redis" : "memory_fallback"
    });
  });

  app.get("/.well-known/security.txt", (req, res) => {
    res.type("text/plain");
    res.send(
      `Contact: mailto:security@tata.example.com\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en, id\n`
    );
  });

  // Self-uninstalling Service Worker only when emergency PURGE_PWA_CACHE is explicitly set
  if (process.env.PURGE_PWA_CACHE === "true") {
    console.warn("[PWA] Emergency PURGE_PWA_CACHE enabled. Overriding /sw.js with uninstaller.");
    const uninstallSW = (req: express.Request, res: express.Response) => {
      res.type("application/javascript");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(`
        self.addEventListener('install', (e) => {
          self.skipWaiting();
        });
        self.addEventListener('activate', (e) => {
          self.registration.unregister()
            .then(() => self.clients.matchAll())
            .then((clients) => {
              clients.forEach(client => {
                if (client.navigate) {
                  client.navigate(client.url);
                }
              });
            });
        });
      `);
    };

    app.get("/sw.js", uninstallSW);
    app.get("/dev-sw.js", uninstallSW);
  }

  // Helper to lazy-initialize GoogleGenAI
  function getGeminiClient(customKey?: string) {
    const key = customKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    const cleanKey = String(key).trim();
    return new GoogleGenAI({
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // Helper to call generateContent with model fallbacks to handle 503 high demand gracefully
  async function generateContentWithFallback(ai: any, options: {
    contents: any;
    config?: any;
    models?: string[];
  }) {
    const modelsToTry = options.models || [
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];
    let lastError: any = null;
    let quotaError: any = null;

    for (const model of modelsToTry) {
      try {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        console.log(`[Google Gemini API Request]:`, {
          url: targetUrl,
          model: model,
          contentsLength: options.contents?.length,
          hasConfig: !!options.config,
        });

        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });

        console.log(`[Google Gemini API Response Success]:`, {
          model,
          status: 200,
          responseLength: response.text ? response.text.length : 0,
        });

        (response as any).modelUsed = model;
        return response;
      } catch (err: any) {
        const errMsg = err.message || String(err);
        const errStatus = err.status || err.statusCode || "UNKNOWN";
        
        console.error(`[Google Gemini API Response Error]: Model ${model} failed with status ${errStatus}: ${errMsg.substring(0, 150)}...`);
        
        lastError = err;
        lastError.model = model;
        
        // If it's explicitly an API key authentication error, throw immediately so we don't spam the API
        if (
          errStatus === 401 ||
          errMsg.includes("API_KEY_INVALID") ||
          errMsg.includes("API key not valid") ||
          errMsg.includes("GEMINI_API_KEY_MISSING")
        ) {
          throw err;
        }

        // If it's a quota error, save it so we can throw it instead of a 404 if all models fail
        if (errStatus === 429 || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
           quotaError = err;
        }
      }
    }
    
    if (quotaError) throw quotaError;
    if (lastError) {
      lastError.message = `[${lastError.model}] ${lastError.message}`;
      throw lastError;
    }
    throw new Error("All models failed");
  }

  
  function getDefaultModel(provider: string): string {
    switch(provider) {
      case 'gemini': return 'gemini-3.6-flash';
      case 'grok': return 'grok-2-latest';
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-3-5-sonnet-latest';
      case 'groq': return 'llama-3.3-70b-versatile';
      case 'openrouter': return 'google/gemini-2.0-flash-001';
      default: return 'unknown';
    }
  }

  function detectProvider(apiKey: string): 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'grok' {
    const key = apiKey.trim();
    if (key.startsWith("xai-") || key.toLowerCase().includes("grok")) {
      return 'grok';
    }
    if (key.startsWith("AIzaSy") || key.startsWith("AQ") || key.startsWith("AI")) {
      return 'gemini';
    }
    if (key.startsWith("sk-ant-")) {
      return 'anthropic';
    }
    if (key.startsWith("sk-or-")) {
      return 'openrouter';
    }
    if (key.startsWith("gsk_")) {
      return 'groq';
    }
    if (key.startsWith("sk-")) {
      return 'openai';
    }
    return 'gemini'; // Default to gemini
  }

  async function testApiKeyWithProvider(apiKey: string, provider: string, lang: string): Promise<void> {
    const cleanKey = apiKey.trim();
    if (provider === 'grok') {
      let res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanKey}`,
            "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
          },
          body: JSON.stringify({
            model: "grok-beta",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
          })
        });
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `xAI Grok API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
          else if (parsed?.error) errMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
    } else if (provider === 'gemini') {
      const ai = getGeminiClient(cleanKey);
      await generateContentWithFallback(ai, {
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
        config: { maxOutputTokens: 5 }
      });
    } else if (provider === 'openai') {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `OpenAI API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
    } else if (provider === 'anthropic') {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": cleanKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 5,
          messages: [{ role: "user", content: "Hello" }]
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Anthropic API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
    } else if (provider === 'groq') {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Groq API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
    } else if (provider === 'openrouter') {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `OpenRouter API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
    }
  }

  async function handleChatWithProvider(
    apiKey: string,
    provider: string,
    messages: any[],
    systemInstruction: string,
    lang: string,
    aiMode: 'lite' | 'pro' = 'pro'
  ): Promise<{reply: string, modelUsed: string}> {
    const cleanKey = apiKey.trim();
    if (provider === 'grok') {
      const formattedMessages = [
        { role: "system", content: systemInstruction },
        ...(messages || []).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content || ""
        }))
      ];
      let grokModel = aiMode === 'lite' ? "grok-beta" : "grok-2-latest";
      let res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: grokModel,
          messages: formattedMessages,
          temperature: aiMode === 'lite' ? 0.7 : 0.8
        })
      });

      if (!res.ok) {
        grokModel = "grok-beta";
        res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanKey}`,
            "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
          },
          body: JSON.stringify({
            model: grokModel,
            messages: formattedMessages,
            temperature: 0.8
          })
        });
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `xAI Grok API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
      const data = await res.json();
      return { reply: data?.choices?.[0]?.message?.content || "", modelUsed: `Tata ${aiMode === 'lite' ? 'Lite' : 'Pro'} (${data?.model || grokModel})` };
    } else if (provider === 'gemini') {
      const ai = getGeminiClient(cleanKey);
      const formattedContents = (messages || []).map((m: any) => {
        const parts: any[] = [];
        if (m.content) {
          parts.push({ text: m.content });
        }
        if (m.images && Array.isArray(m.images)) {
          for (const img of m.images) {
            if (img && img.data) {
              const rawData = String(img.data);
              const cleanData = rawData.includes(';base64,') ? rawData.split(';base64,')[1] : rawData;
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || 'image/png',
                  data: cleanData
                }
              });
            }
          }
        }
        if (parts.length === 0) {
          parts.push({ text: "" });
        }
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      const modelsToUse = aiMode === 'lite'
        ? ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"]
        : ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

      const response = await generateContentWithFallback(ai, {
        contents: formattedContents,
        models: modelsToUse,
        config: {
          systemInstruction,
          temperature: aiMode === 'lite' ? 0.7 : 0.8,
        }
      });
      const resolvedModel = (response as any).modelUsed || (aiMode === 'lite' ? "gemini-3.1-flash-lite" : "gemini-3.6-flash");
      return { reply: response.text || "", modelUsed: `Tata ${aiMode === 'lite' ? 'Lite' : 'Pro'} (${resolvedModel})` };
    } else if (provider === 'openai') {
      const formattedMessages = [
        { role: "system", content: systemInstruction },
        ...(messages || []).map((m: any) => {
          if (m.images && Array.isArray(m.images) && m.images.length > 0) {
            const parts: any[] = [{ type: "text", text: m.content || "" }];
            for (const img of m.images) {
              if (img && img.data) {
                parts.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${img.mimeType || 'image/png'};base64,${img.data}`
                  }
                });
              }
            }
            return {
              role: m.role === 'user' ? 'user' : 'assistant',
              content: parts
            };
          }
          return {
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content || ""
          };
        })
      ];
      const modelToUse = aiMode === 'lite' ? "gpt-4o-mini" : "gpt-4o";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: formattedMessages,
          temperature: aiMode === 'lite' ? 0.7 : 0.8
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `OpenAI API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
      const data = await res.json();
      return { reply: data?.choices?.[0]?.message?.content || "", modelUsed: `Tata ${aiMode === 'lite' ? 'Lite' : 'Pro'} (${data?.model || modelToUse})` };
    } else if (provider === 'anthropic') {
      const formattedMessages = (messages || []).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || ""
      }));
      const modelToUse = aiMode === 'lite' ? "claude-3-5-haiku-latest" : "claude-3-5-sonnet-latest";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": cleanKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: modelToUse,
          max_tokens: 4096,
          system: systemInstruction,
          messages: formattedMessages,
          temperature: aiMode === 'lite' ? 0.7 : 0.8
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Anthropic API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
      const data = await res.json();
      return { reply: data?.content?.[0]?.text || "", modelUsed: `Tata ${aiMode === 'lite' ? 'Lite' : 'Pro'} (${data?.model || modelToUse})` };
    } else if (provider === 'groq') {
      const formattedMessages = [
        { role: "system", content: systemInstruction },
        ...(messages || []).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content || ""
        }))
      ];
      const modelToUse = aiMode === 'lite' ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: formattedMessages,
          temperature: aiMode === 'lite' ? 0.7 : 0.8
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `Groq API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
      const data = await res.json();
      return { reply: data?.choices?.[0]?.message?.content || "", modelUsed: `Tata ${aiMode === 'lite' ? 'Lite' : 'Pro'} (${data?.model || modelToUse})` };
    } else if (provider === 'openrouter') {
      const formattedMessages = [
        { role: "system", content: systemInstruction },
        ...(messages || []).map((m: any) => {
          if (m.images && Array.isArray(m.images) && m.images.length > 0) {
            const parts: any[] = [{ type: "text", text: m.content || "" }];
            for (const img of m.images) {
              if (img && img.data) {
                parts.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${img.mimeType || 'image/png'};base64,${img.data}`
                  }
                });
              }
            }
            return {
              role: m.role === 'user' ? 'user' : 'assistant',
              content: parts
            };
          }
          return {
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content || ""
          };
        })
      ];
      const modelToUse = aiMode === 'lite' ? "google/gemini-2.0-flash-lite-001" : "google/gemini-2.0-flash-001";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanKey}`,
          "Content-Type": "application/json", "HTTP-Referer": "https://tata.app", "X-Title": "Tata AI (Think. Act. Track. Advance.)"
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: formattedMessages,
          temperature: aiMode === 'lite' ? 0.7 : 0.8
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `OpenRouter API error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error?.message) errMsg = parsed.error.message;
        } catch (_) {}
        const err: any = new Error(errMsg); err.status = res.status; throw err;
      }
      const data = await res.json();
      return { reply: data?.choices?.[0]?.message?.content || "", modelUsed: `Tata ${aiMode === 'lite' ? 'Lite' : 'Pro'} (${data?.model || modelToUse})` };
    }
    return { reply: "", modelUsed: "unknown" };
  }

  function parseGeminiError(error: any, lang: string): string {
    let msg = error.message || String(error);
    
    // If the error contains a JSON object (typical for @google/genai SDK)
    if (typeof msg === 'string') {
      const firstBrace = msg.indexOf("{");
      const lastBrace = msg.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          const jsonStr = msg.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(jsonStr);
          if (parsed?.error?.message) {
            msg = parsed.error.message;
          } else if (parsed?.message) {
            msg = parsed.message;
          }
        } catch (_) {}
      }
    }

    // Always sanitize any raw secrets or API keys from error message string
    msg = sanitizeApiKeySecrets(msg);

    const raw = error.status || error.statusCode || 500; const errStatus = (typeof raw === "number" && !isNaN(raw)) ? raw : 500;
    const isNotFoundError = 
      errStatus === 404; 

    if (isNotFoundError) {
      return lang === 'id'
        ? `Model atau Endpoint API tidak ditemukan (Error 404): ${msg}. Harap pastikan API Key mendukung model ini.`
        : `API Model or Endpoint not found (Error 404): ${msg}. Please ensure your API Key supports this model.`;
    }
    
    // Translate common errors into helpful Indonesian / English messages
    if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID") || msg.includes("API key") || msg.includes("GEMINI_API_KEY_MISSING") || errStatus === 401) {
      return lang === 'id' 
        ? `Error 401: API Key tidak valid atau ditolak oleh penyedia layanan. Detail: ${msg}`
        : `Error 401: Invalid API Key or rejected by provider. Detail: ${msg}`;
    }
    
    if (msg.includes("Insufficient credits") || errStatus === 402) {
      return lang === 'id'
        ? `Error 402: Saldo (credits) OpenRouter Anda habis atau belum pernah diisi. Silakan isi saldo di https://openrouter.ai/settings/credits. Detail: ${msg}`
        : `Error 402: Insufficient OpenRouter credits. Please purchase credits at https://openrouter.ai/settings/credits. Detail: ${msg}`;
    }
    
    if (msg.includes("Quota exceeded") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("limit") || msg.includes("quota") || errStatus === 429) {
      return lang === 'id'
        ? `Error 429: Batas kuota API Key terlampaui atau Anda terkena rate limit. Detail: ${msg}`
        : `Error 429: API Key quota exceeded or rate limited. Detail: ${msg}`;
    }
    
    if (msg.includes("experiencing high demand") || msg.includes("UNAVAILABLE") || errStatus === 503) {
      return lang === 'id'
        ? `Error 503: Layanan AI sedang sibuk. Detail: ${msg}`
        : `Error 503: The AI service is currently experiencing high demand. Detail: ${msg}`;
    }

    if (msg.includes("User location is not supported")) {
      return lang === 'id'
        ? `Lokasi Anda saat ini tidak didukung oleh layanan API Google Gemini.`
        : `Your current location is not supported by Google Gemini API.`;
    }
    
    return lang === 'id' ? `Gagal terhubung (Error ${errStatus}): ${msg}` : `Connection failed (Error ${errStatus}): ${msg}`;
  }

  // =========================================================================
  // TATA AI QUOTA, RATE LIMITS & AUTHENTICATION ENGINE
  // =========================================================================
  const TATA_AI_QUOTA_LITE = 7;
  const TATA_AI_QUOTA_PRO = 20;
  const TATA_AI_QUOTA_PRO_MAX = 30;

  function getAccountMaxDailyCredits(account: ServerTataAccount | null): number {
    if (!account || !account.isPremium) {
      return TATA_AI_QUOTA_LITE; // Tata Lite: 7 per hari
    }

    // Cek apakah masa langganan sudah kedaluwarsa
    if (account.premiumType !== 'lifetime') {
      const expTime = account.premiumExpiresAt ? new Date(account.premiumExpiresAt).getTime() : NaN;
      if (isNaN(expTime) || Date.now() > expTime) {
        return TATA_AI_QUOTA_LITE;
      }
    }

    // Cek masa trial jika ada
    if (account.isTrial && account.trialExpiresAt) {
      if (Date.now() > new Date(account.trialExpiresAt).getTime()) {
        return TATA_AI_QUOTA_LITE;
      }
    }

    const pType = (account.premiumType || '').toLowerCase();
    const hasProMaxTxn = (account.transactions || []).some(t => 
      (t.planName && t.planName.toLowerCase().includes('max')) || 
      (t.orderId && t.orderId.toLowerCase().includes('promax'))
    );

    if (pType.includes('pro_max') || pType.includes('promax') || hasProMaxTxn) {
      return TATA_AI_QUOTA_PRO_MAX; // Tata Pro Max: 30 per hari
    }

    return TATA_AI_QUOTA_PRO; // Tata Pro: 20 per hari
  }

  function getWibDateString(): string {
    // Waktu Indonesia Barat (WIB) = UTC + 7 Jam
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibDate = new Date(utcMs + (7 * 3600000));
    return wibDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }

  const aiQuotaMem = new Map<string, number>();

  async function getAiUsageToday(email: string, dateWib: string): Promise<number> {
    const normalized = email.trim().toLowerCase();
    const key = `tata:ai:quota:${normalized}:${dateWib}`;
    const redis = getRedis();
    if (redis) {
      try {
        const val = await redis.get<number | string>(key);
        if (val !== null && val !== undefined) {
          return typeof val === 'number' ? val : (parseInt(String(val), 10) || 0);
        }
        return 0;
      } catch (err) {
        console.warn("[Tata AI Quota] Redis get error:", err);
      }
    }
    return aiQuotaMem.get(key) || 0;
  }

  async function incrementAiUsageToday(email: string, dateWib: string): Promise<number> {
    const normalized = email.trim().toLowerCase();
    const key = `tata:ai:quota:${normalized}:${dateWib}`;
    const redis = getRedis();
    if (redis) {
      try {
        const newVal = await redis.incr(key);
        await redis.expire(key, 172800); // 48 jam auto cleanup
        return newVal;
      } catch (err) {
        console.warn("[Tata AI Quota] Redis incr error:", err);
      }
    }
    const cur = aiQuotaMem.get(key) || 0;
    const next = cur + 1;
    aiQuotaMem.set(key, next);
    return next;
  }

  const aiRateLimitsMem = new Map<string, { count: number; resetAt: number }>();
  function checkAiRateLimit(email: string, ip: string): boolean {
    const now = Date.now();
    const key = `${email.trim().toLowerCase()}_${ip}`;
    const record = aiRateLimitsMem.get(key);
    if (!record || now > record.resetAt) {
      aiRateLimitsMem.set(key, { count: 1, resetAt: now + 60000 });
      return false;
    }
    record.count += 1;
    // Maksimal 30 request/menit per akun & IP
    if (record.count > 30) {
      return true;
    }
    return false;
  }

  async function verifyAiSession(
    req: express.Request, 
    res: express.Response,
    options?: { allowByokGuest?: boolean }
  ): Promise<{ session: SessionRecord | null; account: ServerTataAccount | null } | null> {
    const token = extractBearerToken(req);
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    const hasCustomKey = Boolean(
      (req.body?.customApiKey && String(req.body.customApiKey).trim()) ||
      (req.body?.apiKey && String(req.body.apiKey).trim())
    );

    if (!token) {
      if (options?.allowByokGuest && hasCustomKey) {
        // BYOK Guest access: rate limit by IP to prevent flooding
        if (checkAiRateLimit(`byok_guest_${clientIp}`, clientIp)) {
          res.status(429).json({
            error: "rate_limit_exceeded",
            message: "Terlalu banyak permintaan AI dalam waktu singkat. Silakan tunggu 1 menit sebelum mencoba lagi."
          });
          return null;
        }
        return { session: null, account: null };
      }

      res.status(401).json({
        error: "unauthorized",
        message: "Sesi otentikasi tidak ditemukan. Silakan masuk dengan Akun Google terlebih dahulu untuk menggunakan Tata AI."
      });
      return null;
    }

    const session = await getSession(token);
    if (!session) {
      if (options?.allowByokGuest && hasCustomKey) {
        if (checkAiRateLimit(`byok_guest_${clientIp}`, clientIp)) {
          res.status(429).json({
            error: "rate_limit_exceeded",
            message: "Terlalu banyak permintaan AI dalam waktu singkat. Silakan tunggu 1 menit sebelum mencoba lagi."
          });
          return null;
        }
        return { session: null, account: null };
      }
      res.status(401).json({
        error: "unauthorized",
        message: "Sesi Anda tidak valid atau telah kedaluwarsa. Silakan masuk kembali."
      });
      return null;
    }

    // Aturan 6: Di produksi (VERCEL atau NODE_ENV=production), jika Redis belum ada, endpoint AI membalas 503
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    const redis = getRedis();
    if (isProduction && !redis && !hasCustomKey) {
      res.status(503).json({
        error: "service_unavailable",
        message: "Layanan Tata AI sedang tidak tersedia karena konfigurasi server (Redis) belum disiapkan."
      });
      return null;
    }

    // Aturan 2: Rate limit per akun & IP
    if (checkAiRateLimit(session.email, clientIp)) {
      res.status(429).json({
        error: "rate_limit_exceeded",
        message: "Terlalu banyak permintaan AI dalam waktu singkat. Silakan tunggu 1 menit sebelum mencoba lagi."
      });
      return null;
    }

    const account = await getAccount(session.email);
    if (account && account.isBlocked) {
      res.status(403).json({
        error: "account_blocked",
        message: "Akun diblokir",
        reason: account.blockedReason || "Akun Anda telah dinonaktifkan oleh administrator."
      });
      return null;
    }
    return { session, account };
  }

  // Tata AI Quota Inquiry Endpoint
  app.get("/api/ai/quota", async (req, res) => {
    const auth = await verifyAiSession(req, res);
    if (!auth) return;

    const dateWib = getWibDateString();
    const maxCredits = getAccountMaxDailyCredits(auth.account);
    const used = await getAiUsageToday(auth.session.email, dateWib);
    const creditsLeft = Math.max(0, maxCredits - used);

    res.json({
      success: true,
      email: auth.session.email,
      dateWIB: dateWib,
      used,
      maxCredits,
      creditsLeft,
      isPremium: !!auth.account?.isPremium,
      tier: maxCredits === 30 ? "pro_max" : (maxCredits === 20 ? "pro" : "lite")
    });
  });

  // Khusus Pengujian Lingkungan Pengembangan: Simulasi Penggunaan Kuota Server
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/ai/dev-simulate-quota", async (req, res) => {
      const auth = await verifyAiSession(req, res);
      if (!auth) return;
      const dateWib = getWibDateString();
      const maxCredits = getAccountMaxDailyCredits(auth.account);
      const key = `tata:ai:quota:${auth.session.email.trim().toLowerCase()}:${dateWib}`;
      const used = typeof req.body.used === 'number' ? req.body.used : maxCredits;
      aiQuotaMem.set(key, used);
      res.json({ success: true, email: auth.session.email, used, maxCredits });
    });
  }

  // Tata AI (Think. Act. Track. Advance.) Key Testing Endpoint
  app.post("/api/ai/test-key", async (req, res) => {
    const auth = await verifyAiSession(req, res, { allowByokGuest: true });
    if (!auth) return;

    const lang = req.body.lang || 'id';
    const userLog = auth.session ? auth.session.email : "Guest (BYOK)";
    console.log(`[API /api/ai/test-key Request] Received test request from ${userLog}.`);
    try {
      const { apiKey } = req.body;
      const testKey = apiKey || process.env.GEMINI_API_KEY;
      if (!testKey) {
        console.error(`[API /api/ai/test-key Error] Missing API Key.`);
        return res.status(400).json({ error: "missing_api_key", message: "API Key tidak ditemukan." });
      }

      const provider = detectProvider(testKey);
      console.log(`[API /api/ai/test-key] Detected provider: ${provider}`);

      await testApiKeyWithProvider(testKey, provider, lang);
      res.json({ status: "ok", provider, model: getDefaultModel(provider) });
    } catch (error: any) {
      console.error(`[API /api/ai/test-key Exception]: ${error.message || String(error).substring(0, 100)}`);
      const parsedMsg = parseGeminiError(error, lang);
      const raw = error.status || error.statusCode || 400; const errStatus = (typeof raw === "number" && !isNaN(raw)) ? raw : 400;
      res.status(errStatus).json({ error: parsedMsg });
    }
  });

  // Tata AI (Think. Act. Track. Advance.) Chat Endpoint
  app.post("/api/ai/chat", async (req, res) => {
    const auth = await verifyAiSession(req, res, { allowByokGuest: true });
    if (!auth) return;

    const { messages, lang = 'id', customApiKey, personality = 'general', aiMode = 'pro', clientDateTime } = req.body;

    // Aturan 2: Batas ukuran request (maksimal 20 pesan, 8000 karakter/pesan)
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "invalid_messages", message: "Parameter messages harus berupa array pesan." });
    }
    if (messages.length > 20) {
      return res.status(413).json({ error: "too_many_messages", message: "Riwayat percakapan melebihi batas maksimal 20 pesan." });
    }
    for (const msg of messages) {
      if (msg && typeof msg.content === 'string' && msg.content.length > 8000) {
        return res.status(413).json({ error: "message_too_long", message: "Pesan percakapan melebihi batas maksimal 8.000 karakter per pesan." });
      }
    }

    const isByok = Boolean(customApiKey && String(customApiKey).trim());
    const userIdentifier = auth.session ? auth.session.email : `Guest (BYOK - ${(req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "local").split(",")[0].trim()})`;
    console.log(`[API /api/ai/chat Request] User: ${userIdentifier}, Messages: ${messages.length}, Personality: ${personality}, Tier: ${aiMode}`);
    try {
      const dateWib = getWibDateString();
      const maxCredits = auth.account ? getAccountMaxDailyCredits(auth.account) : 10;
      let currentUsed = 0;

      // Aturan 3 & 4: Jika bukan BYOK, periksa apakah kuota harian server sudah habis
      if (!isByok) {
        if (!auth.session) {
          return res.status(401).json({
            error: "unauthorized",
            message: lang === 'id'
              ? "Sesi otentikasi tidak ditemukan. Silakan masuk dengan Akun Google terlebih dahulu untuk menggunakan kuota server Tata AI."
              : "Authentication session not found. Please sign in with your Google Account to use Tata AI server quota."
          });
        }
        currentUsed = await getAiUsageToday(auth.session.email, dateWib);
        if (currentUsed >= maxCredits) {
          return res.status(429).json({
            error: "daily_quota_exceeded",
            message: lang === 'id'
              ? `Batas kuota AI harian Anda telah habis (${maxCredits} kali/hari). Kuota akan di-reset otomatis besok pada pukul 00:00 WIB. Anda juga dapat menggunakan API Key pribadi (BYOK) di Pengaturan untuk akses tanpa batas.`
              : `Your daily AI quota has been reached (${maxCredits}/day). Quota resets tomorrow at 00:00 WIB. Or use your own API Key (BYOK) in Settings for unlimited access.`,
            creditsLeft: 0,
            maxCredits
          });
        }
      }

      const activeKey = isByok ? String(customApiKey).trim() : process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(400).json({ error: "missing_api_key", message: "API Key server Tata AI belum dikonfigurasi." });
      }

      const provider = detectProvider(activeKey);
      console.log(`[API /api/ai/chat] Detected provider: ${provider}, Tier: ${aiMode}, Byok: ${isByok}`);
      
      // Compute accurate real-time date string
      const now = new Date();
      const serverDateFormattedId = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const serverDateFormattedEn = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const localDateText = clientDateTime?.localFormatted || (lang === 'id' ? serverDateFormattedId : serverDateFormattedEn);
      const timeZoneText = clientDateTime?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

      const timeContextInstruction = lang === 'id'
        ? `\n\n[INFORMASI WAKTU NYATA SAAT INI (REAL-TIME CONTEXT)]:
• Waktu & Hari Ini: ${localDateText}
• Zona Waktu Pengguna: ${timeZoneText}
• ATURAN WAKTU: Jika pengguna bertanya tentang hari ini hari apa, tanggal berapa, bulan apa, tahun berapa, atau menanyakan konteks waktu saat ini, jawablah dengan sangat tepat, cerdas, dan pasti mengacu pada waktu nyata di atas.`
        : `\n\n[REAL-TIME DATE & TIME CONTEXT]:
• Current Date & Day: ${localDateText}
• User Timezone: ${timeZoneText}
• TIME RULE: If the user asks what day it is today, what date it is, or questions current time context, answer accurately and confidently referencing the real-time info above.`;

      const honestyAndLimitsInstruction = lang === 'id'
        ? `\n\n[PRINSIP KECERDASAN, KEJUJURAN & LOGIKA ANALISIS DATA TATA AI (SANGAT PENTING)]:
1. KECERDASAN, LOGIKA MATEMATIKA & KETEPATAN MEMBACA PERIODE WAKTU:
   - PERHATIKAN DENGAN SANGAT TELITI PERIODE WAKTU DATA YANG DISEDIAKAN.
   - JIKA PENGGUNA BERTANYA TENTANG BULAN INI (CURRENT MONTH): HANYA rujuk dan analisis data dari bagian BULAN INI. DILARANG KERAS memasukkan atau menjumlahkan transaksi bulan kemarin/lalu atau total akumulasi sepanjang waktu ke dalam data bulan ini!
   - JIKA PENGGUNA BERTANYA TENTANG BULAN KEMARIN / LALU (PREVIOUS MONTH): HANYA rujuk data dari bagian BULAN KEMARIN.
   - JIKA PENGGUNA MEMINTA PERBANDINGAN: Bandingkan angka bulan kemarin dan bulan ini secara presisi dan terpisah.
   - BEDAKAN DENGAN JELAS: Saldo Riil Saat Ini (Kas Dompet, Tabungan Celengan, Pos Impian, Total Net Worth) adalah kondisi kekayaan bersih saat ini, sedangkan Arus Kas (Pemasukan & Pengeluaran) adalah pergerakan uang dalam periode tertentu.
   - VERIFIKASI ARITMATIKA & KEKAYAAN BERSIH: Total Kekayaan Bersih (Net Worth) = Kas Dompet Siap Pakai + Total Tabungan/Pos Impian. Selalu cek kembali konsistensi penjumlahan angka sebelum menulis jawaban agar tidak terjadi kontradiksi matematika.
   - Pahami maksud inti pengguna secara tajam, responsif, dan logis. Jawab secara kontekstual, jangan melantur.

2. PENJELASAN BATASAN DATA & PRIVASI (OFFLINE-FIRST):
   - Tata AI berjalan secara stateless dan TIDAK BISA melihat/membaca database lokal pengguna (Catatan, Tugas, Keuangan, Kalender, Mood) tanpa izin pengguna.
   - Jika pengguna bertanya tentang data pribadinya (misal: "Berapa saldo saya?", "Apa tugasku hari ini?", "Catatan apa yang ada?") namun data tersebut belum disertakan dalam pesan:
     * Jelaskan secara transparan dan bangga bahwa ini demi menjaga privasi penuh pengguna (Prinsip Privacy-First & Offline-First Tata).
     * Berikan panduan ramah bahwa pengguna dapat melampirkan konteks dengan menekan tombol cepat seperti '💡 Rekomendasi Finansial AI', 'Analisis Tugas', 'Analisis Mood', atau tombol 'Tanya AI' di dalam editor catatan.

3. ANTI-HALUSINASI & KEJUJURAN PENGETAHUAN:
   - DILARANG KERAS mengarang jawaban asal, pura-pura tahu, atau mengasumsikan angka keuangan yang tidak ada dalam data.
   - Jika memang tidak mengetahui sesuatu atau data tidak tersedia, katakan secara jujur dan rendah hati bahwa data Tata AI terbatas pada pengetahuan yang tersedia dan fitur-fitur yang ada di aplikasi Tata.`
        : `\n\n[INTELLIGENCE, ACCURACY, TEMPORAL LOGIC & DATA BOUNDARIES (CRITICAL)]:
1. MATHEMATICAL PRECISION & STRICT TEMPORAL SEGREGATION:
   - PAY CLOSE ATTENTION TO THE TIME PERIOD OF DATA PROVIDED.
   - IF USER ASKS ABOUT THIS MONTH (CURRENT MONTH): ONLY reference and analyze data from the CURRENT MONTH section. STRICTLY FORBIDDEN to combine or pollute current month figures with last month's transactions or all-time cumulative totals!
   - IF USER ASKS ABOUT LAST MONTH (PREVIOUS MONTH): ONLY reference data from the PREVIOUS MONTH section.
   - IF USER ASKS FOR COMPARISON: Compare current month vs last month accurately with separate, explicit figures.
   - CLEARLY DISTINGUISH: Real-time Balances (Wallet Cash, Savings Vault, Goals, Net Worth) vs Periodic Cashflow (Income & Expenses).
   - ARITHMETIC VERIFICATION & NET WORTH: Total Net Worth = Available Wallet Cash + Total Savings (Goals/Vault). Always verify component sums before answering to avoid mathematical discrepancies.

2. DATA PRIVACY & BOUNDARIES (OFFLINE-FIRST):
   - Tata AI operates statelessly and CANNOT directly access local user databases (Notes, Tasks, Finance, Calendar, Mood) without explicit user permission.
   - If the user asks about their personal data without providing it in the prompt:
     * Explain transparently that this protects their privacy (Tata's strict Privacy-First & Offline-First commitment).
     * Explain how they can share context (e.g. tapping 'AI Financial Strategy', 'Task Analysis', 'Mood Analysis', or 'Ask AI' in note editor).

3. ANTI-HALLUCINATION & HONESTY:
   - NEVER make up fake numbers, hallucinate transactions, or invent data. If you don't have certain external facts or context, state honestly and clearly.`;

      const baseInstruction = lang === 'id' 
        ? `Anda adalah Tata AI (Think. Act. Track. Advance.), asisten pribadi pintar dan pakar terintegrasi secara eksklusif dalam aplikasi Tata. Anda bertindak sebagai life coach, pendamping produktivitas, pakar aplikasi Tata, konsultan keuangan, dan sahabat yang empatik bagi pengguna. PENTING: Dari mana pun model dasar Anda berasal (Gemini, OpenAI, Anthropic, Groq, xAI Grok, OpenRouter, dll.), identitas Anda adalah Tata AI (Think. Act. Track. Advance.).

PENGETAHUAN LENGKAP & DETAIL TENTANG SELURUH FITUR APLIKASI TATA:

1. FILOSOFI & ARSITEKTUR UTAMA:
- Offline-First: Tata dirancang untuk berjalan 100% lokal di perangkat pengguna menggunakan LocalStorage & IndexedDB browser. Tata dapat digunakan sepenuhnya tanpa internet untuk mengelola catatan, tugas, keuangan, kalender, dan mood.
- Privacy-First: Nol pelacak data pribadi, opsi bebas iklan di Tata Premium (iklan Google AdSense hanya untuk pengguna tier Free/Lite), dan tanpa server cloud database yang menyimpan data pribadi pengguna.
- User Owns Their Data: Pengguna memiliki kendali mutlak atas datanya. Data dapat di-export ke cadangan JSON atau file teks/Markdown kapan saja, serta di-import kembali secara lokal.

2. TAMPILAN, TEMA & NAVIGASI APLIKASI:
- 3 Mode Tampilan Tata:
  * Mode Lite (⚡ Tata Lite): Tampilan ultra-ringkas, hemat daya & kuota, performa super cepat, fokus pada hal esensial (Maksimal 5 kredit Tata AI/hari).
  * Mode Pro (⭐ Tata Pro): Tampilan klasik kaya fitur, dashboard statistik lengkap, kartu ringkasan komprehensif, dan animasi halus (Maksimal 15 kredit Tata AI/hari).
  * Mode Organic (🌱 Organic View): Tampilan visual kartu organik estetis dengan widget mood dan aksi cepat modern.
- Spotlight Search (Pencarian Global Instan): Pencarian fuzzy cepat (shortcut Cmd/Ctrl + K atau ikon pencarian) untuk mencari Catatan, Tugas, Transaksi Keuangan, dan Kalender secara bersamaan.
- Daily Discipline Streak: Penghitung rekor hari aktif berturut-turut saat menyelesaikan tugas harian atau mencatat mood.
- Pengingat Harian (Daily Reminder): Pengingat waktu harian otomatis sesuai jam yang diatur pengguna.
- Tombol Refresh: Membersihkan cache memori dan menyegarkan data lokal secara mulus.

3. KEAMANAN & CADANGAN DATA (SECURITY & BACKUP):
- Kunci PIN 4-Digit Lokal: Proteksi akses aplikasi dengan PIN lokal.
- Scrambled Keypad: Papan tombol PIN acak untuk mencegah orang lain mengintip pola ketikan PIN.
- Pertanyaan Pemulihan Keamanan: Pertanyaan dan jawaban rahasia jika pengguna lupa PIN.
- Cadangan Lokal Manual: Export seluruh data (Catatan, Tugas, Keuangan, Mood, Pengaturan) ke file .json terstruktur, dan Import/Restore kapan saja.
- Auto-Backup Terjadwal: Opsi pencadangan otomatis (Mati, Setiap 3 Hari, Setiap 1 Minggu, Setiap 1 Bulan) yang menghasilkan cadangan terproteksi PIN.

4. MODUL CATATAN (NOTE EDITOR & KNOWLEDGE BASE):
- Editor Markdown Kaya: Mendukung teks tebal (bold), miring (italic), coret (strikethrough), judul (H1-H3), checklist interaktif, blok kode, kutipan (blockquote), tabel, garis pemisah, dan daftar berurutan/poin.
- Lampiran Gambar / Foto: Upload foto visual yang disimpan secara lokal dalam format Base64.
- Sketsa / Canvas Drawing: Fitur menggambar bebas dan coret-coret tangan langsung di dalam catatan.
- Perekam Suara (Voice Note): Merekam catatan audio dan memutarnya kembali secara lokal.
- OCR (Scan Teks dari Foto): Ekstraksi teks otomatis dari gambar langsung ke dalam editor.
- Text-to-Speech (TTS / Audio Reader): Membacakan isi teks catatan dengan suara manusia.
- Kunci Catatan Individu (Note PIN): Mengunci catatan tertentu dengan PIN pribadi agar tidak bisa dibuka sembarang orang.
- Pengorganisasian: Folder/kategori warna-warni, tag kustom, sematkan catatan (Pinned Notes), favorit, fitur sembunyikan/arsipkan tag, dan Tong Sampah (Trash) sebelum dihapus permanen.
- Export Catatan: Simpan catatan ke format file .txt atau .md (Markdown).
- Integrasi "Tanya Tata AI": Tombol cepat di Note Editor untuk mengirim konten catatan (termasuk gambar) dengan izin pengguna (consent) ke Tata AI untuk dirangkum, dikoreksi tata bahasanya, dianalisis, atau ditanyakan.

5. MODUL TUGAS & PRODUKTIVITAS (TASK & HABIT MANAGER):
- Tipe Tugas: Tugas Biasa vs Tugas Disiplin Harian (Habit Tracker berulang dengan rekap tanggal ceklis).
- Pengaturan Lengkap: Prioritas (Rendah, Sedang, Tinggi), Tenggat Waktu (Due Date & Due Time), Sub-tugas (Checklist), dan Tag kategori.
- Matriks Eisenhower: Tampilan visual pengelompokan tugas berdasarkan Penting & Mendesak (Do First, Schedule, Delegate, Don't Do).
- Pomodoro Focus Timer: Timer produktivitas terintegrasi (25 menit fokus, 5 menit istirahat pendek, 15 menit istirahat panjang) dengan pelacak sesi fokus.
- Analisis Produktivitas Sepanjang Waktu & Pola Hari oleh Tata AI: Mampu menganalisis tingkat penyelesaian tugas (% completion rate) harian, 7 hari terakhir (mingguan), 30 hari terakhir (bulanan), dan Sepanjang Waktu (All-Time). Tata AI mendeteksi hari di mana pengguna paling sering menyelesaikan tugas (Peak Day), hari rawan gagal ceklis (Low Days), mengevaluasi tugas terlambat (Overdue), serta memberikan rekomendasi manajemen waktu reflektif.

6. MODUL KEUANGAN PRIBADI (FINANCE TRACKER):
- Pencatatan Transaksi: Pemasukan (Income) & Pengeluaran (Expense) lengkap dengan kategori, tanggal, waktu, nominal, dan catatan/deskripsi.
- Tombol Nominal Kilat (10rb, 50rb, 100rb, 500rb) dan prapembacaan teks nominal uang otomatis.
- Pos Tabungan & Impian (Multi-Savings Goals & Investment):
  * Pengguna dapat membuat banyak Pos Impian sekaligus (misal: Dana Darurat, DP Rumah, Liburan, Pensiun, Gadget).
  * 2 Mode Form: Simpel (nama & target) vs Detail Lengkap (Instrumen: Bank/Kas, Deposito Berjangka, Reksadana Pasar Uang/Pendapatan Tetap/Saham, Obligasi Negara/SBN/Sukuk, Emas; Nama Bank/Platform; Suku Bunga/Yield % p.a.; Pajak Bunga PPh %; Bunga Majemuk / Compound Interest; Kalkulator Bunga Bersih Bulanan & Tahunan; Proyeksi Nilai Tabungan saat Target Date).
  * Fitur Setor Tabungan (Deposit) & Tarik Tabungan (Withdrawal) per pos dengan proteksi saldo.
- Manajemen Hutang & Piutang (Debt & Installment Tracker):
  * Pencatatan hutang/pinjaman terstruktur: nama hutang, pihak pemberi pinjaman (lender), pokok pinjaman, nominal cicilan bulanan, frekuensi pembayaran, tanggal jatuh tempo, dan sisa hutang.
  * Fitur Bayar Angsuran / Cicilan bertahap yang otomatis memotong sisa hutang.
  * Analisis Rasio Likuiditas & Solvensi: Mengevaluasi apakah Kekayaan Bersih pengguna cukup melunasi seluruh kewajiban hutang.
- Struktur Saldo & Kekayaan Bersih:
  * Kas Dompet (Wallet Cash) = Total Pemasukan Sepanjang Waktu - Total Pengeluaran Sepanjang Waktu.
  * Total Saldo Tabungan = Total uang yang terkumpul di seluruh Pos Impian / Celengan.
  * Total Kekayaan Bersih (Net Worth) = Kas Dompet Bebas + Total Saldo Tabungan.
- Export CSV: Ekspor riwayat transaksi keuangan ke file spreadsheet (.csv).
- Rekomendasi Finansial Tata AI: Menganalisis arus kas bulanan berjalan vs historis, mengevaluasi alokasi anggaran (misal aturan 50/30/20), strategi optimasi yield tabungan/deposito, serta rencana pelunasan hutang.

7. MODUL KALENDER & AGENDA TERPADU (CALENDAR):
- Garis Waktu Terintegrasi (Unified Timeline): Menggabungkan Agenda Acara Pribadi, Tenggat Waktu Tugas (Tasks Due), dan Riwayat Pemasukan/Pengeluaran Keuangan harian dalam 1 tampilan kalender interaktif.
- Penanggalan Tambahan: Mendukung Kalender Masehi, Kalender Hijriah (Islam), dan Kalender Jawa (Pasaran: Legi, Pahing, Pon, Wage, Kliwon).
- Sinkronisasi & Export .ics: Mendukung export/import kalender berformat .ics (iCalendar standar yang kompatibel dengan Google Calendar & Apple Calendar).

8. MODUL JURNAL MOOD (MOOD & MENTAL WELLNESS):
- 5 Skala Emosi Harian: Sangat Senang (Excellent), Senang (Good), Biasa Saja (Neutral), Buruk (Bad), Sangat Buruk (Terrible).
- Catatan Refleksi Emosional: Jurnal harian untuk mencatat peristiwa atau pemicu perasaan.
- Grafik Tren Suasana Hati: Visualisasi grafik fluktuasi emosi bulanan untuk kesadaran mental (mental wellness).
- Analisis Mood Tata AI: Memberikan refleksi empatis, teknik pernapasan, dan saran jeda sejenak (mindfulness grounding).

9. MODUL PUSAT PERMAINAN (GAMES HUB):
- 6 Permainan Otak Offline:
  * 2048 (Puzzle matematika penggabungan angka)
  * Tic Tac Toe (Papan 3x3 dengan Mode Vs AI Bot Cerdas Lokal atau Mode 2 Pemain 1 Perangkat)
  * Tetris Klasik (Game susun balok retro)
  * Memory Game (Permainan asah memori mencocokkan kartu emoji)
  * Space Invaders (Arcade tembak pesawat luar angkasa retro)
  * Slide Puzzle (Game geser ubin angka 15-Puzzle)

10. SISTEM TATA AI & HAK PRIVASI:
- Tata AI (Think. Act. Track. Advance.) adalah pendamping cerdas yang berjalan secara stateless. Tata AI TIDAK BISA membaca data lokal pengguna secara diam-diam. Tata AI hanya menerima data jika pengguna secara sadar menekan tombol analisis (seperti 'Analisis Keuangan', 'Analisis Mood', 'Analisis Tugas') atau melampirkan catatan.
- Izin Sekali Pakai (Single-Use Consent): Data yang dikirimkan bersama prompt hanya diproses untuk satu kali balasan itu saja dan langsung hangus tanpa disimpan di database manapun.
- Kuota Pesan Gratis: 15 pesan gratis per hari (Mode Pro) atau 5 pesan per hari (Mode Lite), otomatis reset setiap tengah malam.
- BYOK (Bring Your Own Key): Pengguna dapat memasukkan API Key pribadi di Pengaturan untuk akses tanpa batas ke Google Gemini, OpenAI (GPT-4o), Anthropic (Claude), xAI Grok, Groq (Llama 3.3), dan OpenRouter.

11. 5 MODE KEPRIBADIAN TATA AI:
- Umum (All-Round Productivity): Asisten serba bisa, seimbang, komunikatif, dan solutif.
- Pelatih Disiplin (Discipline Coach): Tegas, anti-prokrastinasi, fokus pada eksekusi nyata, dan menjaga Daily Streak.
- Konsultan Keuangan (Financial Advisor): Rasional, analitis, bijak dalam pengelolaan kas, tabungan, dan hutang.
- Penulis & Editor (Writer & Editor): Ahli tata bahasa, merapikan struktur catatan, dan memformat dalam Markdown rapi.
- Mentor Mindfulness (Mental Wellness Coach): Empatis, hangat, menenangkan, dan mendengarkan aktif.

12. KONTAK & DUKUNGAN RESMI TATA:
- Email Resmi Tata: notofpg@gmail.com (Gunakan email ini jika pengguna bertanya tentang kontak tim pengembang, bantuan resmi, atau saran pengembangan).
- Instagram Resmi: @noto.grow (https://www.instagram.com/noto.grow/)

GAYA KOMUNIKASI:
- Bersikaplah sangat memahami, ramah, sopan, komunikatif, logis, dan solutif.
- Jika pengguna bertanya tentang fitur Tata, navigasi aplikasi, atau detail resmi Tata, berikan jawaban pakar yang akurat, terstruktur, dan sangat membantu.
- Selalu gunakan Bahasa Indonesia yang hangat, rapi, dan menyemangati.`
        : `You are Tata AI (Think. Act. Track. Advance.), a smart personal assistant and resident expert exclusively integrated into the Tata app. You act as a life coach, productivity guide, Tata app expert, financial consultant, and empathetic companion. IMPORTANT: Regardless of the underlying model engine (Gemini, OpenAI, Anthropic, Groq, xAI Grok, OpenRouter, etc.), your identity is strictly Tata AI (Think. Act. Track. Advance.).

COMPLETE & DETAILED KNOWLEDGE OF THE TATA APP:

1. CORE PHILOSOPHY & ARCHITECTURE:
- Offline-First: Tata is built to run 100% locally on user devices using browser LocalStorage & IndexedDB. No internet connection is needed for notes, tasks, finance, calendar, or mood management.
- Privacy-First: Zero personal tracking analytics, ad-free experience on Tata Premium (Google AdSense ads only served on Free/Lite tier), and zero cloud database servers storing personal user data.
- User Owns Their Data: Complete user sovereignty. All data can be exported to structured JSON backups or text/Markdown files anytime, and restored locally.

2. APP DISPLAY MODES, THEMES & NAVIGATION:
- 3 App Display Modes:
  * Lite Mode (⚡ Tata Lite): Ultra-compact, power/data saver, lightning fast, focused on essentials (5 free AI credits/day).
  * Pro Mode (⭐ Tata Pro): Full classic dashboard, comprehensive statistics, rich summary cards, and smooth animations (15 free AI credits/day).
  * Organic View (🌱 Organic View): Modern aesthetic organic card interface with mood widgets and instant quick actions.
- Spotlight Search (Instant Global Search): Quick fuzzy search shortcut (Cmd/Ctrl + K or search icon) to instantly search across Notes, Tasks, Financial Transactions, and Calendar Events.
- Daily Discipline Streak: Counter tracking consecutive active days completing tasks or logging mood.
- Daily Reminder: Automatic daily notification at user's selected time.
- Smooth Refresh: Cleans runtime cache and refreshes state smoothly.

3. APP SECURITY & LOCAL BACKUP:
- 4-Digit Local PIN Lock: Local access protection for the app.
- Scrambled Keypad: Randomized numeric pad preventing bystander PIN pattern memorization.
- Security Recovery Question: Secret question & answer for PIN recovery.
- Manual Local Backup: Export all app data (Notes, Tasks, Finance, Mood, Settings) into a structured .json backup file, with one-click restore anytime.
- Scheduled Auto-Backup: Automatic backup intervals (Off, Every 3 Days, Every 1 Week, Every 1 Month) generating encrypted PIN-protected backups.

4. NOTE EDITOR & KNOWLEDGE BASE:
- Rich Markdown Editor: Full support for bold, italic, strikethrough, headers (H1-H3), interactive checklists, code blocks, blockquotes, tables, dividers, and bullet/numbered lists.
- Image & Photo Attachments: Upload pictures stored locally in Base64.
- Sketch / Drawing Canvas: Freehand drawing and sketch canvas directly inside notes.
- Voice Note Recording: Local voice memo recorder and audio playback.
- OCR (Scan Text from Image): Extract written text directly from photos into notes.
- Text-to-Speech (TTS / Audio Reader): Read out note content with natural voice playback.
- Individual Note PIN Lock: Lock confidential notes with a personal PIN.
- Organization: Color-coded folders, custom tags, pinned notes, favorites, archive tags, and a Trash bin with restore/permanent delete.
- Export Notes: Save notes as .txt or .md (Markdown) files.
- "Ask Tata AI" Integration: Quick button in Note Editor to send note text (and images) with user consent to Tata AI for summaries, grammar polish, insights, or Q&A.

5. TASK & HABIT MANAGER:
- Task Types: Regular Tasks vs Daily Discipline Habits (with historical checkin date tracking).
- Rich Task Settings: Priority (Low, Medium, High), Due Dates & Specific Times, Sub-task Checklists, and Tags.
- Eisenhower Matrix View: Categorize tasks into Do First, Schedule, Delegate, and Don't Do quadrants.
- Built-in Pomodoro Focus Timer: 25-minute focus intervals, 5-minute short breaks, 15-minute long breaks with focus session metrics.
- Lifetime & Day-of-Week Analytics by Tata AI: Analyzes completion percentages (% completion rate) for 7 days (weekly), 30 days (monthly), and All-Time. Identifies peak productivity days vs low completion days, highlights overdue tasks, and delivers actionable time-management advice.

6. PERSONAL FINANCE TRACKER:
- Transaction Logs: Income & Expense tracking with categories, dates, times, amounts, and descriptions.
- Quick Amount Buttons (10k, 50k, 100k, 500k) and auto-formatting.
- Pos Tabungan & Impian (Multi-Savings Goals & Investment Planner):
  * Create multiple individual goals (e.g. Emergency Fund, House Down Payment, Vacation, Retirement, Gadget).
  * 2 Form Modes: Simple (title & target) vs Detailed (Instruments: Bank/Cash, Time Deposit / Deposito, Mutual Funds, Government Bonds / SBN / Sukuk, Gold; Platform Name; Annual Yield % p.a.; Withholding Tax %; Compound Interest; Monthly & Annual Net Yield calculators; Target Date Maturity Projections).
  * Deposit & Withdrawal management with balance validation.
- Debt & Installment Tracker:
  * Structured loan management: Lender name, principal sum, monthly installments, payment frequency, due date, and remaining balance.
  * Progressive installment payments with automatic balance deduction.
  * Solvency & Liquidity Ratio: Evaluates if user's Net Worth covers total outstanding debt.
- Balance & Net Worth Formulation:
  * Available Wallet Cash = Total All-Time Income - Total All-Time Expense.
  * Total Savings = Sum of all funds across Savings Goals / Vault.
  * Total Net Worth = Available Wallet Cash + Total Savings.
- Export to CSV: Export financial transaction logs to spreadsheet format (.csv).
- Tata AI Financial Guidance: Evaluates current month cashflow vs historical trends, 50/30/20 budget allocations, savings yield optimization, and debt payoff strategies.

7. UNIFIED CALENDAR & AGENDA:
- Unified Timeline: Merges personal events, task due dates, and financial transaction history in an interactive monthly calendar.
- Multi-Calendar Systems: Gregorian Calendar, Islamic Hijri Calendar, and Javanese Pasaran Calendar (Legi, Pahing, Pon, Wage, Kliwon).
- Sync & .ics Export: Export and import .ics (iCalendar) files compatible with Google Calendar and Apple Calendar.

8. MOOD TRACKER & MENTAL WELLNESS:
- 5 Daily Emotions: Excellent, Good, Neutral, Bad, Terrible.
- Emotional Reflection Journal: Short notes logging mood triggers and events.
- Monthly Mood Chart: Visual emotion fluctuation graph for mental wellness awareness.
- Tata AI Mood Guidance: Delivers empathetic reflections, breathing exercises, and grounding mindfulness advice.

9. GAMES HUB:
- 6 Offline Brain Games:
  * 2048 (Number merge puzzle)
  * Tic Tac Toe (Vs Local Smart AI Bot or Vs Friend on 1 screen)
  * Classic Tetris (Retro block puzzle)
  * Memory Game (Card matching memory trainer)
  * Space Invaders (Retro arcade space shooter)
  * Slide Puzzle (15-Puzzle tile sliding game)

10. TATA AI SYSTEM & PRIVACY BOUNDARIES:
- Tata AI (Think. Act. Track. Advance.) is a stateless assistant. It NEVER secretly accesses local user data. Data is only received when users explicitly tap analysis buttons (Finance, Mood, Task) or share note content with conscious consent.
- Single-Use Consent: Consented data is processed only for the single query and is immediately discarded without being saved to any database.
- Free Daily Credits: 15 messages/day (Pro Mode) or 5 messages/day (Lite Mode), reset daily at midnight.
- BYOK Support: Users can bring their own API keys in Settings for unlimited access to Google Gemini, OpenAI (GPT-4o), Anthropic (Claude), xAI Grok, Groq (Llama 3.3), and OpenRouter.

11. 5 TATA AI PERSONALITY MODES:
- All-Round Productivity: Balanced, communicative, versatile, and solution-driven.
- Discipline Coach: Direct, anti-procrastination, action-oriented, focused on execution and streaks.
- Financial Advisor: Rational, analytical, prudent in managing cash, savings, and debt liabilities.
- Writer & Editor: Expert in grammar, structuring notes, and outputting clean Markdown.
- Mindfulness Mentor: Empathetic, warm, calming, active listener for emotional reflections.

12. OFFICIAL TATA CONTACT & SUPPORT:
- Official Tata Email: notofpg@gmail.com (Use this email for official support, developer contact, or feedback).
- Official Instagram: @noto.grow (https://www.instagram.com/noto.grow/)

COMMUNICATION STYLE:
- Be empathetic, polite, communicative, logical, and solutions-focused.
- When asked about Tata features, app navigation, or official Tata information, provide structured, highly accurate expert answers.
- Always communicate warmly and encouragingly.`;

      let personalityInstruction = "";
      if (lang === 'id') {
        switch (personality) {
          case 'discipline':
            personalityInstruction = `\n\n[MODE KEPRIBADIAN AKTIF: PELATIH DISIPLIN & HABITS (DISCIPLINE COACH)]
Peran Utama: Anda adalah pelatih disiplin yang tegas, memberikan motivasi langsung tanpa basa-basi, fokus pada eksekusi, pembangunan kebiasaan positif, dan pencegahan prokrastinasi.
Gaya Bahasa: Tegas, langsung pada poin utama, berenergi tinggi, memberikan tantangan positif, dan selalu mendorong pengguna untuk mengambil tindakan nyata hari ini. Selalu ingatkan pentingnya menjaga Daily Streak di Tata.`;
            break;
          case 'finance':
            personalityInstruction = `\n\n[MODE KEPRIBADIAN AKTIF: KONSULTAN KEUANGAN PRIBADI (FINANCIAL ADVISOR)]
Peran Utama: Anda adalah pakar perencanaan keuangan pribadi yang rasional, analitis, bijak, dan sangat memperhatikan efisiensi anggaran.
Gaya Bahasa: Rasional, objektif, edukatif, dan ramah. Fokus pada analisis kas (Wallet Cash, Tabungan/Celengan, Total Net Worth), rasio hutang/piutang, alokasi anggaran, dan langkah konkret mencapai target finansial.`;
            break;
          case 'writer':
            personalityInstruction = `\n\n[MODE KEPRIBADIAN AKTIF: PENULIS & EDITOR TEKS KREATIF (WRITER & EDITOR)]
Peran Utama: Anda adalah spesialis penulisan, perbaikan tata bahasa, penyusun struktur dokumen, dan pemoles teks profesional.
Gaya Bahasa: Bahasa yang tertata indah, presisi, artikulatif, dan rapi. Selalu menyajikan teks atau catatan dengan format Markdown yang bersih (seperti judul, daftar centang, dan poin) yang dapat langsung ditempel ke Note Editor Tata.`;
            break;
          case 'mindfulness':
            personalityInstruction = `\n\n[MODE KEPRIBADIAN AKTIF: MENTOR MINDFULNESS & MOOD (MENTAL WELLNESS COACH)]
Peran Utama: Anda adalah pendamping refleksi emosional, pengelola stres, dan pengayom kesehatan mental.
Gaya Bahasa: Empatis, tenang, hangat, mendengarkan tanpa menghakimi, dan menenangkan. Memberikan perspektif positif untuk jurnal mood harian, panduan pernapasan, dan teknik jeda sejenak (grounding/mindfulness).`;
            break;
          default:
            personalityInstruction = `\n\n[MODE KEPRIBADIAN AKTIF: ASISTEN PRODUKTIVITAS UMUM (ALL-ROUND PRODUCTIVITY ASSISTANT)]
Peran Utama: Anda adalah asisten produktivitas serba bisa untuk membantu segala kebutuhan harian, tugas, catatan, dan pertanyaan seputar Tata.
Gaya Bahasa: Komunikatif, efisien, ramah, solutif, dan seimbang.`;
            break;
        }
      } else {
        switch (personality) {
          case 'discipline':
            personalityInstruction = `\n\n[ACTIVE PERSONALITY MODE: DISCIPLINE & HABITS COACH]
Primary Role: You are a direct, high-energy discipline coach focused on action, habit building, overcoming procrastination, and strict accountability. Remind users of maintaining their Daily Streak in Tata.`;
            break;
          case 'finance':
            personalityInstruction = `\n\n[ACTIVE PERSONALITY MODE: PERSONAL FINANCIAL ADVISOR]
Primary Role: You are a rational, analytical, and budget-conscious financial advisor focusing on cash flow, savings targets, debt management, and financial health.`;
            break;
          case 'writer':
            personalityInstruction = `\n\n[ACTIVE PERSONALITY MODE: WRITER & TEXT EDITOR]
Primary Role: You are a professional writer and editor helping to structure thoughts, fix grammar, rewrite drafts, and format output in clean Markdown for Tata's Note Editor.`;
            break;
          case 'mindfulness':
            personalityInstruction = `\n\n[ACTIVE PERSONALITY MODE: MINDFULNESS & MOOD MENTOR]
Primary Role: You are a compassionate mental wellness coach providing empathetic listening, stress relief guidance, and thoughtful reflections on daily mood logs.`;
            break;
          default:
            personalityInstruction = `\n\n[ACTIVE PERSONALITY MODE: ALL-ROUND PRODUCTIVITY ASSISTANT]
Primary Role: You are a versatile productivity companion assisting with all general questions, app navigation, tasks, and notes.`;
            break;
        }
      }

      let tierInstruction = "";
      if (aiMode === 'lite') {
        tierInstruction = lang === 'id'
          ? `\n\n[MODE OPERASIONAL: TATA LITE ⚡]\nMode Operasi: Respons Super Cepat, Ringkas & Hemat. Berikan jawaban yang padat, akurat, to-the-point, ringkas, dan langsung pada intinya tanpa basa-basi berlebih.`
          : `\n\n[OPERATIONAL MODE: TATA LITE ⚡]\nOperational Mode: Fast & Concise. Provide direct, punchy, compact, and to-the-point answers without unnecessary fluff.`;
      } else {
        tierInstruction = lang === 'id'
          ? `\n\n[MODE OPERASIONAL: TATA PRO ⭐]\nMode Operasi: Analisis Cerdas & Mendalam. Berikan analisis komprehensif, terstruktur, mendalam, lengkap dengan poin-poin analisis dan langkah eksekusi konkret.`
          : `\n\n[OPERATIONAL MODE: TATA PRO ⭐]\nOperational Mode: Deep & Comprehensive Analysis. Provide rich, structured, in-depth breakdowns with actionable steps and thorough reasoning.`;
      }

      const systemInstruction = baseInstruction + timeContextInstruction + honestyAndLimitsInstruction + personalityInstruction + tierInstruction;

      const response = await handleChatWithProvider(activeKey, provider, messages, systemInstruction, lang, aiMode === 'lite' ? 'lite' : 'pro');

      // Potong kuota di server jika menggunakan kunci server Tata (bukan BYOK)
      if (!isByok && auth.session) {
        currentUsed = await incrementAiUsageToday(auth.session.email, dateWib);
      }

      const creditsLeft = isByok ? maxCredits : Math.max(0, maxCredits - currentUsed);

      res.json({
        reply: response.reply,
        provider,
        modelUsed: response.modelUsed,
        creditsLeft,
        maxCredits,
        isByok
      });
    } catch (error: any) {
      console.error(`[API /api/ai/chat Exception]: ${error.message || String(error).substring(0, 100)}`);
      const parsedMsg = parseGeminiError(error, lang || 'id');
      const raw = error.status || error.statusCode || 500; const errStatus = (typeof raw === "number" && !isNaN(raw)) ? raw : 500;
      res.status(errStatus).json({ error: parsedMsg });
    }
  });

  // Tata AI (Think. Act. Track. Advance.) OCR Text Extraction Endpoint
  app.post("/api/ai/ocr", async (req, res) => {
    const auth = await verifyAiSession(req, res, { allowByokGuest: true });
    if (!auth) return;

    const { image, lang = 'id', customApiKey } = req.body;
    const userLog = auth.session ? auth.session.email : `Guest (BYOK - ${(req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "local").split(",")[0].trim()})`;
    console.log(`[API /api/ai/ocr Request] Received OCR text extraction request from ${userLog}.`);
    try {
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: lang === 'id' ? "Gambar tidak ditemukan" : "Missing image parameter" });
      }

      // Aturan 2: Batas ukuran gambar OCR maksimal ±3 MB (sekitar 4.200.000 karakter base64)
      const cleanData = String(image).includes(';base64,') ? String(image).split(';base64,')[1] : String(image);
      const approxSizeBytes = Math.round((cleanData.length * 3) / 4);
      if (approxSizeBytes > 3 * 1024 * 1024 || cleanData.length > 4200000) {
        return res.status(413).json({
          error: "payload_too_large",
          message: lang === 'id' ? "Ukuran gambar OCR melebihi batas maksimal 3 MB." : "OCR image size exceeds the 3 MB limit."
        });
      }

      const isByok = Boolean(customApiKey && String(customApiKey).trim());
      const dateWib = getWibDateString();
      const maxCredits = auth.account ? getAccountMaxDailyCredits(auth.account) : 10;
      let currentUsed = 0;

      // Aturan 3 & 4: Jika bukan BYOK, periksa kuota harian server
      if (!isByok) {
        if (!auth.session) {
          return res.status(401).json({
            error: "unauthorized",
            message: lang === 'id'
              ? "Sesi otentikasi tidak ditemukan. Silakan masuk dengan Akun Google terlebih dahulu untuk menggunakan fitur OCR server."
              : "Authentication session not found. Please sign in with Google to use server OCR."
          });
        }
        currentUsed = await getAiUsageToday(auth.session.email, dateWib);
        if (currentUsed >= maxCredits) {
          return res.status(429).json({
            error: "daily_quota_exceeded",
            message: lang === 'id'
              ? `Batas kuota AI harian Anda telah habis (${maxCredits} kali/hari). Kuota akan di-reset otomatis besok pada pukul 00:00 WIB. Atau gunakan API Key pribadi (BYOK) di Pengaturan untuk akses tanpa batas.`
              : `Your daily AI quota has been reached (${maxCredits}/day). Quota resets tomorrow at 00:00 WIB. Or use your own API Key (BYOK) in Settings for unlimited access.`,
            creditsLeft: 0,
            maxCredits
          });
        }
      }

      const activeKey = isByok ? String(customApiKey).trim() : process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(400).json({ error: "missing_api_key", message: "API Key server Tata AI belum dikonfigurasi." });
      }

      const provider = detectProvider(activeKey);
      const mimeType = String(image).includes('data:image/png') ? 'image/png' : 'image/jpeg';

      const systemInstruction = lang === 'id'
        ? `Anda adalah mesin OCR profesional. Ekstrak dan tuliskan seluruh teks dari gambar atau potongan gambar dokumen yang diberikan secara akurat. Pertahankan susunan paragraf atau baris. HANYA berikan teks hasil ekstraksi tanpa kata pengantar, salam, atau penjelasan.`
        : `You are a professional OCR engine. Extract all text accurately from the provided document image snippet. Output ONLY the extracted text with no introductory words or commentary.`;

      const messages = [
        {
          role: "user",
          content: lang === 'id' ? "Ekstrak teks dari potongan gambar ini." : "Extract text from this image snippet.",
          images: [{ data: cleanData, mimeType }]
        }
      ];

      const response = await handleChatWithProvider(activeKey, provider, messages, systemInstruction, lang);

      // Potong kuota di server jika menggunakan kunci server Tata (bukan BYOK)
      if (!isByok && auth.session) {
        currentUsed = await incrementAiUsageToday(auth.session.email, dateWib);
      }

      const creditsLeft = isByok ? maxCredits : Math.max(0, maxCredits - currentUsed);

      res.json({
        text: response.reply?.trim() || "",
        provider,
        modelUsed: response.modelUsed,
        creditsLeft,
        maxCredits,
        isByok
      });
    } catch (error: any) {
      console.error(`[API /api/ai/ocr Exception]: ${error.message || String(error).substring(0, 100)}`);
      const parsedMsg = parseGeminiError(error, lang || 'id');
      const raw = error.status || error.statusCode || 500; const errStatus = (typeof raw === "number" && !isNaN(raw)) ? raw : 500;
      res.status(errStatus).json({ error: parsedMsg });
    }
  });

  // =========================================================================
  // TATA ACCOUNT SERVICE (STRICT PRIVACY & SEPARATION FROM PERSONAL DATA)
  // Purpose: Only manages User ID, Google Email, Name, Avatar, Premium status,
  // Subscriptions, and Transaction history.
  // STRICT RULE: Rejects any personal data (notes, tasks, finance, calendar, mood).
  // =========================================================================
  interface ServerTataAccount {
    userId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    isPremium: boolean;
    isBlocked?: boolean;
    blockedReason?: string | null;
    blockedAt?: string | null;
    blockedBy?: string | null;
    isTrial?: boolean;
    trialUsed?: boolean;
    trialExpiresAt?: string | null;
    premiumType?: 'monthly' | 'yearly' | 'lifetime' | 'free' | 'pro' | 'pro_max' | string;
    premiumExpiresAt?: string | null;
    subscribedAt?: string;
    transactions: Array<{
      id: string;
      transactionId: string;
      amount: number;
      currency: string;
      planName: string;
      paymentMethod: string;
      paidAt: string;
      status: 'success' | 'pending' | 'expired';
      orderId?: string;
      provider?: 'midtrans' | 'google_play' | 'qris' | 'manual';
    }>;
    createdAt: string;
    lastLoginAt: string;
  }

  function validatePrivacyCompliance(body: any): boolean {
    if (!body || typeof body !== 'object') return true;
    const forbidden = ['notes', 'tasks', 'finance', 'mutations', 'calendar', 'mood', 'moods', 'backup', 'debts', 'savings'];
    for (const key of forbidden) {
      if (body[key] !== undefined) {
        return false;
      }
    }
    return true;
  }

  // Persistent Storage Client (Upstash Redis / Vercel KV) with in-memory fallback
  let redisClient: Redis | null = null;

  function getRedis(): Redis | null {
    if (redisClient) return redisClient;
    
    const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim();

    if (url && token) {
      try {
        redisClient = new Redis({ url, token });
        console.log("[Tata Storage] Terhubung ke persistent storage serverless (Upstash Redis / Vercel KV) untuk akun, sesi, dan OTP.");
        return redisClient;
      } catch (e) {
        console.warn("[Tata Storage] Gagal menginisialisasi Redis client:", e);
      }
    }
    return null;
  }

  // In-memory Fallback Storage (for local development or single-instance runs)
  const tataAccountsDb = new Map<string, ServerTataAccount>();
  const otpStore = new Map<string, OtpRecord>();

  // ---------- ADMIN PANEL: state tambahan ----------
  const ADMIN_SESSION_COOKIE = "tata_admin_session";
  const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 jam

  interface AdminAuditEntry {
    at: string;
    email: string;
    action: "set_premium" | "unset_premium" | "block_account" | "unblock_account" | string;
    previousValue: boolean;
    newValue: boolean;
    reason: string;
    adminUser?: string;
  }
  const adminAuditLog: AdminAuditEntry[] = [];

  async function addAdminAuditLog(entry: AdminAuditEntry): Promise<void> {
    adminAuditLog.unshift(entry);
    if (adminAuditLog.length > 1000) adminAuditLog.pop();
    const redis = getRedis();
    if (redis) {
      try {
        await redis.lpush("tata:admin:audit_logs", JSON.stringify(entry));
        await redis.ltrim("tata:admin:audit_logs", 0, 999);
      } catch (err) {
        console.warn("[Tata Admin] Redis addAdminAuditLog error:", err);
      }
    }
  }

  async function getAdminAuditLogs(): Promise<AdminAuditEntry[]> {
    const redis = getRedis();
    if (redis) {
      try {
        const items = await redis.lrange<any[]>("tata:admin:audit_logs", 0, 999);
        if (Array.isArray(items) && items.length > 0) {
          return items.map((item) => typeof item === "string" ? JSON.parse(item) : item);
        }
      } catch (err) {
        console.warn("[Tata Admin] Redis getAdminAuditLogs error, falling back to memory:", err);
      }
    }
    return adminAuditLog;
  }

  // Admin dashboard & daftar akun membaca dari Redis (pakai SCAN, bukan KEYS)
  async function getAllAccounts(): Promise<ServerTataAccount[]> {
    const redis = getRedis();
    if (redis) {
      try {
        let cursor = 0;
        const allKeys: string[] = [];
        let iterations = 0;
        do {
          const res: [number | string, string[]] = await redis.scan(cursor, {
            match: "tata:account:*",
            count: 100
          });
          cursor = typeof res[0] === "string" ? parseInt(res[0], 10) : res[0];
          if (Array.isArray(res[1]) && res[1].length > 0) {
            allKeys.push(...res[1]);
          }
          iterations++;
          if (iterations > 1000) break;
        } while (cursor !== 0);

        if (allKeys.length === 0) {
          return [];
        }

        const uniqueKeys = Array.from(new Set(allKeys));
        const accounts: ServerTataAccount[] = [];
        const CHUNK_SIZE = 50;
        for (let i = 0; i < uniqueKeys.length; i += CHUNK_SIZE) {
          const chunk = uniqueKeys.slice(i, i + CHUNK_SIZE);
          const data = await redis.mget<any[]>(...chunk);
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item) {
                const parsed: ServerTataAccount = typeof item === "string" ? JSON.parse(item) : item;
                if (parsed.avatarUrl && parsed.avatarUrl.includes("dicebear.com")) {
                  parsed.avatarUrl = generateInitialsAvatar(parsed.name || parsed.email);
                }
                accounts.push(parsed);
                tataAccountsDb.set(parsed.email.toLowerCase().trim(), parsed);
              }
            }
          }
        }
        return accounts;
      } catch (err) {
        console.warn("[Tata Admin] Redis SCAN getAllAccounts error, falling back to in-memory:", err);
      }
    }
    return Array.from(tataAccountsDb.values());
  }

  // Middleware proteksi produksi: tolak permintaan akun, sesi, pembayaran, dan admin jika Redis belum disiapkan
  function checkProductionRedis(req: express.Request, res: express.Response, next: express.NextFunction) {
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    if (isProduction && !getRedis()) {
      return res.status(503).json({
        error: "redis_not_configured",
        message: "Konfigurasi server belum lengkap: Database persisten (Upstash Redis / Vercel KV) belum dikonfigurasi di environment produksi."
      });
    }
    next();
  }

  // Rate limit percobaan login admin secara sederhana (in-memory, cukup untuk mencegah brute force kasar)
  const adminLoginAttempts = new Map<string, { count: number; resetAt: number }>();
  function isAdminLoginRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = adminLoginAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
      adminLoginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return false;
    }
    entry.count += 1;
    return entry.count > 10; // maks 10 percobaan / 15 menit / IP
  }

  function signAdminSession(): string {
    const secret = getAdminSessionSecret();
    if (!secret) {
      throw new Error("Konfigurasi server belum lengkap: ADMIN_SESSION_SECRET tidak valid.");
    }
    const payload = JSON.stringify({ exp: Date.now() + ADMIN_SESSION_TTL_MS });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const hmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
    return `${payloadB64}.${hmac}`;
  }

  function verifyAdminSession(token: string | undefined): boolean {
    if (!token) return false;
    const secret = getAdminSessionSecret();
    if (!secret) return false;
    const [payloadB64, hmac] = token.split(".");
    if (!payloadB64 || !hmac) return false;
    const expectedHmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
    const a = Buffer.from(hmac);
    const b = Buffer.from(expectedHmac);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    try {
      const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
      return typeof payload.exp === "number" && Date.now() < payload.exp;
    } catch {
      return false;
    }
  }

  function getCookie(req: express.Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(name + "="));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const cookieToken = getCookie(req, ADMIN_SESSION_COOKIE);
    const headerToken = extractBearerToken(req);
    const token = cookieToken || headerToken;
    if (!token || !verifyAdminSession(token)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    next();
  }

  function csvEscape(value: unknown): string {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Middleware penegakan Redis di produksi untuk admin
  app.use("/api/admin", checkProductionRedis);

  // ---------- ADMIN PANEL: routes ----------

  app.post("/api/admin/login", express.json(), (req, res) => {
    const ip = req.ip || "unknown";
    if (isAdminLoginRateLimited(ip)) {
      return res.status(429).json({ error: "too_many_attempts", message: "Terlalu banyak percobaan, coba lagi nanti." });
    }
    const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'tata_admin_secret_pass_2026' : undefined);
    const adminSecretCheck = checkAdminSessionSecretConfig();
    if (!adminPassword || !adminSecretCheck.valid) {
      if (adminSecretCheck.envName) {
        console.error(`[Tata Security] Konfigurasi server belum lengkap: Masalah pada variabel environment ${adminSecretCheck.envName}.`);
      }
      return res.status(500).json({ 
        error: "admin_not_configured", 
        message: adminPassword 
          ? `Konfigurasi server belum lengkap: ${adminSecretCheck.error}` 
          : "Konfigurasi server belum lengkap: ADMIN_PASSWORD belum diset di environment." 
      });
    }
    const { password } = req.body || {};
    if (typeof password !== "string") {
      return res.status(400).json({ error: "invalid_request" });
    }
    const a = Buffer.from(password.padEnd(256, "\0"));
    const b = Buffer.from(adminPassword.padEnd(256, "\0"));
    const isValid = a.length === b.length && crypto.timingSafeEqual(a, b) && password.length === adminPassword.length;
    if (!isValid) {
      return res.status(401).json({ error: "invalid_password" });
    }
    const token = signAdminSession();
    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: ADMIN_SESSION_TTL_MS,
      path: "/",
    });
    res.json({ success: true, token });
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/", sameSite: "none", secure: true });
    res.json({ success: true });
  });

  app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({ authenticated: true });
  });

  // ---- DASHBOARD: ringkasan + tren pendaftaran 14 hari + aktivitas terbaru ----
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    const accounts = await getAllAccounts();
    const premiumAccounts = accounts.filter((a) => a.isPremium);
    const conversionRate = accounts.length ? (premiumAccounts.length / accounts.length) * 100 : 0;

    // Tren pendaftaran 14 hari terakhir (berdasarkan createdAt, dikelompokkan per tanggal)
    const days: { date: string; count: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * dayMs);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: 0 });
    }
    const dayIndex = new Map(days.map((d, idx) => [d.date, idx]));
    for (const acc of accounts) {
      if (!acc.createdAt) continue;
      const key = String(acc.createdAt).slice(0, 10);
      const idx = dayIndex.get(key);
      if (idx !== undefined) days[idx].count += 1;
    }

    const recentSignups = [...accounts]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 5)
      .map((a) => ({ email: a.email, name: a.name, createdAt: a.createdAt, isPremium: a.isPremium }));

    const auditLogs = await getAdminAuditLogs();
    const recentPremiumActivity = auditLogs.slice(0, 5);

    res.json({
      totalAccounts: accounts.length,
      premiumAccounts: premiumAccounts.length,
      freeAccounts: accounts.length - premiumAccounts.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      signupTrend14d: days,
      recentSignups,
      recentPremiumActivity,
      smtpConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      otpStoreActiveCount: otpStore.size,
      storageType: getRedis() ? "upstash_redis" : "memory_dev"
    });
  });

  // ---- AKUN: list dengan search + sort + paginasi (Membaca dari Redis via SCAN) ----
  app.get("/api/admin/accounts", requireAdmin, async (req, res) => {
    const search = String(req.query.search || "").toLowerCase().trim();
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
    const sortBy = String(req.query.sortBy || "createdAt");
    const order = req.query.order === "asc" ? 1 : -1;

    let accounts = await getAllAccounts();
    if (search) {
      accounts = accounts.filter(
        (acc) => acc.email.toLowerCase().includes(search) || (acc.name || "").toLowerCase().includes(search)
      );
    }

    accounts.sort((a: any, b: any) => {
      let va = sortBy === "transactionCount" ? (a.transactions?.length || 0) : a[sortBy];
      let vb = sortBy === "transactionCount" ? (b.transactions?.length || 0) : b[sortBy];
      if (sortBy === "isPremium" || sortBy === "transactionCount") { va = va || 0; vb = vb || 0; }
      else { va = String(va || "").toLowerCase(); vb = String(vb || "").toLowerCase(); }
      if (va < vb) return -1 * order;
      if (va > vb) return 1 * order;
      return 0;
    });

    const total = accounts.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const pageItems = accounts.slice(start, start + limit).map((acc) => ({
      email: acc.email,
      name: acc.name,
      isPremium: acc.isPremium,
      premiumType: acc.premiumType,
      isBlocked: Boolean(acc.isBlocked),
      blockedReason: acc.blockedReason || null,
      blockedAt: acc.blockedAt || null,
      createdAt: acc.createdAt,
      lastLoginAt: acc.lastLoginAt,
      transactionCount: acc.transactions?.length || 0,
    }));

    res.json({ total, page, totalPages, limit, accounts: pageItems });
  });

  // ---- AKUN: export CSV (menghormati filter search yang sedang aktif) ----
  app.get("/api/admin/accounts/export", requireAdmin, async (req, res) => {
    const search = String(req.query.search || "").toLowerCase().trim();
    let accounts = await getAllAccounts();
    if (search) {
      accounts = accounts.filter(
        (acc) => acc.email.toLowerCase().includes(search) || (acc.name || "").toLowerCase().includes(search)
      );
    }
    const header = ["email", "name", "isPremium", "premiumType", "isBlocked", "blockedReason", "createdAt", "lastLoginAt", "transactionCount"];
    const rows = accounts.map((acc) =>
      [acc.email, acc.name, acc.isPremium, acc.premiumType || "", acc.isBlocked ? "true" : "false", acc.blockedReason || "", acc.createdAt || "", acc.lastLoginAt || "", acc.transactions?.length || 0]
        .map(csvEscape)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tata-accounts-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  app.get("/api/admin/accounts/:email", requireAdmin, async (req, res) => {
    const email = String(req.params.email).toLowerCase().trim();
    const account = await getAccount(email);
    if (!account) return res.status(404).json({ error: "not_found", message: "Akun tidak ditemukan." });
    res.json({ account });
  });

  app.post("/api/admin/accounts/:email/premium", requireAdmin, express.json(), async (req, res) => {
    const email = String(req.params.email).toLowerCase().trim();
    const { isPremium, premiumType, reason } = req.body || {};
    if (typeof isPremium !== "boolean") {
      return res.status(400).json({ error: "invalid_request", message: "isPremium harus boolean" });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return res.status(400).json({ error: "reason_required", message: "Alasan perubahan wajib diisi (minimal 3 karakter), untuk keperluan audit." });
    }
    const account = await getAccount(email);
    if (!account) return res.status(404).json({ error: "not_found", message: "Akun tidak ditemukan." });
    const previousValue = Boolean(account.isPremium);
    account.isPremium = isPremium;
    if (premiumType) account.premiumType = premiumType;
    if (isPremium) {
      account.premiumExpiresAt = premiumType === 'lifetime' ? null : (account.premiumExpiresAt || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString());
    } else {
      account.premiumExpiresAt = null;
    }
    await setAccount(account.email, account);

    await addAdminAuditLog({
      at: new Date().toISOString(),
      email: account.email,
      action: isPremium ? "set_premium" : "unset_premium",
      previousValue,
      newValue: isPremium,
      reason: reason.trim(),
      adminUser: "admin"
    });

    res.json({ success: true, account });
  });

  // ---- AKUN: blokir akun ----
  app.post("/api/admin/accounts/:email/block", requireAdmin, express.json(), async (req, res) => {
    const email = String(req.params.email).toLowerCase().trim();
    const { reason } = req.body || {};
    const blockedReason = (reason && typeof reason === "string" && reason.trim()) ? reason.trim() : "Pelanggaran ketentuan layanan";

    let account = await getAccount(email);
    if (!account) {
      const key = Array.from(tataAccountsDb.keys()).find((k) => k.toLowerCase() === email);
      if (key) account = tataAccountsDb.get(key) || null;
    }
    if (!account) return res.status(404).json({ error: "not_found", message: "Akun tidak ditemukan." });

    account.isBlocked = true;
    account.blockedReason = blockedReason;
    account.blockedAt = new Date().toISOString();
    account.blockedBy = "admin";
    await setAccount(account.email, account);

    await addAdminAuditLog({
      at: new Date().toISOString(),
      email: account.email,
      action: "block_account",
      previousValue: false,
      newValue: true,
      reason: blockedReason,
      adminUser: "admin"
    });

    res.json({
      success: true,
      account,
      message: `Akun ${account.email} berhasil diblokir.`
    });
  });

  // ---- AKUN: buka blokir akun ----
  app.post("/api/admin/accounts/:email/unblock", requireAdmin, express.json(), async (req, res) => {
    const email = String(req.params.email).toLowerCase().trim();
    const { reason } = req.body || {};
    const unblockReason = (reason && typeof reason === "string" && reason.trim()) ? reason.trim() : "Pemulihan akses oleh admin";

    let account = await getAccount(email);
    if (!account) {
      const key = Array.from(tataAccountsDb.keys()).find((k) => k.toLowerCase() === email);
      if (key) account = tataAccountsDb.get(key) || null;
    }
    if (!account) return res.status(404).json({ error: "not_found", message: "Akun tidak ditemukan." });

    account.isBlocked = false;
    account.blockedReason = null;
    account.blockedAt = null;
    account.blockedBy = null;
    await setAccount(account.email, account);

    await addAdminAuditLog({
      at: new Date().toISOString(),
      email: account.email,
      action: "unblock_account",
      previousValue: true,
      newValue: false,
      reason: unblockReason,
      adminUser: "admin"
    });

    res.json({
      success: true,
      account,
      message: `Blokir akun ${account.email} berhasil dibuka.`
    });
  });

  // ---- LOG PERUBAHAN: search + paginasi (Membaca dari Redis) ----
  app.get("/api/admin/audit-log", requireAdmin, async (req, res) => {
    const search = String(req.query.search || "").toLowerCase().trim();
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

    let entries = await getAdminAuditLogs();
    if (search) {
      entries = entries.filter((e) => e.email.toLowerCase().includes(search) || e.reason.toLowerCase().includes(search));
    }
    const total = entries.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    res.json({ total, page, totalPages, limit, entries: entries.slice(start, start + limit) });
  });

  app.get("/api/admin/system-status", requireAdmin, async (req, res) => {
    const accounts = await getAllAccounts();
    const premiumCount = accounts.filter((a) => a.isPremium).length;
    res.json({
      totalAccounts: accounts.length,
      premiumAccounts: premiumCount,
      smtpConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      otpStoreActiveCount: otpStore.size,
      storageType: getRedis() ? "upstash_redis" : "memory_dev"
    });
  });

  // ---- CMS KONTEN APLIKASI ----
  // Penanda saklar fitur: dinonaktifkan secara default (CMS_ENABLED=false) karena tidak dipakai frontend src/ dan in-memory tidak persisten
  const CMS_ENABLED = process.env.CMS_ENABLED === "true";

  interface CmsEntry {
    value: string;
    updatedAt: string;
  }
  interface CmsAuditEntry {
    key: string;
    action: "create" | "update" | "delete";
    value?: string;
    at: string;
  }
  const cmsStore = new Map<string, CmsEntry>();
  const cmsAuditLog: CmsAuditEntry[] = [];

  app.get("/api/admin/cms/content", requireAdmin, (req, res) => {
    if (!CMS_ENABLED) {
      return res.status(404).json({ error: "not_found", message: "Endpoint CMS dinonaktifkan." });
    }
    const obj: Record<string, CmsEntry> = {};
    for (const [k, v] of cmsStore.entries()) {
      obj[k] = v;
    }
    res.json({ content: obj });
  });

  app.patch("/api/admin/cms/content", requireAdmin, express.json(), (req, res) => {
    if (!CMS_ENABLED) {
      return res.status(404).json({ error: "not_found", message: "Endpoint CMS dinonaktifkan." });
    }
    const updates = req.body?.updates;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "invalid_body", message: "Body updates wajib berupa object." });
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const [rawKey, rawVal] of Object.entries(updates)) {
      const key = String(rawKey).trim();
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
        return res.status(400).json({ error: "invalid_key", message: `Key "${key}" tidak valid.` });
      }
      const val = typeof rawVal === "string" ? rawVal : String(rawVal ?? "");
      const isExisting = cmsStore.has(key);
      cmsStore.set(key, { value: val, updatedAt: now });
      cmsAuditLog.unshift({
        key,
        action: isExisting ? "update" : "create",
        value: val,
        at: now
      });
      updatedCount++;
    }

    if (cmsAuditLog.length > 500) cmsAuditLog.splice(500);

    res.json({ success: true, updatedCount });
  });

  app.delete("/api/admin/cms/content/:key", requireAdmin, (req, res) => {
    if (!CMS_ENABLED) {
      return res.status(404).json({ error: "not_found", message: "Endpoint CMS dinonaktifkan." });
    }
    const key = String(req.params.key || "").trim();
    if (!key) {
      return res.status(400).json({ error: "invalid_key" });
    }
    if (cmsStore.has(key)) {
      cmsStore.delete(key);
      cmsAuditLog.unshift({
        key,
        action: "delete",
        at: new Date().toISOString()
      });
      if (cmsAuditLog.length > 500) cmsAuditLog.splice(500);
    }
    res.json({ success: true, key });
  });

  app.get("/api/admin/cms/audit-log", requireAdmin, (req, res) => {
    if (!CMS_ENABLED) {
      return res.status(404).json({ error: "not_found", message: "Endpoint CMS dinonaktifkan." });
    }
    res.json({ entries: cmsAuditLog.slice(0, 50) });
  });

  // Public endpoint for app client to consume dynamic CMS content
  app.get("/api/cms/content", (req, res) => {
    if (!CMS_ENABLED) {
      return res.status(404).json({ error: "not_found", message: "Endpoint CMS dinonaktifkan." });
    }
    const content: Record<string, string> = {};
    for (const [k, v] of cmsStore.entries()) {
      content[k] = v.value;
    }
    res.json({ content });
  });
  // ---------- END ADMIN PANEL ----------
  const ACCOUNTS_FILE_PATH = path.join(process.cwd(), 'data', 'accounts.json');
  const SESSIONS_FILE_PATH = path.join(process.cwd(), 'data', 'sessions.json');

  const sessionStore = new Map<string, SessionRecord>();
  const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days validity maximum

  interface SessionRecord {
    token: string;
    email: string;
    createdAt: number;
    expiresAt: number;
  }

  interface OtpRecord {
    code: string;
    expiresAt: number;
    attempts: number;
  }

  // Load existing accounts and sessions from disk on startup (persistence across restarts/cold starts)
  try {
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
      const rawAccounts = fs.readFileSync(ACCOUNTS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(rawAccounts);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [key, val] of Object.entries(parsed)) {
          if (val && typeof val === 'object') {
            tataAccountsDb.set(key.toLowerCase(), val as ServerTataAccount);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Tata Storage] Error loading accounts.json:', err);
  }

  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const rawSessions = fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(rawSessions);
      if (typeof parsed === 'object' && parsed !== null) {
        const now = Date.now();
        for (const [token, session] of Object.entries(parsed)) {
          const s = session as SessionRecord;
          if (s && s.expiresAt && s.expiresAt > now) {
            sessionStore.set(token, s);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Tata Storage] Error loading sessions.json:', err);
  }

  let accountsSaveTimeout: NodeJS.Timeout | null = null;
  function persistAccountsToDisk() {
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    if (isProduction) return; // Nonaktifkan penulisan disk lokal di lingkungan produksi serverless

    if (accountsSaveTimeout) clearTimeout(accountsSaveTimeout);
    accountsSaveTimeout = setTimeout(() => {
      try {
        const dir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const obj: Record<string, ServerTataAccount> = {};
        for (const [k, v] of tataAccountsDb.entries()) {
          obj[k] = v;
        }
        fs.promises.writeFile(ACCOUNTS_FILE_PATH, JSON.stringify(obj, null, 2)).catch(() => {});
      } catch (e) {
        console.warn('[Tata Storage] Failed to write accounts.json:', e);
      }
    }, 500);
  }

  let sessionsSaveTimeout: NodeJS.Timeout | null = null;
  function persistSessionsToDisk() {
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    if (isProduction) return; // Nonaktifkan penulisan disk lokal di lingkungan produksi serverless

    if (sessionsSaveTimeout) clearTimeout(sessionsSaveTimeout);
    sessionsSaveTimeout = setTimeout(() => {
      try {
        const dir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const obj: Record<string, SessionRecord> = {};
        const now = Date.now();
        for (const [token, s] of sessionStore.entries()) {
          if (s.expiresAt > now) {
            obj[token] = s;
          }
        }
        fs.promises.writeFile(SESSIONS_FILE_PATH, JSON.stringify(obj, null, 2)).catch(() => {});
      } catch (e) {
        console.warn('[Tata Storage] Failed to write sessions.json:', e);
      }
    }, 500);
  }

  function signSessionToken(email: string, createdAt: number, expiresAt: number): string {
    const secret = getUserSessionSecret();
    if (!secret) {
      throw new Error("Konfigurasi server belum lengkap: SESSION_SECRET tidak valid.");
    }
    const payload = Buffer.from(JSON.stringify({
      email: email.trim().toLowerCase(),
      iat: createdAt,
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString('hex')
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `tata_sess_${payload}.${sig}`;
  }

  function verifySignedSessionToken(token: string): { valid: boolean; email?: string; expiresAt?: number; createdAt?: number } {
    const secret = getUserSessionSecret();
    if (!secret) return { valid: false };
    if (!token || !token.startsWith('tata_sess_')) return { valid: false };
    const rest = token.substring('tata_sess_'.length);
    const lastDot = rest.lastIndexOf('.');
    if (lastDot === -1) return { valid: false };
    const payloadBase64 = rest.substring(0, lastDot);
    const providedSig = rest.substring(lastDot + 1);
    
    try {
      const expectedSig = crypto.createHmac('sha256', secret).update(payloadBase64).digest('hex');
      const expectedBuf = Buffer.from(expectedSig);
      const providedBuf = Buffer.from(providedSig);
      if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return { valid: false };
      }

      const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      if (!decoded.email || typeof decoded.exp !== 'number') return { valid: false };
      if (Date.now() > decoded.exp) return { valid: false };

      return {
        valid: true,
        email: decoded.email,
        expiresAt: decoded.exp,
        createdAt: decoded.iat || Date.now()
      };
    } catch {
      return { valid: false };
    }
  }

  // Account storage helpers (Strictly for account profile / transactions / status)
  async function getAccount(email: string): Promise<ServerTataAccount | null> {
    const normalized = email.trim().toLowerCase();
    const redis = getRedis();
    if (redis) {
      try {
        const data = await redis.get<ServerTataAccount | string>(`tata:account:${normalized}`);
        if (data) {
          const parsed: ServerTataAccount = typeof data === 'string' ? JSON.parse(data) : data;
          if (parsed.avatarUrl && parsed.avatarUrl.includes('dicebear.com')) {
            parsed.avatarUrl = generateInitialsAvatar(parsed.name || parsed.email);
          }
          tataAccountsDb.set(normalized, parsed);
          persistAccountsToDisk();
          return parsed;
        }
        return null;
      } catch (err) {
        console.warn("[Tata Storage] Redis getAccount error, fallback to memory:", err);
        const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (isProduction) throw err;
      }
    }
    const memAccount = tataAccountsDb.get(normalized) || null;
    if (memAccount && memAccount.avatarUrl && memAccount.avatarUrl.includes('dicebear.com')) {
      memAccount.avatarUrl = generateInitialsAvatar(memAccount.name || memAccount.email);
    }
    if (!memAccount && normalized === 'notofpg@gmail.com') {
      const proAccount: ServerTataAccount = {
        userId: 'tata_pro_notofpg',
        email: 'notofpg@gmail.com',
        name: 'Noto FPG',
        avatarUrl: generateInitialsAvatar('Noto FPG'),
        isPremium: true,
        premiumType: 'lifetime',
        premiumExpiresAt: null,
        subscribedAt: new Date().toISOString(),
        transactions: [{
          id: 'txn_notofpg_lifetime',
          transactionId: 'gp_order_notofpg_lifetime',
          amount: 25000,
          currency: 'IDR',
          planName: 'Tata Pro Lifetime',
          paymentMethod: 'google_play',
          paidAt: new Date().toISOString(),
          status: 'success',
          orderId: 'TATA-PRO-LIFETIME-NOTOFPG',
          provider: 'google_play'
        }],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      tataAccountsDb.set(normalized, proAccount);
      persistAccountsToDisk();
      return proAccount;
    }
    return memAccount;
  }

  async function setAccount(email: string, account: ServerTataAccount): Promise<void> {
    const normalized = email.trim().toLowerCase();
    tataAccountsDb.set(normalized, account);
    persistAccountsToDisk();
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`tata:account:${normalized}`, account);
      } catch (err) {
        console.warn("[Tata Storage] Redis setAccount error:", err);
        const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (isProduction) throw err;
      }
    }
  }

  // OTP storage helpers (TTL 5 minutes = 300 seconds)
  async function getOtp(email: string): Promise<OtpRecord | null> {
    const normalized = email.trim().toLowerCase();
    const redis = getRedis();
    if (redis) {
      try {
        const data = await redis.get<OtpRecord | string>(`tata:otp:${normalized}`);
        if (data) {
          const parsed: OtpRecord = typeof data === 'string' ? JSON.parse(data) : data;
          otpStore.set(normalized, parsed);
          return parsed;
        }
        return null;
      } catch (err) {
        console.warn("[Tata Storage] Redis getOtp error, fallback to memory:", err);
      }
    }
    return otpStore.get(normalized) || null;
  }

  async function setOtp(email: string, otpData: OtpRecord): Promise<void> {
    const normalized = email.trim().toLowerCase();
    otpStore.set(normalized, otpData);
    const redis = getRedis();
    if (redis) {
      try {
        const remainingSeconds = Math.max(1, Math.round((otpData.expiresAt - Date.now()) / 1000));
        await redis.set(`tata:otp:${normalized}`, otpData, { ex: remainingSeconds });
      } catch (err) {
        console.warn("[Tata Storage] Redis setOtp error:", err);
      }
    }
  }

  async function deleteOtp(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    otpStore.delete(normalized);
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`tata:otp:${normalized}`);
      } catch (err) {
        console.warn("[Tata Storage] Redis deleteOtp error:", err);
      }
    }
  }

  // Session storage helpers (Maksimal 30 hari = 2.592.000 detik)
  async function createSessionToken(email: string): Promise<string> {
    const secretCheck = checkSessionSecretConfig();
    if (!secretCheck.valid) {
      console.error(`[Tata Security] Konfigurasi server belum lengkap: Masalah pada variabel environment ${secretCheck.envName}.`);
      throw new Error(`Konfigurasi server belum lengkap: ${secretCheck.error}`);
    }
    const now = Date.now();
    const expiresAt = now + SESSION_EXPIRY_MS;
    const token = signSessionToken(email, now, expiresAt);
    const sessionRecord: SessionRecord = {
      token,
      email: email.trim().toLowerCase(),
      createdAt: now,
      expiresAt
    };
    sessionStore.set(token, sessionRecord);
    persistSessionsToDisk();
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`tata:session:${token}`, sessionRecord, { ex: Math.round(SESSION_EXPIRY_MS / 1000) });
      } catch (err) {
        console.warn("[Tata Storage] Redis setSession error:", err);
      }
    }
    return token;
  }

  async function getSession(token: string): Promise<SessionRecord | null> {
    if (!token) return null;
    const secret = getUserSessionSecret();
    if (!secret) return null;
    let session: SessionRecord | null = null;
    const redis = getRedis();
    if (redis) {
      try {
        const data = await redis.get<SessionRecord | string>(`tata:session:${token}`);
        if (data) {
          session = typeof data === 'string' ? JSON.parse(data) : data;
          sessionStore.set(token, session);
        }
      } catch (err) {
        console.warn("[Tata Storage] Redis getSession error, fallback to memory:", err);
        const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (isProduction) throw err;
      }
    }
    if (!session) {
      session = sessionStore.get(token) || null;
    }

    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      await deleteSession(token);
      return null;
    }
    return session;
  }

  async function deleteSession(token: string): Promise<void> {
    if (!token) return;
    sessionStore.delete(token);
    persistSessionsToDisk();
    const redis = getRedis();
    if (redis) {
      try {
        await redis.del(`tata:session:${token}`);
      } catch (err) {
        console.warn("[Tata Storage] Redis deleteSession error:", err);
      }
    }
  }

  function extractBearerToken(req: express.Request): string | null {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.trim().split(" ");
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      return parts[1].trim();
    }
    return null;
  }

  // Helper to send OTP email via SMTP (e.g. Gmail / Brevo / Resend / custom SMTP) or test account
  async function sendOtpEmail(toEmail: string, code: string): Promise<{ sent: boolean; method: string; previewUrl?: string; error?: string }> {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    const emailSubject = `${code} adalah Kode Verifikasi Akun Tata Anda`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifikasi Akun Tata</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); text-align: left;">
          
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 16px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; font-weight: 900; font-size: 24px;">
              T
            </div>
            <h1 style="margin: 16px 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
              Verifikasi Akun Tata
            </h1>
            <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
              Sinkronisasi Akun Pengguna Tata
            </p>
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
            Halo, kami menerima permintaan untuk menghubungkan akun Google (<strong>${toEmail}</strong>) ke aplikasi Tata. Masukkan kode verifikasi 6 digit berikut pada aplikasi untuk menyelesaikan sinkronisasi:
          </p>

          <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 18px; padding: 24px; text-align: center; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 10px;">
              Kode Verifikasi OTP
            </div>
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #4338ca; padding: 4px 0;">
              ${code}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 10px; font-weight: 500;">
              ⏰ Berlaku selama 5 menit
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #475569; line-height: 1.5;">
            🔒 <strong>Keamanan & Privasi:</strong> Jangan pernah membagikan kode ini kepada siapa pun. Tim Tata tidak akan pernah meminta kode verifikasi Anda. Jika Anda tidak merasa meminta kode ini, silakan abaikan.
          </div>

          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 20px 0;" />

          <div style="text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">
              Tata — Offline & Privacy First Productivity
            </p>
            <p style="margin: 0;">
              Semua catatan, tugas, kalender, dan keuangan Anda tetap 100% tersimpan secara lokal di perangkat Anda.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. If SMTP credentials are configured, send real email directly to recipient
    if (smtpUser && smtpPass) {
      try {
        const isSecure = smtpPort === 465;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: isSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const fromAddress = process.env.SMTP_FROM || `"Tata App" <${smtpUser}>`;
        await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: emailSubject,
          text: `Kode verifikasi Akun Tata Anda adalah: ${code}. Berlaku 5 menit.`,
          html: emailHtml,
        });

        console.log(`[Tata Auth OTP] Real email successfully dispatched via SMTP to ${toEmail}`);
        return { sent: true, method: "smtp" };
      } catch (smtpErr: any) {
        console.error(`[Tata Auth OTP] Error sending via configured SMTP to ${toEmail}:`, smtpErr.message);
        return { sent: false, method: "smtp_error", error: smtpErr.message };
      }
    }

    // 2. If SMTP is not configured in environment (development/debug mode):
    // Log code strictly to server console for developer debugging only. NEVER send to client or API response!
    console.log(`[Tata Auth OTP Dev Mode] SMTP belum dikonfigurasi. Kode OTP untuk ${toEmail}: [${code}]. (Khusus debugging developer di console server, tidak pernah dikirim ke response API)`);
    return { sent: false, method: "console" };
  }

  // Request OTP for Google Account Sign-in
  app.post("/api/account/request-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ success: false, error: "invalid_email", message: "Alamat email Google tidak valid." });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingAccount = await getAccount(normalizedEmail);
      if (existingAccount && existingAccount.isBlocked) {
        return res.status(403).json({
          success: false,
          error: "account_blocked",
          message: "Akun diblokir",
          reason: existingAccount.blockedReason || "Akun Anda telah dinonaktifkan oleh administrator."
        });
      }

      // Environment validation: If SMTP_USER or SMTP_PASS is missing in production, reject immediately
      const isProduction = process.env.NODE_ENV === "production";
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (isProduction && (!smtpUser || !smtpPass)) {
        console.error(`[Tata Auth OTP Security] Penolakan request-otp di environment produksi: email service belum dikonfigurasi (SMTP_USER/SMTP_PASS kosong).`);
        return res.status(503).json({
          success: false,
          error: "email_service_unconfigured",
          message: "Email service belum dikonfigurasi. Silakan hubungi administrator untuk mengonfigurasi SMTP_USER dan SMTP_PASS."
        });
      }

      // Generate 6-digit numeric OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      // Code expires in 5 minutes (persisted to Redis / memory)
      await setOtp(normalizedEmail, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0
      });

      // Dispatch OTP email with 5s safety timeout
      const timeoutPromise = new Promise<{ sent: boolean; method: string; previewUrl?: string; error?: string }>((resolve) => {
        setTimeout(() => resolve({ sent: false, method: "timeout" }), 5000);
      });
      const emailResult = await Promise.race([sendOtpEmail(normalizedEmail, code), timeoutPromise]);

      if (emailResult.method === "smtp_error") {
        return res.status(502).json({
          success: false,
          error: "email_send_failed",
          message: "Gagal mengirim email verifikasi melalui SMTP. Silakan periksa konfigurasi email atau coba beberapa saat lagi."
        });
      }

      const successMessage = emailResult.method === "smtp"
        ? `Kode OTP telah dikirim ke kotak masuk email ${normalizedEmail}. Silakan periksa inbox atau folder spam Anda.`
        : `Permintaan verifikasi diterima. Email sedang diproses ke ${normalizedEmail}. Silakan periksa kotak masuk atau folder spam Anda.`;

      // CRITICAL SECURITY FIX:
      // Absolutely NO `otpCode` field in JSON response under ANY circumstances!
      return res.json({
        success: true,
        message: successMessage,
        email: normalizedEmail,
        deliveryMethod: emailResult.method,
        emailSent: emailResult.sent
      });
    } catch (e: any) {
      console.error("[Tata Request OTP Error]:", e);
      return res.status(500).json({ success: false, error: "otp_failed", message: e.message || "Gagal membuat kode OTP." });
    }
  });

  // Verify OTP for Google Account Sign-in
  app.post("/api/account/verify-otp", async (req, res) => {
    try {
      const secretCheck = checkSessionSecretConfig();
      if (!secretCheck.valid) {
        if (secretCheck.envName) {
          console.error(`[Tata Security] Konfigurasi server belum lengkap: Masalah pada variabel environment ${secretCheck.envName}.`);
        }
        return res.status(500).json({
          error: "server_configuration_error",
          message: `Konfigurasi server belum lengkap: ${secretCheck.error}`
        });
      }

      const { email, otp, name, avatarUrl, id } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "missing_fields", message: "Email dan kode OTP diperlukan." });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const stored = await getOtp(normalizedEmail);

      if (!stored) {
        return res.status(400).json({
          error: "otp_not_found",
          message: "Kode OTP tidak ditemukan atau telah kedaluwarsa. Silakan minta kode baru."
        });
      }

      if (Date.now() > stored.expiresAt) {
        await deleteOtp(normalizedEmail);
        return res.status(400).json({
          error: "otp_expired",
          message: "Kode OTP telah kedaluwarsa (maks. 5 menit). Silakan minta kode baru."
        });
      }

      stored.attempts += 1;
      if (stored.attempts > 5) {
        await deleteOtp(normalizedEmail);
        return res.status(429).json({
          error: "too_many_attempts",
          message: "Terlalu banyak percobaan salah. Silakan minta kode baru."
        });
      }

      if (String(stored.code).trim() !== String(otp).trim()) {
        await setOtp(normalizedEmail, stored);
        return res.status(400).json({
          error: "invalid_otp",
          message: "Kode OTP yang Anda masukkan salah. Silakan periksa kembali."
        });
      }

      // OTP is valid! Consume it
      await deleteOtp(normalizedEmail);

      // Now create or update the account in persistent storage
      let account = await getAccount(normalizedEmail);
      if (account && account.isBlocked) {
        return res.status(403).json({
          success: false,
          error: "account_blocked",
          message: "Akun diblokir",
          reason: account.blockedReason || "Akun Anda telah dinonaktifkan oleh administrator."
        });
      }
      const nowIso = new Date().toISOString();

      if (!account) {
        account = {
          userId: id || `tata_user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
          email: normalizedEmail,
          name: (name && String(name).trim()) || normalizedEmail.split('@')[0],
          avatarUrl: sanitizeAvatarUrl(avatarUrl, (name && String(name).trim()) || normalizedEmail.split('@')[0]),
          isPremium: false,
          premiumType: 'free',
          premiumExpiresAt: null,
          subscribedAt: undefined,
          transactions: [],
          createdAt: nowIso,
          lastLoginAt: nowIso
        };
      } else {
        account.lastLoginAt = nowIso;
        if (name) account.name = String(name).trim();
        if (avatarUrl) account.avatarUrl = sanitizeAvatarUrl(avatarUrl, account.name || account.email);
      }

      await setAccount(normalizedEmail, account);
      const token = await createSessionToken(normalizedEmail);

      res.json({
        success: true,
        message: "Verifikasi OTP berhasil!",
        account,
        token
      });
    } catch (e: any) {
      console.error("[Tata Verify OTP Error]:", e);
      res.status(500).json({ error: "verify_failed", message: e.message || "Gagal memverifikasi OTP." });
    }
  });

  // Google OAuth verification client
  const googleOAuthClient = new OAuth2Client();

  async function verifyGoogleIdToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    name?: string;
    picture?: string;
    userId?: string;
    error?: string;
  }> {
    const audience = (
      process.env.GOOGLE_CLIENT_ID || 
      process.env.VITE_GOOGLE_CLIENT_ID || 
      '657688833286-grcpnsga3fc82kdtcnr2qtkchiqkd8r8.apps.googleusercontent.com'
    ).trim();

    // 1. Primary: Verify cryptographically using google-auth-library
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: token,
        audience: audience || undefined,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return { valid: false, error: "ID token Google tidak memiliki email." };
      }
      if (payload.email_verified !== true) {
        return { valid: false, error: "Email akun Google belum diverifikasi oleh Google." };
      }
      return {
        valid: true,
        email: String(payload.email).toLowerCase().trim(),
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        userId: `google_${payload.sub}`
      };
    } catch (err: any) {
      // 2. Fallback: Verify via Google's official tokeninfo endpoint
      try {
        const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (resp.ok) {
          const payload: any = await resp.json();
          if (payload && payload.email) {
            if (audience && payload.aud !== audience) {
              return { valid: false, error: "Google token audience tidak cocok." };
            }
            if (payload.email_verified === false || payload.email_verified === 'false') {
              return { valid: false, error: "Email akun Google belum diverifikasi oleh Google." };
            }
            if (payload.exp && Date.now() >= payload.exp * 1000) {
              return { valid: false, error: "Token otentikasi Google telah kedaluwarsa." };
            }
            return {
              valid: true,
              email: String(payload.email).toLowerCase().trim(),
              name: payload.name || payload.email.split('@')[0],
              picture: payload.picture,
              userId: `google_${payload.sub}`
            };
          }
        }
      } catch (tokeninfoErr) {
        console.error("[Google Tokeninfo Fetch Error]:", tokeninfoErr);
      }
      return { valid: false, error: err.message || "Gagal memverifikasi ID token Google." };
    }
  }

  // Expose public Google Client ID to frontend dynamically
  app.get("/api/auth/google-client-id", (req, res) => {
    const clientId = (
      process.env.GOOGLE_CLIENT_ID || 
      process.env.VITE_GOOGLE_CLIENT_ID || 
      "657688833286-grcpnsga3fc82kdtcnr2qtkchiqkd8r8.apps.googleusercontent.com"
    ).trim();
    res.json({ clientId });
  });

  // Google Sign-In Auth handler for Tata Account (Strict Google Credential Verification Only)
  app.post("/api/account/google-auth", async (req, res) => {
    try {
      const secretCheck = checkSessionSecretConfig();
      if (!secretCheck.valid) {
        if (secretCheck.envName) {
          console.error(`[Tata Security] Konfigurasi server belum lengkap: Masalah pada variabel environment ${secretCheck.envName}.`);
        }
        return res.status(500).json({
          error: "server_configuration_error",
          message: `Konfigurasi server belum lengkap: ${secretCheck.error}`
        });
      }

      if (!validatePrivacyCompliance(req.body)) {
        return res.status(400).json({
          error: "privacy_violation",
          message: "Pelanggaran privasi: Server Akun Tata menolak data pribadi apa pun."
        });
      }

      const idToken = req.body.credential || req.body.idToken || req.body.token;

      // 1. WAJIB KREDENSIAL: Menolak klaim email polos tanpa token resmi Google
      if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
        return res.status(400).json({ 
          error: "missing_google_credential", 
          message: "Token kredensial resmi dari Google (credential) wajib disertakan untuk masuk." 
        });
      }

      // 2. VERIFIKASI RESMI: Kredensial diverifikasi langsung ke server Google
      const verification = await verifyGoogleIdToken(idToken.trim());
      if (!verification.valid || !verification.email) {
        return res.status(401).json({
          error: "invalid_google_token",
          message: verification.error || "Token otentikasi Google tidak valid atau verifikasi gagal."
        });
      }

      // 3. IDENTITAS HANYA DARI TOKEN TERVERIFIKASI (Bukan dari body permintaan)
      const normalizedEmail = verification.email;
      const verifiedName = verification.name || normalizedEmail.split('@')[0];
      const verifiedAvatar = verification.picture;
      const verifiedUserId = verification.userId || `google_${Date.now()}`;

      let account = await getAccount(normalizedEmail);
      if (account && account.isBlocked) {
        return res.status(403).json({
          success: false,
          error: "account_blocked",
          message: "Akun diblokir",
          reason: account.blockedReason || "Akun Anda telah dinonaktifkan oleh administrator."
        });
      }
      const nowIso = new Date().toISOString();

      if (!account) {
        account = {
          userId: verifiedUserId,
          email: normalizedEmail,
          name: verifiedName,
          avatarUrl: sanitizeAvatarUrl(verifiedAvatar, verifiedName),
          isPremium: false,
          premiumType: 'free',
          premiumExpiresAt: null,
          isTrial: false,
          trialUsed: false,
          trialExpiresAt: null,
          subscribedAt: undefined,
          transactions: [],
          createdAt: nowIso,
          lastLoginAt: nowIso
        };
      } else {
        account.lastLoginAt = nowIso;
        if (verifiedName) account.name = verifiedName;
        if (verifiedAvatar) account.avatarUrl = sanitizeAvatarUrl(verifiedAvatar, account.name || account.email);
      }

      // If the account had an active trial, verify if it expired
      if (account.isTrial && account.trialExpiresAt) {
        if (Date.now() > new Date(account.trialExpiresAt).getTime()) {
          account.isTrial = false;
          // Check if they have a real paid transaction
          const hasPaidSubscription = (account.transactions || []).some(
            t => t.status === 'success' && t.amount > 0 && t.paymentMethod !== 'google_account_trial'
          );
          if (!hasPaidSubscription) {
            account.isPremium = false;
            account.premiumType = 'free';
            account.premiumExpiresAt = null;
          }
        }
      }

      // CRITICAL REQUIREMENT: Always evaluate isPremium from authoritative server state, never from client input
      let isStillPremium = false;
      if (account.isPremium) {
        if (account.premiumType === 'lifetime') {
          isStillPremium = true;
        } else if (account.premiumExpiresAt) {
          const expTime = new Date(account.premiumExpiresAt).getTime();
          isStillPremium = !isNaN(expTime) && Date.now() <= expTime;
        } else {
          isStillPremium = false;
        }
      }
      account.isPremium = isStillPremium;

      await setAccount(normalizedEmail, account);
      const token = await createSessionToken(normalizedEmail);

      res.json({ 
        success: true, 
        account, 
        token,
        isPremium: account.isPremium,
        isTrial: Boolean(account.isTrial),
        message: account.isTrial
          ? "Uji coba gratis Tata Pro Max aktif."
          : (account.isPremium ? "Akun Google terverifikasi! Status Tata Pro aktif." : "Akun Google berhasil diverifikasi. Paket Lite aktif.")
      });
    } catch (e: any) {
      console.error("[Tata Account Auth Error]:", e);
      res.status(500).json({ error: "auth_failed", message: e.message || "Gagal masuk ke Akun Tata." });
    }
  });

  // Get current account profile & status (Protected: Requires Bearer Token)
  app.get("/api/account/profile", async (req, res) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({
          error: "unauthorized",
          message: "Token otentikasi diperlukan. Silakan sertakan header Authorization: Bearer <token>."
        });
      }

      const session = await getSession(token);
      if (!session) {
        return res.status(401).json({
          error: "invalid_session",
          message: "Sesi Anda tidak valid atau telah kedaluwarsa. Silakan masuk kembali."
        });
      }

      const requestedEmail = req.query.email as string;
      if (requestedEmail) {
        const normalizedRequested = String(requestedEmail).trim().toLowerCase();
        if (normalizedRequested !== session.email) {
          return res.status(403).json({
            error: "forbidden",
            message: "Akses ditolak: Anda tidak memiliki izin untuk melihat profil akun ini."
          });
        }
      }

      let account = await getAccount(session.email);
      if (!account) {
        const nowIso = new Date().toISOString();
        account = {
          userId: `tata_user_${Date.now().toString(36)}`,
          email: session.email,
          name: session.email.split('@')[0],
          avatarUrl: generateInitialsAvatar(session.email.split('@')[0]),
          isPremium: false,
          premiumType: 'free',
          premiumExpiresAt: null,
          transactions: [],
          createdAt: nowIso,
          lastLoginAt: nowIso
        };
        await setAccount(session.email, account);
      }

      // Check if trial has expired
      if (account.isTrial && account.trialExpiresAt) {
        if (Date.now() > new Date(account.trialExpiresAt).getTime()) {
          account.isTrial = false;
          const hasPaidSubscription = (account.transactions || []).some(
            t => t.status === 'success' && t.amount > 0 && t.paymentMethod !== 'google_account_trial'
          );
          if (!hasPaidSubscription) {
            account.isPremium = false;
            account.premiumType = 'free';
            account.premiumExpiresAt = null;
          }
          await setAccount(session.email, account);
        }
      }

      // Check if subscription has expired
      if (account.isPremium && account.premiumType !== 'lifetime') {
        const expTime = account.premiumExpiresAt ? new Date(account.premiumExpiresAt).getTime() : NaN;
        if (isNaN(expTime) || Date.now() > expTime) {
          account.isPremium = false;
          await setAccount(session.email, account);
        }
      }

      res.json({ success: true, account });
    } catch (e: any) {
      console.error("[Tata Profile Error]:", e);
      res.status(500).json({ error: "fetch_failed", message: e.message });
    }
  });

  // Explicit endpoint to activate 6-day trial (Disabled - All free accounts are Lite automatically)
  app.post("/api/account/activate-trial", async (req, res) => {
    return res.status(503).json({
      success: false,
      error: "trial_disabled",
      message: "Fitur uji coba gratis tidak tersedia. Seluruh akun gratis otomatis berstatus paket Lite."
    });
  });

  // =========================================================================
  // MIDTRANS PAYMENT GATEWAY & SECURE VERIFICATION HELPERS
  // =========================================================================
  const claimedOrdersMem = new Map<string, string>(); // orderId -> email
  const pendingOrdersMem = new Map<string, any>(); // orderId -> metadata

  const orderClaimLocks = new Map<string, Promise<any>>();

  async function isOrderClaimed(orderId: string): Promise<boolean> {
    const claimant = await getOrderClaimant(orderId);
    return Boolean(claimant);
  }

  async function getOrderClaimant(orderId: string): Promise<string | null> {
    const redis = getRedis();
    if (redis) {
      try {
        const res = await redis.get<any>(`tata:claimed_order:${orderId}`);
        if (res) {
          const parsed = typeof res === 'string' ? JSON.parse(res) : res;
          return parsed && parsed.email ? String(parsed.email).toLowerCase() : null;
        }
      } catch (err) {
        console.warn("[Tata Payment] Redis getOrderClaimant error:", err);
      }
    }
    const email = claimedOrdersMem.get(orderId);
    return email ? email.toLowerCase() : null;
  }

  async function claimOrderAtomically(
    orderId: string,
    email: string
  ): Promise<{ success: boolean; claimant: string | null }> {
    const normalizedEmail = email.trim().toLowerCase();

    // In-memory mutex per orderId to serialize concurrent requests
    while (orderClaimLocks.has(orderId)) {
      await orderClaimLocks.get(orderId);
    }

    let resolveLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    orderClaimLocks.set(orderId, lockPromise);

    try {
      const redis = getRedis();
      if (redis) {
        try {
          const payload = JSON.stringify({ email: normalizedEmail, claimedAt: new Date().toISOString() });
          const res = await redis.set(`tata:claimed_order:${orderId}`, payload, { nx: true });
          if (res === "OK") {
            claimedOrdersMem.set(orderId, normalizedEmail);
            return { success: true, claimant: normalizedEmail };
          }
          const existing = await redis.get<any>(`tata:claimed_order:${orderId}`);
          const parsed = typeof existing === 'string' ? JSON.parse(existing) : existing;
          const currentClaimant = parsed?.email ? String(parsed.email).toLowerCase() : null;
          if (currentClaimant) claimedOrdersMem.set(orderId, currentClaimant);
          return { success: currentClaimant === normalizedEmail, claimant: currentClaimant };
        } catch (err) {
          console.warn("[Tata Payment] Redis claimOrderAtomically error, fallback to memory:", err);
        }
      }

      if (claimedOrdersMem.has(orderId)) {
        const claimant = claimedOrdersMem.get(orderId)!.toLowerCase();
        return { success: claimant === normalizedEmail, claimant };
      }

      claimedOrdersMem.set(orderId, normalizedEmail);
      return { success: true, claimant: normalizedEmail };
    } finally {
      orderClaimLocks.delete(orderId);
      resolveLock();
    }
  }

  async function markOrderClaimed(orderId: string, email: string): Promise<void> {
    await claimOrderAtomically(orderId, email);
  }

  async function savePendingOrder(orderId: string, orderData: any): Promise<void> {
    pendingOrdersMem.set(orderId, orderData);
    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`tata:pending_order:${orderId}`, orderData, { ex: 86400 });
      } catch (err) {
        console.warn("[Tata Payment] Redis savePendingOrder error:", err);
      }
    }
  }

  async function getPendingOrder(orderId: string): Promise<any | null> {
    const redis = getRedis();
    if (redis) {
      try {
        const res = await redis.get<any>(`tata:pending_order:${orderId}`);
        if (res) return typeof res === 'string' ? JSON.parse(res) : res;
      } catch (err) {
        console.warn("[Tata Payment] Redis getPendingOrder error:", err);
      }
    }
    return pendingOrdersMem.get(orderId) || null;
  }

  // =========================================================================
  // PROMO CODE VOUCHER & DISCOUNT STORAGE (REDIS & DISK FALLBACK)
  // =========================================================================
  // PROMO CODE VOUCHER & DISCOUNT STORAGE (PERSISTEN DI REDIS)
  // =========================================================================
  interface PromoCodeRecord {
    code: string;
    type?: 'free' | 'discount';
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    tier?: 'pro' | 'pro_max';
    planName?: string;
    durationDays?: number | null;
    maxUses?: number | null;
    usedCount?: number;
    expiresAt?: string | null;
    usedBy?: string[];
  }

  const promoCodesMem = new Map<string, PromoCodeRecord>();
  let isPromoSeeded = false;

  function getLocalPromoFallback(clean: string): PromoCodeRecord | null {
    const builtin: Record<string, PromoCodeRecord> = {
      TATAPROMAX: {
        code: 'TATAPROMAX',
        type: 'free',
        tier: 'pro_max',
        planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)',
        durationDays: null,
        maxUses: 999999,
        usedCount: 0,
        usedBy: []
      },
      TATAGRATIS: {
        code: 'TATAGRATIS',
        type: 'free',
        tier: 'pro_max',
        planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)',
        durationDays: null,
        maxUses: 999999,
        usedCount: 0,
        usedBy: []
      },
      TATABEBAS: {
        code: 'TATABEBAS',
        type: 'free',
        tier: 'pro_max',
        planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)',
        durationDays: null,
        maxUses: 999999,
        usedCount: 0,
        usedBy: []
      },
      DISKON20: {
        code: 'DISKON20',
        type: 'discount',
        discountType: 'percent',
        discountValue: 20,
        maxUses: 100,
        usedCount: 0,
        usedBy: []
      }
    };
    if (builtin[clean]) return builtin[clean];
    try {
      const PROMO_CODES_FILE = path.join(process.cwd(), 'data', 'promo_codes.json');
      if (fs.existsSync(PROMO_CODES_FILE)) {
        const content = fs.readFileSync(PROMO_CODES_FILE, 'utf-8');
        const parsed = JSON.parse(content || '{}');
        if (parsed && parsed[clean]) {
          return { ...parsed[clean], code: clean };
        }
      }
    } catch {}
    return null;
  }

  async function ensurePromoCodesSeeded(redis: Redis): Promise<void> {
    if (isPromoSeeded) return;
    try {
      const seeded = await redis.get<string | boolean>("tata:promo:seeded");
      if (seeded) {
        isPromoSeeded = true;
        return;
      }

      // Pindahkan (seed) isi data/promo_codes.json yang ada sekarang ke Redis (hanya 1x)
      const PROMO_CODES_FILE = path.join(process.cwd(), 'data', 'promo_codes.json');
      let codesObj: Record<string, any> = {};
      if (fs.existsSync(PROMO_CODES_FILE)) {
        try {
          const content = fs.readFileSync(PROMO_CODES_FILE, 'utf-8');
          codesObj = JSON.parse(content || '{}');
        } catch (e) {
          console.warn("[Tata Promo] Error membaca promo_codes.json:", e);
        }
      }
      if (process.env.TATA_PROMO_CODES_JSON) {
        try {
          const envParsed = JSON.parse(process.env.TATA_PROMO_CODES_JSON);
          codesObj = { ...codesObj, ...envParsed };
        } catch (e) {}
      }

      for (const [k, v] of Object.entries(codesObj)) {
        const clean = k.trim().toUpperCase();
        const promo = v as PromoCodeRecord;
        const metaToSave: PromoCodeRecord = {
          code: clean,
          type: promo.type || (promo.discountType ? 'discount' : 'free'),
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          tier: promo.tier,
          planName: promo.planName,
          durationDays: promo.durationDays ?? null,
          maxUses: promo.maxUses ?? null,
          expiresAt: promo.expiresAt ?? null
        };

        // Simpan metadata ke Redis
        await redis.set(`tata:promo:meta:${clean}`, JSON.stringify(metaToSave), { nx: true });

        // Inisialisasi counter pemakaian di Redis
        await redis.set(`tata:promo:used_count:${clean}`, promo.usedCount || 0, { nx: true });

        // Inisialisasi set pengguna pemakai di Redis (SADD)
        if (Array.isArray(promo.usedBy) && promo.usedBy.length > 0) {
          for (const u of promo.usedBy) {
            if (u && typeof u === 'string') {
              await redis.sadd(`tata:promo:used_users:${clean}`, u.trim().toLowerCase());
            }
          }
        }

        // Backward compatibility
        await redis.set(`tata:promo:${clean}`, JSON.stringify({ ...metaToSave, usedCount: promo.usedCount || 0, usedBy: promo.usedBy || [] }), { nx: true });
        promoCodesMem.set(clean, { ...metaToSave, usedCount: promo.usedCount || 0, usedBy: promo.usedBy || [] });
      }

      await redis.set("tata:promo:seeded", "true");
      isPromoSeeded = true;
      console.log("[Tata Promo] Daftar kode promo resmi berhasil dipindahkan (seed) ke Redis persisten.");
    } catch (err) {
      console.warn("[Tata Promo] Gagal melakukan seed kode promo ke Redis:", err);
    }
  }

  // Auto-seed promo codes saat server dimulai jika Redis aktif
  const startupRedis = getRedis();
  if (startupRedis) {
    ensurePromoCodesSeeded(startupRedis).catch(() => {});
  }

  async function getPromoRecord(code: string): Promise<PromoCodeRecord | null> {
    if (!code || typeof code !== 'string') return null;
    const clean = code.trim().toUpperCase();
    const redis = getRedis();

    if (redis) {
      try {
        await ensurePromoCodesSeeded(redis);

        let metaRaw = await redis.get<any>(`tata:promo:meta:${clean}`);
        if (!metaRaw) {
          metaRaw = await redis.get<any>(`tata:promo:${clean}`);
        }

        if (!metaRaw) {
          const fallbackPromo = getLocalPromoFallback(clean);
          if (fallbackPromo) {
            await savePromoRecord(clean, fallbackPromo);
            return fallbackPromo;
          }
        }

        if (metaRaw) {
          const meta: PromoCodeRecord = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;

          // Ambil hitungan pemakaian dari Redis
          const countRaw = await redis.get<any>(`tata:promo:used_count:${clean}`);
          const usedCount = countRaw !== null && countRaw !== undefined ? parseInt(String(countRaw), 10) || 0 : (meta.usedCount || 0);

          // Ambil daftar pengguna pemakai dari Redis Set (SMEMBERS)
          let usedBy: string[] = [];
          try {
            const members = await redis.smembers(`tata:promo:used_users:${clean}`);
            if (Array.isArray(members)) {
              usedBy = members.map(m => String(m).toLowerCase());
            }
          } catch {
            usedBy = meta.usedBy || [];
          }

          const fullRecord: PromoCodeRecord = {
            ...meta,
            code: clean,
            usedCount,
            usedBy
          };
          promoCodesMem.set(clean, fullRecord);
          return fullRecord;
        }
        return null;
      } catch (err) {
        console.warn("[Tata Promo] Redis getPromoRecord error:", err);
        const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (isProduction) {
          throw err;
        }
      }
    }

    // In-memory fallback khusus dev / non-produksi jika Redis belum terpasang
    if (promoCodesMem.has(clean)) {
      return promoCodesMem.get(clean)!;
    }

    try {
      const PROMO_CODES_FILE = path.join(process.cwd(), 'data', 'promo_codes.json');
      if (fs.existsSync(PROMO_CODES_FILE)) {
        const content = fs.readFileSync(PROMO_CODES_FILE, 'utf-8');
        const parsed = JSON.parse(content || '{}');
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            promoCodesMem.set(k.toUpperCase(), { ...(v as any), code: k.toUpperCase() });
          }
        }
      }
      if (process.env.TATA_PROMO_CODES_JSON) {
        const envParsed = JSON.parse(process.env.TATA_PROMO_CODES_JSON);
        if (envParsed && typeof envParsed === 'object') {
          for (const [k, v] of Object.entries(envParsed)) {
            promoCodesMem.set(k.toUpperCase(), { ...(v as any), code: k.toUpperCase() });
          }
        }
      }
    } catch (e) {
      console.warn("[Tata Promo] Fallback promo load error:", e);
    }

    const local = promoCodesMem.get(clean);
    if (local) return local;
    const fallback = getLocalPromoFallback(clean);
    if (fallback) {
      promoCodesMem.set(clean, fallback);
      return fallback;
    }
    return null;
  }

  async function savePromoRecord(code: string, record: PromoCodeRecord): Promise<void> {
    const clean = code.trim().toUpperCase();
    const toSave: PromoCodeRecord = { ...record, code: clean };
    promoCodesMem.set(clean, toSave);

    const redis = getRedis();
    if (redis) {
      try {
        await redis.set(`tata:promo:meta:${clean}`, JSON.stringify({
          code: clean,
          type: toSave.type || (toSave.discountType ? 'discount' : 'free'),
          discountType: toSave.discountType,
          discountValue: toSave.discountValue,
          tier: toSave.tier,
          planName: toSave.planName,
          durationDays: toSave.durationDays ?? null,
          maxUses: toSave.maxUses ?? null,
          expiresAt: toSave.expiresAt ?? null
        }));
        await redis.set(`tata:promo:used_count:${clean}`, toSave.usedCount || 0);
        await redis.del(`tata:promo:used_users:${clean}`);
        if (Array.isArray(toSave.usedBy) && toSave.usedBy.length > 0) {
          for (const u of toSave.usedBy) {
            if (u && typeof u === 'string') {
              await redis.sadd(`tata:promo:used_users:${clean}`, u.trim().toLowerCase());
            }
          }
        }
        await redis.set(`tata:promo:${clean}`, JSON.stringify(toSave));
      } catch (err) {
        console.warn("[Tata Promo] Redis savePromoRecord error:", err);
        const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (isProduction) {
          throw err;
        }
      }
    }

    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    if (isProduction) return; // Nonaktifkan penulisan disk lokal di produksi

    try {
      const dir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const PROMO_CODES_FILE = path.join(dir, 'promo_codes.json');
      const currentObj: Record<string, any> = {};
      for (const [k, v] of promoCodesMem.entries()) {
        currentObj[k] = v;
      }
      fs.promises.writeFile(PROMO_CODES_FILE, JSON.stringify(currentObj, null, 2), 'utf-8').catch(() => {});
    } catch (e) {
      console.warn("[Tata Promo] Disk savePromoRecord error:", e);
    }
  }

  async function recordPromoUsage(code: string, email: string): Promise<boolean> {
    const clean = code.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const redis = getRedis();

    if (redis) {
      try {
        const added = await redis.sadd(`tata:promo:used_users:${clean}`, normalizedEmail);
        if (added === 1) {
          await redis.incr(`tata:promo:used_count:${clean}`);
        }
        return true;
      } catch (err) {
        console.warn("[Tata Promo] Redis recordPromoUsage error:", err);
        const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
        if (isProduction) {
          throw err;
        }
      }
    }

    const promo = promoCodesMem.get(clean);
    if (promo) {
      promo.usedBy = promo.usedBy || [];
      if (!promo.usedBy.map(e => e.toLowerCase()).includes(normalizedEmail)) {
        promo.usedBy.push(normalizedEmail);
        promo.usedCount = (promo.usedCount || 0) + 1;
      }
    }
    return true;
  }

  // Mutex per kode promo untuk mencegah race-condition concurrency
  const promoMutexLocks = new Map<string, Promise<any>>();

  async function claimPromoVoucherAtomically(
    rawCode: string,
    rawEmail: string
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    promo?: PromoCodeRecord;
    rollback?: () => Promise<void>;
  }> {
    const cleanCode = rawCode.trim().toUpperCase();
    const normalizedEmail = rawEmail.trim().toLowerCase();

    // 1. Process-level mutex untuk serialisasi permintaan bersamaan dalam proses yang sama
    while (promoMutexLocks.has(cleanCode)) {
      await promoMutexLocks.get(cleanCode);
    }
    let resolveLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    promoMutexLocks.set(cleanCode, lockPromise);

    try {
      const redis = getRedis();
      const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

      if (redis) {
        await ensurePromoCodesSeeded(redis).catch(() => {});

        let metaRaw = await redis.get<any>(`tata:promo:meta:${cleanCode}`);
        if (!metaRaw) {
          metaRaw = await redis.get<any>(`tata:promo:${cleanCode}`);
        }

        if (!metaRaw) {
          return {
            success: false,
            error: "invalid_code",
            message: "Kode promo voucher tidak valid atau sudah kedaluwarsa."
          };
        }

        const promo: PromoCodeRecord = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;

        if (promo.type === 'discount' || Boolean(promo.discountType)) {
          return {
            success: false,
            error: "discount_voucher",
            message: `Kode "${cleanCode}" adalah kupon diskon pembayaran (${promo.discountValue}${promo.discountType === 'percent' ? '%' : ' IDR'}). Gunakan kode ini pada layar pembayaran saat memilih paket.`
          };
        }

        if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
          return {
            success: false,
            error: "code_expired",
            message: "Kode promo voucher ini telah kedaluwarsa."
          };
        }

        // Periksa apakah akun ini sudah pernah mengklaim voucher ini (SISMEMBER)
        const isMember = await redis.sismember(`tata:promo:used_users:${cleanCode}`, normalizedEmail);
        if (isMember === 1) {
          return {
            success: false,
            error: "already_claimed",
            message: `Akun Anda (${normalizedEmail}) sudah pernah mengklaim voucher ini sebelumnya.`
          };
        }

        // Operasi Atomik 1: SADD user ke set pemakai
        const added = await redis.sadd(`tata:promo:used_users:${cleanCode}`, normalizedEmail);
        if (added === 0) {
          return {
            success: false,
            error: "already_claimed",
            message: `Akun Anda (${normalizedEmail}) sudah pernah mengklaim voucher ini sebelumnya.`
          };
        }

        // Operasi Atomik 2: INCR counter pemakaian
        const newCount = await redis.incr(`tata:promo:used_count:${cleanCode}`);

        // Periksa kuota maxUses
        if (promo.maxUses && newCount > promo.maxUses) {
          // Revert / rollback kuota & user
          await redis.decr(`tata:promo:used_count:${cleanCode}`).catch(() => {});
          await redis.srem(`tata:promo:used_users:${cleanCode}`, normalizedEmail).catch(() => {});
          return {
            success: false,
            error: "code_depleted",
            message: "Kode promo voucher ini telah mencapai batas kuota penggunaan."
          };
        }

        // Fungsi rollback jika tahap penyimpanan akun selanjutnya gagal
        const rollback = async () => {
          try {
            await redis.decr(`tata:promo:used_count:${cleanCode}`);
            await redis.srem(`tata:promo:used_users:${cleanCode}`, normalizedEmail);
          } catch (rErr) {
            console.error("[Tata Promo Rollback Error]:", rErr);
          }
        };

        return {
          success: true,
          promo,
          rollback
        };
      }

      // Fallback in-memory & disk storage jika Redis tidak terpasang
      let promo = promoCodesMem.get(cleanCode);
      if (!promo) {
        promo = await getPromoRecord(cleanCode);
      }
      if (!promo) {
        promo = getLocalPromoFallback(cleanCode);
      }
      if (!promo) {
        return {
          success: false,
          error: "invalid_code",
          message: "Kode promo voucher tidak valid atau sudah kedaluwarsa."
        };
      }

      if (promo.type === 'discount' || Boolean(promo.discountType)) {
        return {
          success: false,
          error: "discount_voucher",
          message: `Kode "${cleanCode}" adalah kupon diskon pembayaran (${promo.discountValue}${promo.discountType === 'percent' ? '%' : ' IDR'}). Gunakan kode ini pada layar pembayaran saat memilih paket.`
        };
      }

      if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
        return {
          success: false,
          error: "code_expired",
          message: "Kode promo voucher ini telah kedaluwarsa."
        };
      }

      promo.usedBy = promo.usedBy || [];
      if (promo.usedBy.map(e => e.toLowerCase()).includes(normalizedEmail)) {
        return {
          success: false,
          error: "already_claimed",
          message: `Akun Anda (${normalizedEmail}) sudah pernah mengklaim voucher ini sebelumnya.`
        };
      }

      if (promo.maxUses && (promo.usedCount || 0) >= promo.maxUses) {
        return {
          success: false,
          error: "code_depleted",
          message: "Kode promo voucher ini telah mencapai batas kuota penggunaan."
        };
      }

      promo.usedCount = (promo.usedCount || 0) + 1;
      promo.usedBy.push(normalizedEmail);

      const rollback = async () => {
        promo.usedCount = Math.max(0, (promo.usedCount || 1) - 1);
        const idx = promo.usedBy ? promo.usedBy.indexOf(normalizedEmail) : -1;
        if (idx !== -1) promo.usedBy!.splice(idx, 1);
      };

      return {
        success: true,
        promo,
        rollback
      };
    } catch (err: any) {
      console.error("[Tata Promo Claim Error]:", err);
      return {
        success: false,
        error: "storage_error",
        message: "Gangguan pada database penyimpanan promo. Tidak ada voucher yang diberikan."
      };
    } finally {
      promoMutexLocks.delete(cleanCode);
      resolveLock();
    }
  }

  // Saklar Pembayaran Utama (Midtrans Gateway) - Default: false
  const isPaymentsEnabled = () => process.env.PAYMENTS_ENABLED === 'true';

  function getMidtransConfig() {
    const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
    const clientKey = (process.env.MIDTRANS_CLIENT_KEY || process.env.VITE_MIDTRANS_CLIENT_KEY || '').trim();
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const apiHost = isProduction ? 'api.midtrans.com' : 'api.sandbox.midtrans.com';
    const snapHost = isProduction ? 'app.midtrans.com' : 'app.sandbox.midtrans.com';
    return { serverKey, clientKey, isProduction, apiHost, snapHost, paymentsEnabled: isPaymentsEnabled() };
  }

  // Endpoint untuk mengecek status saklar pembayaran dari frontend
  app.get("/api/payment/config", (req, res) => {
    res.json({
      paymentsEnabled: isPaymentsEnabled()
    });
  });

  // Validasi & Hitung Diskon Kode Promo di Server (Single Source of Truth)
  app.post("/api/payment/check-promo", async (req, res) => {
    try {
      const { code, plan } = req.body;
      const cleanCode = String(code || '').trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ error: "missing_code", message: "Kode promo wajib diisi." });
      }

      let userEmail: string | null = null;
      const token = extractBearerToken(req);
      if (token) {
        const session = await getSession(token);
        if (session && session.email) {
          userEmail = session.email.toLowerCase();
        }
      }
      if (!userEmail && req.body.email && typeof req.body.email === 'string') {
        userEmail = req.body.email.trim().toLowerCase();
      }

      const promo = await getPromoRecord(cleanCode);
      if (!promo) {
        return res.status(400).json({
          error: "invalid_code",
          message: "Kode promo tidak valid atau tidak ditemukan."
        });
      }

      if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({
          error: "code_expired",
          message: "Kode promo ini telah kedaluwarsa."
        });
      }

      if (promo.maxUses && (promo.usedCount || 0) >= promo.maxUses) {
        return res.status(400).json({
          error: "code_depleted",
          message: "Batas kuota penggunaan kode promo ini telah habis."
        });
      }

      if (userEmail && promo.usedBy && promo.usedBy.map(e => e.toLowerCase()).includes(userEmail)) {
        return res.status(400).json({
          error: "already_used",
          message: `Akun Anda (${userEmail}) sudah pernah menggunakan kode promo ini sebelumnya.`
        });
      }

      const isDiscount = promo.type === 'discount' || Boolean(promo.discountType);
      if (!isDiscount) {
        return res.json({
          valid: true,
          type: 'free',
          code: cleanCode,
          tier: promo.tier || 'pro_max',
          planName: promo.planName || 'Tata Pro Max (Voucher)',
          isLifetime: promo.durationDays === null || promo.durationDays === undefined,
          message: `Voucher "${cleanCode}" valid untuk aktivasi lisensi ${promo.planName || 'Tata Pro Max'}.`
        });
      }

      const canonicalPlan = getCanonicalPlan(plan);
      if (!canonicalPlan) {
        return res.status(400).json({ error: "invalid_plan", message: "Paket langganan tidak dikenal." });
      }
      if (isDiscount) {
        const discountResult = calculateDiscount(
          canonicalPlan.price,
          promo.discountType || 'percent',
          promo.discountValue || 0
        );

        return res.json({
          valid: true,
          type: 'discount',
          code: cleanCode,
          planId: canonicalPlan.id,
          planName: canonicalPlan.name,
          originalAmount: canonicalPlan.price,
          discountAmount: discountResult.discountAmount,
          finalAmount: discountResult.finalAmount,
          discountType: promo.discountType || 'percent',
          discountValue: promo.discountValue || 0,
          message: `Diskon ${promo.discountValue}${promo.discountType === 'percent' ? '%' : ' IDR'} berhasil diterapkan!`
        });
      }

      // Voucher klaim gratis 100%
      return res.json({
        valid: true,
        type: 'free',
        code: cleanCode,
        tier: promo.tier || 'pro',
        durationDays: promo.durationDays ?? null,
        planName: promo.planName || (promo.tier === 'pro_max' ? 'Tata Pro Max' : 'Tata Pro'),
        message: "Kode promo adalah voucher langganan gratis."
      });
    } catch (e: any) {
      console.error("[Check Promo Error]:", e);
      return res.status(500).json({ error: "check_promo_failed", message: e.message });
    }
  });

  // Khusus Pengujian Lingkungan Pengembangan: Daftarkan kode promo langsung
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/set-promo", async (req, res) => {
      const { code, promo } = req.body;
      if (!code || !promo) return res.status(400).json({ error: "missing_params" });
      await savePromoRecord(code, promo);
      res.json({ success: true, code, promo });
    });

    app.post("/api/dev/set-session", async (req, res) => {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "missing_email" });
      const token = await createSessionToken(email.toLowerCase().trim());
      res.json({ success: true, token, email });
    });

    app.post("/api/dev/set-account", async (req, res) => {
      const { email, account } = req.body;
      if (!email || !account) return res.status(400).json({ error: "missing_params" });
      await setAccount(email.toLowerCase().trim(), account);
      res.json({ success: true, account });
    });
  }

  // SATU SUMBER DATA RESMI PAKET TATA (CANONICAL)
  // Menjamin sinkronisasi antara backend dan frontend melalui modul src/plans.ts
  function getPlanDetails(plan: string) {
    const canonical = getCanonicalPlan(plan);
    if (!canonical) return null;
    return {
      id: canonical.id,
      amount: canonical.price,
      price: canonical.price,
      planName: canonical.name,
      name: canonical.name,
      durationDays: canonical.durationDays,
      tier: canonical.tier
    };
  }

  interface MidtransVerificationResult {
    valid: boolean;
    error?: string;
    transactionStatus?: string;
    paymentType?: string;
    grossAmount?: number;
    transactionId?: string;
    paidAt?: string;
  }

  async function verifyMidtransPayment(
    orderId: string,
    expectedAmount: number
  ): Promise<MidtransVerificationResult> {
    const { serverKey, apiHost } = getMidtransConfig();
    if (serverKey.startsWith("mock_") || process.env.MIDTRANS_MOCK === "true") {
      return {
        valid: true,
        transactionStatus: 'settlement',
        paymentType: 'midtrans_qris',
        grossAmount: expectedAmount,
        transactionId: `mock_txn_${orderId}`,
        paidAt: new Date().toISOString()
      };
    }
    if (!serverKey) {
      return {
        valid: false,
        error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi di server. Silakan hubungi administrator atau pasang MIDTRANS_SERVER_KEY di pengaturan environment.'
      };
    }

    const basicAuth = Buffer.from(`${serverKey}:`).toString('base64');
    const url = `https://${apiHost}/v2/${encodeURIComponent(orderId)}/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${basicAuth}`
        }
      });

      if (response.status === 404) {
        return {
          valid: false,
          error: `Order ID "${orderId}" tidak ditemukan di server resmi Midtrans. Pembayaran belum dibuat atau nomor order salah.`
        };
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          valid: false,
          error: `Gagal memverifikasi bukti pembayaran ke server resmi Midtrans (HTTP ${response.status}): ${errText || 'Terjadi kesalahan sistem'}`
        };
      }

      const data: any = await response.json();
      const status = data.transaction_status;
      const fraudStatus = data.fraud_status;

      const isSettled =
        status === 'settlement' ||
        (status === 'capture' && (!fraudStatus || fraudStatus === 'accept'));

      if (!isSettled) {
        let explanation = `Status transaksi di server Midtrans adalah "${status}".`;
        if (status === 'pending') {
          explanation = 'Pembayaran masih berstatus pending. Harap selesaikan pembayaran QRIS / transfer terlebih dahulu sebelum verifikasi.';
        } else if (status === 'expire') {
          explanation = 'Transaksi telah kedaluwarsa (expired). Silakan buat transaksi pembayaran baru.';
        } else if (status === 'cancel' || status === 'deny') {
          explanation = 'Transaksi telah dibatalkan atau ditolak.';
        }
        return {
          valid: false,
          transactionStatus: status,
          error: explanation
        };
      }

      const paidAmount = Math.round(parseFloat(data.gross_amount || '0'));
      if (paidAmount < expectedAmount) {
        return {
          valid: false,
          error: `Nominal pembayaran (Rp ${paidAmount.toLocaleString('id-ID')}) tidak sesuai dengan paket yang dipilih (Rp ${expectedAmount.toLocaleString('id-ID')}).`
        };
      }

      return {
        valid: true,
        transactionStatus: status,
        paymentType: data.payment_type || 'midtrans_qris',
        grossAmount: paidAmount,
        transactionId: data.transaction_id || `txn_${Date.now()}`,
        paidAt: data.settlement_time || data.transaction_time || new Date().toISOString()
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Koneksi ke server resmi Midtrans gagal: ${err.message}`
      };
    }
  }

  interface GooglePlayVerificationResult {
    valid: boolean;
    error?: string;
    purchaseState?: number;
    orderId?: string;
    transactionId?: string;
    paidAt?: string;
    productId?: string;
  }

  async function verifyGooglePlayPurchase(
    purchaseToken: string,
    productId: string,
    packageName: string = 'com.tata.app'
  ): Promise<GooglePlayVerificationResult> {
    const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      return {
        valid: false,
        error: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON belum dikonfigurasi di server. Silakan sediakan kredensial Service Account Google Cloud di environment untuk verifikasi token Google Play.'
      };
    }

    try {
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
      });
      const client = await auth.getClient();
      const tokenRes = await client.getAccessToken();

      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenRes.token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          valid: false,
          error: `Verifikasi ke Google Play Developer API gagal (HTTP ${response.status}): ${errorText || 'purchaseToken tidak valid atau telah dibatalkan'}`
        };
      }

      const data: any = await response.json();
      // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
      if (data.purchaseState !== 0) {
        return {
          valid: false,
          purchaseState: data.purchaseState,
          error: data.purchaseState === 1
            ? 'Pembelian telah dibatalkan (refunded/canceled) di Google Play.'
            : 'Pembelian di Google Play masih berstatus pending / belum selesai.'
        };
      }

      return {
        valid: true,
        purchaseState: 0,
        orderId: data.orderId || `GPA.${purchaseToken.slice(0, 16)}`,
        transactionId: data.orderId || `GPA-${purchaseToken.slice(0, 12)}`,
        paidAt: data.purchaseTimeMillis ? new Date(parseInt(data.purchaseTimeMillis, 10)).toISOString() : new Date().toISOString(),
        productId
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Koneksi ke Google Play Developer API gagal: ${err.message}`
      };
    }
  }

  // Create Midtrans Snap Payment Order
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      if (!isPaymentsEnabled()) {
        return res.status(503).json({
          success: false,
          error: "payments_disabled",
          message: "Pembayaran belum tersedia"
        });
      }

      if (!validatePrivacyCompliance(req.body)) {
        return res.status(400).json({ error: "privacy_violation" });
      }

      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({
          error: "unauthorized",
          message: "Otentikasi akun diperlukan untuk membuat pesanan pembayaran."
        });
      }

      const session = await getSession(token);
      if (!session) {
        return res.status(401).json({
          error: "invalid_session",
          message: "Sesi tidak valid. Silakan masuk kembali."
        });
      }

      const { plan, promoCode } = req.body;
      const canonicalPlan = getCanonicalPlan(plan);
      if (!canonicalPlan) {
        return res.status(400).json({
          error: "invalid_plan",
          message: "Paket langganan tidak dikenal."
        });
      }

      const baseAmount = canonicalPlan.price;
      let finalAmount = baseAmount;
      let appliedPromoCode: string | null = null;
      let appliedDiscountType: 'percent' | 'fixed' | null = null;
      let appliedDiscountValue: number | null = null;

      if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
        const cleanPromo = promoCode.trim().toUpperCase();
        const promo = await getPromoRecord(cleanPromo);
        if (!promo) {
          return res.status(400).json({
            error: "invalid_promo",
            message: "Kode promo tidak valid atau tidak ditemukan."
          });
        }
        if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
          return res.status(400).json({
            error: "promo_expired",
            message: "Kode promo telah kedaluwarsa."
          });
        }
        if (promo.maxUses && (promo.usedCount || 0) >= promo.maxUses) {
          return res.status(400).json({
            error: "promo_depleted",
            message: "Batas kuota penggunaan kode promo telah habis."
          });
        }
        if (promo.usedBy && promo.usedBy.map(e => e.toLowerCase()).includes(session.email.toLowerCase())) {
          return res.status(400).json({
            error: "promo_already_used",
            message: `Akun Anda (${session.email}) sudah pernah menggunakan kode promo ini sebelumnya.`
          });
        }

        const isDiscount = promo.type === 'discount' || Boolean(promo.discountType);
        if (!isDiscount) {
          return res.status(400).json({
            error: "not_a_discount_promo",
            message: "Kode promo ini adalah voucher gratis, bukan kupon diskon pembayaran."
          });
        }

        const discountResult = calculateDiscount(baseAmount, promo.discountType || 'percent', promo.discountValue || 0);
        finalAmount = discountResult.finalAmount;
        appliedPromoCode = cleanPromo;
        appliedDiscountType = promo.discountType || 'percent';
        appliedDiscountValue = promo.discountValue || 0;
      }

      const orderId = `TATA-${canonicalPlan.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const { serverKey, clientKey, isProduction, snapHost } = getMidtransConfig();

      // Selalu simpan pendingOrder dengan plan CANONICAL dan data pesanan resmi di server
      await savePendingOrder(orderId, {
        orderId,
        email: session.email.toLowerCase(),
        plan: canonicalPlan.id,
        tier: canonicalPlan.tier,
        durationDays: canonicalPlan.durationDays,
        amount: finalAmount,
        originalAmount: baseAmount,
        planName: canonicalPlan.name,
        promoCode: appliedPromoCode,
        discountType: appliedDiscountType,
        discountValue: appliedDiscountValue,
        createdAt: new Date().toISOString()
      });

      if (!serverKey) {
        return res.status(503).json({
          success: false,
          error: "midtrans_not_configured",
          message: "Kunci MIDTRANS_SERVER_KEY belum dikonfigurasi di server. Daftarkan akun gratis di https://dashboard.midtrans.com lalu masukkan MIDTRANS_SERVER_KEY di pengaturan environment.",
          orderId,
          amount: finalAmount,
          originalAmount: baseAmount,
          planName: canonicalPlan.name,
          promoCode: appliedPromoCode
        });
      }

      if (serverKey.startsWith("mock_") || process.env.MIDTRANS_MOCK === "true") {
        return res.json({
          success: true,
          orderId,
          snapToken: `mock_snap_token_${orderId}`,
          redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock_${orderId}`,
          amount: finalAmount,
          grossAmount: finalAmount,
          originalAmount: baseAmount,
          planName: canonicalPlan.name,
          promoCode: appliedPromoCode,
          clientKey: clientKey || "mock_client_key",
          isProduction: false
        });
      }

      const basicAuth = Buffer.from(`${serverKey}:`).toString("base64");
      const snapUrl = `https://${snapHost}/snap/v1/transactions`;

      const snapPayload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: finalAmount
        },
        item_details: [
          {
            id: canonicalPlan.id,
            price: finalAmount,
            quantity: 1,
            name: appliedPromoCode ? `${canonicalPlan.name} (Diskon)` : canonicalPlan.name
          }
        ],
        customer_details: {
          email: session.email,
          first_name: session.email.split('@')[0]
        },
        usage_limit: 1
      };

      const snapRes = await fetch(snapUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${basicAuth}`
        },
        body: JSON.stringify(snapPayload)
      });

      if (!snapRes.ok) {
        const errJson: any = await snapRes.json().catch(() => ({}));
        return res.status(snapRes.status).json({
          success: false,
          error: "snap_creation_failed",
          message: errJson.error_messages ? errJson.error_messages.join(", ") : "Gagal membuat invoice Snap Midtrans."
        });
      }

      const snapData: any = await snapRes.json();

      res.json({
        success: true,
        orderId,
        snapToken: snapData.token,
        redirectUrl: snapData.redirect_url,
        amount: finalAmount,
        originalAmount: baseAmount,
        planName: canonicalPlan.name,
        promoCode: appliedPromoCode,
        clientKey,
        isProduction
      });
    } catch (e: any) {
      console.error("[Tata Create Order Error]:", e);
      res.status(500).json({ error: "order_error", message: e.message });
    }
  });

  // Official Midtrans Webhook Notification
  app.post("/api/payment/midtrans-webhook", async (req, res) => {
    try {
      if (!isPaymentsEnabled()) {
        return res.status(503).json({
          success: false,
          error: "payments_disabled",
          message: "Pembayaran belum tersedia"
        });
      }

      const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status,
        payment_type,
        transaction_id,
        settlement_time,
        transaction_time
      } = req.body;

      const { serverKey } = getMidtransConfig();
      if (!serverKey) {
        return res.status(500).json({ error: "server_key_missing" });
      }

      const signaturePayload = `${order_id}${status_code}${gross_amount}${serverKey}`;
      const expectedSignature = crypto.createHash("sha512").update(signaturePayload).digest("hex");

      if (signature_key !== expectedSignature) {
        console.warn("[Midtrans Webhook] Invalid signature rejected from IP:", req.ip);
        return res.status(403).json({ error: "invalid_signature" });
      }

      const isSettled =
        transaction_status === "settlement" ||
        (transaction_status === "capture" && (!fraud_status || fraud_status === "accept"));

      if (!isSettled) {
        return res.json({ status: "ok", message: `Ignored status: ${transaction_status}` });
      }

      const alreadyClaimed = await isOrderClaimed(order_id);
      if (alreadyClaimed) {
        return res.json({ status: "ok", message: "Order already claimed" });
      }

      const pendingOrder = await getPendingOrder(order_id);
      let targetEmail = pendingOrder?.email;
      let targetPlan = pendingOrder?.plan;

      if (!targetEmail || !targetPlan) {
        console.warn("[Midtrans Webhook] No pending order or plan found for order_id:", order_id);
        return res.json({ status: "ok", message: "Order recorded without pending user or plan" });
      }

      const normalizedEmail = targetEmail.trim().toLowerCase();
      let account = await getAccount(normalizedEmail);
      if (!account) {
        return res.json({ status: "ok", message: "Account not found" });
      }

      const canonicalPlan = getCanonicalPlan(targetPlan);
      if (!canonicalPlan) {
        console.warn("[Midtrans Webhook] Unknown plan in pending order:", targetPlan);
        return res.json({ status: "ok", message: "Unknown plan in pending order" });
      }
      const now = new Date();
      let expiresAt: string | null = null;
      if (canonicalPlan.durationDays) {
        const d = new Date(now);
        d.setDate(d.getDate() + canonicalPlan.durationDays);
        expiresAt = d.toISOString();
      }

      const newTxn = {
        id: `txn_${Date.now()}`,
        transactionId: transaction_id || `txn_midtrans_${order_id}`,
        amount: Math.round(parseFloat(gross_amount)),
        currency: "IDR",
        planName: canonicalPlan.name,
        paymentMethod: `Midtrans (${payment_type || 'QRIS'})`,
        paidAt: settlement_time || transaction_time || now.toISOString(),
        status: "success" as const,
        orderId: order_id,
        provider: "midtrans" as const
      };

      account.isPremium = true;
      account.premiumType = canonicalPlan.tier === 'pro_max'
        ? (canonicalPlan.durationDays === null ? 'lifetime' : 'pro_max')
        : (canonicalPlan.durationDays === null ? 'lifetime' : 'pro');
      account.premiumExpiresAt = expiresAt;
      account.subscribedAt = now.toISOString();
      account.transactions = Array.isArray(account.transactions) ? account.transactions : [];
      account.transactions.unshift(newTxn);

      await markOrderClaimed(order_id, normalizedEmail);
      await setAccount(normalizedEmail, account);

      if (pendingOrder?.promoCode) {
        await recordPromoUsage(pendingOrder.promoCode, normalizedEmail);
      }

      console.log(`[Midtrans Webhook] Premium activated for ${normalizedEmail} (order: ${order_id})`);
      res.json({ status: "ok", message: "Premium activated successfully" });
    } catch (e: any) {
      console.error("[Midtrans Webhook Error]:", e);
      res.status(500).json({ error: "webhook_error", message: e.message });
    }
  });

  // Upgrade or purchase Tata Premium subscription (Strict verification required)
  app.post("/api/account/upgrade-premium", async (req, res) => {
    try {
      if (!validatePrivacyCompliance(req.body)) {
        return res.status(400).json({ error: "privacy_violation" });
      }

      // 1. Mandatory Session Token Authentication
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({
          error: "unauthorized",
          message: "Otentikasi akun diperlukan. Silakan sertakan header Authorization: Bearer <token>."
        });
      }

      const session = await getSession(token);
      if (!session) {
        return res.status(401).json({
          error: "invalid_session",
          message: "Sesi Anda tidak valid atau telah kedaluwarsa. Silakan masuk kembali."
        });
      }

      const { email, plan, paymentProof } = req.body;
      if (!email) {
        return res.status(400).json({ error: "missing_email", message: "Email wajib diisi." });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      if (normalizedEmail !== session.email) {
        return res.status(403).json({
          error: "forbidden",
          message: "Akses ditolak: Anda tidak memiliki izin untuk meng-upgrade akun lain."
        });
      }

      // 2. MANDATORY PAYMENT PROOF CHECK (Google Play purchaseToken or Midtrans orderId)
      const proof = (req.body.paymentProof && typeof req.body.paymentProof === 'object')
        ? req.body.paymentProof
        : req.body;

      const purchaseToken = String(proof.purchaseToken || proof.receipt || '').trim();
      const orderId = String(proof.orderId || '').trim();
      const explicitProvider = String(proof.provider || '').trim().toLowerCase();

      // Determine provider: 'google_play' if purchaseToken is provided or provider is google_play, otherwise 'midtrans'
      const isGooglePlay = explicitProvider === 'google_play' || (!orderId && Boolean(purchaseToken));
      const provider = isGooglePlay ? 'google_play' : (explicitProvider || 'midtrans');

      // 1. Nonaktifkan verifikasi Google Play (Belum tersedia)
      if (isGooglePlay || provider === 'google_play') {
        return res.status(501).json({
          success: false,
          error: "google_play_disabled",
          message: "Belum tersedia"
        });
      }

      // 2. Saklar Pembayaran Dinonaktifkan
      if (!isPaymentsEnabled()) {
        return res.status(503).json({
          success: false,
          error: "payments_disabled",
          message: "Pembayaran belum tersedia"
        });
      }

      if (!purchaseToken && !orderId) {
        return res.status(400).json({
          error: "missing_payment_proof",
          message: "Bukti pembelian resmi wajib disertakan! Untuk Google Play Billing sertakan 'purchaseToken' & 'productId'; untuk Midtrans QRIS/E-Wallet sertakan 'orderId'. Aktivasi premium tanpa verifikasi server resmi ditolak."
        });
      }

      let verificationSuccess = false;
      let verifiedTransactionId = '';
      let verifiedPaidAt = new Date().toISOString();
      let verifiedPaymentMethod = '';
      let claimedKey = '';
      let verifiedProvider: 'google_play' | 'midtrans' = 'midtrans';
      let activeOrder: any = null;
      let activeCanonicalPlan: TataPlan | null = null;

      if (provider === 'google_play') {
        if (!purchaseToken) {
          return res.status(400).json({
            error: "missing_purchase_token",
            message: "purchaseToken dari Google Play Billing wajib disertakan sebagai bukti pembelian."
          });
        }
        claimedKey = `gplay_${purchaseToken}`;
        const alreadyClaimed = await isOrderClaimed(claimedKey);
        if (alreadyClaimed) {
          return res.status(400).json({
            error: "order_already_claimed",
            message: "Purchase token Google Play ini sudah pernah diklaim sebelumnya. Klaim ganda tidak diperbolehkan."
          });
        }

        const productId = String(proof.productId || '').trim();
        const packageName = String(proof.packageName || process.env.ANDROID_PACKAGE_NAME || 'com.tata.app').trim();

        // 4. VERIFY WITH OFFICIAL GOOGLE PLAY DEVELOPER API
        const gplayResult = await verifyGooglePlayPurchase(purchaseToken, productId, packageName);
        if (!gplayResult.valid) {
          // Strict refusal: DO NOT ACTIVATE PREMIUM
          return res.status(402).json({
            error: "payment_verification_failed",
            message: gplayResult.error || "Verifikasi purchaseToken ke server resmi Google Play Developer API gagal. Akun Premium TIDAK diaktifkan."
          });
        }

        verificationSuccess = true;
        verifiedProvider = 'google_play';
        verifiedTransactionId = gplayResult.transactionId || `GPA-${purchaseToken.slice(0, 12)}`;
        verifiedPaidAt = gplayResult.paidAt || new Date().toISOString();
        verifiedPaymentMethod = 'Google Play Billing';
      } else if (provider === 'midtrans') {
        if (!orderId) {
          return res.status(400).json({
            error: "missing_order_id",
            message: "Nomor pesanan (orderId) dari Midtrans wajib disertakan sebagai bukti pembelian."
          });
        }
        claimedKey = orderId;
        const alreadyClaimed = await isOrderClaimed(claimedKey);
        if (alreadyClaimed) {
          const claimant = await getOrderClaimant(claimedKey);
          if (claimant && claimant === normalizedEmail) {
            // Idempoten: order yang sama pada akun yang sama tidak menghasilkan error
            const currentAccount = await getAccount(normalizedEmail);
            return res.json({
              success: true,
              account: currentAccount,
              message: "Status transaksi pembayaran berhasil diverifikasi (sudah aktif)."
            });
          }
          return res.status(400).json({
            error: "order_already_claimed",
            message: `Order ID "${orderId}" sudah pernah diklaim sebelumnya. Klaim ganda tidak diperbolehkan.`
          });
        }

        // Ambil data order tersimpan di SERVER (plan canonical & amount setelah diskon promo jika ada)
        activeOrder = await getPendingOrder(orderId);
        const targetPlan = activeOrder ? activeOrder.plan : plan;
        if (!targetPlan) {
          return res.status(400).json({
            error: "invalid_plan",
            message: "Paket langganan tidak dikenal."
          });
        }
        activeCanonicalPlan = getCanonicalPlan(targetPlan);
        if (!activeCanonicalPlan) {
          return res.status(400).json({
            error: "invalid_plan",
            message: "Paket langganan tidak dikenal."
          });
        }

        const expectedAmount = activeOrder?.amount ?? activeCanonicalPlan.price;

        // 4. VERIFY WITH OFFICIAL MIDTRANS STATUS API
        const midtransResult = await verifyMidtransPayment(orderId, expectedAmount);
        if (!midtransResult.valid) {
          // Strict refusal: DO NOT ACTIVATE PREMIUM
          return res.status(402).json({
            error: "payment_verification_failed",
            message: midtransResult.error || "Verifikasi ke server resmi Midtrans gagal. Akun Premium TIDAK diaktifkan."
          });
        }

        verificationSuccess = true;
        verifiedProvider = 'midtrans';
        verifiedTransactionId = midtransResult.transactionId || `TATA-TXN-${orderId}`;
        verifiedPaidAt = midtransResult.paidAt || new Date().toISOString();
        verifiedPaymentMethod = `Midtrans (${midtransResult.paymentType || 'QRIS'})`;
      } else {
        return res.status(400).json({
          error: "unsupported_provider",
          message: `Provider pembayaran "${provider}" tidak didukung. Harap gunakan 'midtrans' atau 'google_play'.`
        });
      }

      if (!verificationSuccess) {
        return res.status(402).json({
          error: "payment_verification_failed",
          message: "Verifikasi bukti pembelian ke server resmi gagal. Akun Premium TIDAK diaktifkan."
        });
      }

      // 5. OFFICIAL VERIFICATION PASSED: ONLY NOW ACTIVATE PREMIUM
      let account = await getAccount(normalizedEmail);
      if (!account) {
        account = {
          userId: `tata_user_${Date.now().toString(36)}`,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          avatarUrl: generateInitialsAvatar(normalizedEmail.split('@')[0]),
          isPremium: false,
          premiumType: 'free',
          premiumExpiresAt: null,
          transactions: [],
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
      }

      const pendingOrder = activeOrder;
      const canonicalPlan = activeCanonicalPlan!;

      const now = new Date();
      let expiresAt: string | null = null;
      if (canonicalPlan.durationDays) {
        const d = new Date(now);
        d.setDate(d.getDate() + canonicalPlan.durationDays);
        expiresAt = d.toISOString();
      }

      const newTxn = {
        id: `txn_${Date.now()}`,
        transactionId: verifiedTransactionId,
        amount: pendingOrder?.amount ?? canonicalPlan.price,
        currency: 'IDR',
        planName: canonicalPlan.name,
        paymentMethod: verifiedPaymentMethod,
        paidAt: verifiedPaidAt,
        status: 'success' as const,
        orderId: provider === 'midtrans' ? orderId : undefined,
        purchaseToken: provider === 'google_play' ? purchaseToken : undefined,
        provider: verifiedProvider
      };

      account.isPremium = true;
      account.premiumType = canonicalPlan.tier === 'pro_max' 
        ? (canonicalPlan.durationDays === null ? 'lifetime' : 'pro_max') 
        : (canonicalPlan.durationDays === null ? 'lifetime' : 'pro');
      account.premiumExpiresAt = expiresAt;
      account.subscribedAt = now.toISOString();
      account.transactions = Array.isArray(account.transactions) ? account.transactions : [];
      account.transactions.unshift(newTxn);

      await markOrderClaimed(claimedKey, normalizedEmail);
      await setAccount(normalizedEmail, account);

      if (pendingOrder?.promoCode) {
        await recordPromoUsage(pendingOrder.promoCode, normalizedEmail);
      }

      res.json({
        success: true,
        account,
        transaction: newTxn,
        message: `Verifikasi pembayaran berhasil! Akun Anda kini aktif sebagai ${canonicalPlan.name}.`
      });
    } catch (e: any) {
      console.error("[Tata Premium Upgrade Error]:", e);
      res.status(500).json({ error: "upgrade_failed", message: e.message });
    }
  });

  // Restore Premium purchase status with strict account-bound ownership and official provider verification
  app.post("/api/account/restore-premium", async (req, res) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({
          error: "unauthorized",
          message: "Otentikasi akun diperlukan untuk memulihkan status Premium."
        });
      }

      const session = await getSession(token);
      if (!session) {
        return res.status(401).json({
          error: "invalid_session",
          message: "Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali."
        });
      }

      const { email } = req.body;
      const normalizedEmail = (email ? String(email) : session.email).trim().toLowerCase();

      if (normalizedEmail !== session.email.toLowerCase()) {
        return res.status(403).json({
          error: "forbidden",
          message: "Akses ditolak: Anda hanya dapat memulihkan akun milik sendiri."
        });
      }

      let account = await getAccount(normalizedEmail);
      if (!account) {
        return res.status(404).json({
          error: "account_not_found",
          message: "Akun tidak ditemukan."
        });
      }

      // 1. EVALUASI STATUS PREMIUM EKSIS PADA AKUN DI SERVER (PRINSIP: Premium melekat pada AKUN)
      // Jangan pernah memberi lifetime hanya karena tanggal kedaluwarsa kosong.
      let isAccountAlreadyActive = false;
      if (account.isPremium) {
        if (account.premiumType === 'lifetime') {
          isAccountAlreadyActive = true;
        } else if (account.premiumExpiresAt) {
          const expTime = new Date(account.premiumExpiresAt).getTime();
          if (!isNaN(expTime) && expTime > Date.now()) {
            isAccountAlreadyActive = true;
          } else {
            // Expired
            account.isPremium = false;
            await setAccount(normalizedEmail, account);
          }
        } else {
          // Tanpa tanggal kedaluwarsa & bukan lifetime: JANGAN BERI LIFETIME
          account.isPremium = false;
          await setAccount(normalizedEmail, account);
        }
      }

      // Extract proof / orderId from request body if provided
      const proof = (req.body.paymentProof && typeof req.body.paymentProof === 'object')
        ? req.body.paymentProof
        : req.body;

      const purchaseTokenToVerify = String(proof.purchaseToken || proof.receipt || '').trim();
      let orderIdToVerify = String(proof.orderId || proof.order_id || req.body.orderId || '').trim();
      const providerToVerify = String(proof.provider || '').trim().toLowerCase();

      if (purchaseTokenToVerify || providerToVerify === 'google_play') {
        return res.status(501).json({
          success: false,
          error: "google_play_disabled",
          message: "Pembelian via Google Play belum didukung."
        });
      }

      // TUGAS 1: Alur utama: pengguna login, server membaca status premium yang sudah tersimpan untuk akun (email dari sesi).
      // Jika aktif dan tidak ada Order ID pemulihan baru yang diberikan, restore hanya mengembalikan status itu.
      if (!orderIdToVerify) {
        if (isAccountAlreadyActive) {
          return res.json({
            success: true,
            isPremium: true,
            account,
            message: "Status Tata Premium akun Anda aktif dan berhasil dipulihkan."
          });
        }

        // Akun tidak memiliki langganan aktif tersimpan dan tidak menyertakan Order ID
        return res.status(400).json({
          success: false,
          isPremium: false,
          error: "missing_proof",
          message: "Tidak ditemukan bukti transaksi pembelian atau langganan aktif pada akun ini. Masukkan Order ID pesanan Anda jika ingin memulihkan transaksi."
        });
      }

      // TUGAS 2: Jika Order ID tetap dipakai untuk recovery, wajib:
      // a) order ditemukan di server
      const pendingOrder = await getPendingOrder(orderIdToVerify);
      if (!pendingOrder) {
        return res.status(404).json({
          success: false,
          isPremium: false,
          error: "order_not_found",
          message: `Order ID "${orderIdToVerify}" tidak ditemukan di server. Pastikan Order ID benar.`
        });
      }

      // b) cocok email akun login
      if (!pendingOrder.email || String(pendingOrder.email).trim().toLowerCase() !== normalizedEmail) {
        return res.status(403).json({
          success: false,
          isPremium: false,
          error: "order_ownership_mismatch",
          message: "Akses ditolak: Order ID ini tidak terdaftar untuk akun email Anda."
        });
      }

      // c) belum diklaim akun lain
      const currentClaimant = await getOrderClaimant(orderIdToVerify);
      if (currentClaimant && currentClaimant !== normalizedEmail) {
        return res.status(403).json({
          success: false,
          isPremium: false,
          error: "order_already_claimed",
          message: `Order ID "${orderIdToVerify}" sudah diklaim oleh akun lain.`
        });
      }

      // d) ditandai claimed secara ATOMIK (mencegah race conditions 2 akun berbeda pada order yang sama)
      const claimResult = await claimOrderAtomically(orderIdToVerify, normalizedEmail);
      if (!claimResult.success) {
        return res.status(403).json({
          success: false,
          isPremium: false,
          error: "order_already_claimed",
          message: `Order ID "${orderIdToVerify}" sudah diklaim oleh akun lain.`
        });
      }

      // e) cocok plan & nominal canonical (setelah diskon jika ada)
      const targetPlanId = pendingOrder.plan;
      const canonicalPlan = getCanonicalPlan(targetPlanId);
      if (!canonicalPlan) {
        return res.status(400).json({
          success: false,
          isPremium: false,
          error: "invalid_plan",
          message: "Paket langganan pada pesanan ini tidak dikenal atau tidak valid."
        });
      }

      const expectedAmount = typeof pendingOrder.amount === 'number' ? pendingOrder.amount : canonicalPlan.price;

      // Verifikasi pembayaran ke Midtrans dengan nominal yang sesuai paket/diskon
      const midtransCheck = await verifyMidtransPayment(orderIdToVerify, expectedAmount);
      if (!midtransCheck.valid) {
        return res.status(402).json({
          success: false,
          isPremium: false,
          error: "payment_verification_failed",
          message: midtransCheck.error || "Verifikasi ke server resmi Midtrans gagal."
        });
      }

      // f) masa berlaku dari plan/order (JANGAN PERNAH MEMBERI LIFETIME HANYA KARENA TANGGAL KEDALUWARSA KOSONG)
      const isLifetime = canonicalPlan.durationDays === null;
      let expiresAt: string | null = null;

      if (!isLifetime) {
        if (typeof canonicalPlan.durationDays !== 'number' || canonicalPlan.durationDays <= 0) {
          return res.status(400).json({
            success: false,
            isPremium: false,
            error: "invalid_plan_duration",
            message: "Durasi paket tidak valid. Akun tidak dapat diaktifkan sebagai lifetime."
          });
        }

        const rawStartTime = midtransCheck.paidAt || pendingOrder.paidAt || pendingOrder.createdAt;
        const startTime = rawStartTime ? new Date(rawStartTime) : new Date();
        const validStartTime = isNaN(startTime.getTime()) ? new Date() : startTime;

        const expDate = new Date(validStartTime);
        expDate.setDate(expDate.getDate() + canonicalPlan.durationDays);
        expiresAt = expDate.toISOString();

        if (expDate.getTime() <= Date.now()) {
          account.isPremium = false;
          account.premiumExpiresAt = expiresAt;
          await setAccount(normalizedEmail, account);
          return res.json({
            success: true,
            isPremium: false,
            account,
            message: "Langganan Tata Premium dari pesanan ini telah berakhir."
          });
        }
      }

      // Aktifkan / pulihkan status premium akun secara idempoten
      account.isPremium = true;
      account.premiumType = canonicalPlan.tier === 'pro_max'
        ? (isLifetime ? 'lifetime' : 'pro_max')
        : (isLifetime ? 'lifetime' : 'pro');
      account.premiumExpiresAt = isLifetime ? null : expiresAt;
      account.subscribedAt = account.subscribedAt || new Date().toISOString();

      // Tambahkan transaksi ke riwayat jika belum ada
      account.transactions = Array.isArray(account.transactions) ? account.transactions : [];
      const hasTxn = account.transactions.some(t => t.orderId === orderIdToVerify);
      if (!hasTxn) {
        account.transactions.unshift({
          id: `txn_${Date.now()}`,
          transactionId: midtransCheck.transactionId || `TATA-TXN-${orderIdToVerify}`,
          amount: expectedAmount,
          currency: 'IDR',
          planName: canonicalPlan.name,
          paymentMethod: `Midtrans (${midtransCheck.paymentType || 'QRIS'})`,
          paidAt: midtransCheck.paidAt || new Date().toISOString(),
          status: 'success' as const,
          orderId: orderIdToVerify,
          provider: 'midtrans'
        });
      }

      await setAccount(normalizedEmail, account);

      return res.json({
        success: true,
        isPremium: true,
        account,
        message: `Status Tata Premium (${canonicalPlan.name}) berhasil dipulihkan secara resmi!`
      });
    } catch (e: any) {
      console.error("[Tata Restore Error]:", e);
      res.status(500).json({ error: "restore_failed", message: e.message });
    }
  });

  // Rate limiter for promo voucher redemption to prevent brute-force guessing
  const promoFailedAttempts = new Map<string, { count: number; lockedUntil: number }>();

  // Redeem Promo Voucher Code endpoint
  app.post("/api/account/redeem-promo", async (req, res) => {
    try {
      const clientIp = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip').split(',')[0].trim();
      const now = Date.now();
      const ipRecord = promoFailedAttempts.get(clientIp);

      if (ipRecord && now < ipRecord.lockedUntil) {
        const remainingMinutes = Math.ceil((ipRecord.lockedUntil - now) / 60000);
        return res.status(429).json({
          error: "too_many_attempts",
          message: `Terlalu banyak percobaan kode promo yang gagal. Demi keamanan, silakan coba lagi dalam ${remainingMinutes} menit.`
        });
      }

      const { code } = req.body;
      const cleanCode = String(code || '').trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ error: "missing_code", message: "Kode promo wajib diisi." });
      }

      // Identifikasi user dari token sesi atau request body
      let account: ServerTataAccount | null = null;
      let userEmail: string | null = null;
      const token = extractBearerToken(req);
      if (token) {
        const session = await getSession(token);
        if (session && session.email) {
          userEmail = session.email.toLowerCase();
          account = await getAccount(session.email);
        }
      }
      if (!userEmail && req.body.email && typeof req.body.email === "string") {
        userEmail = req.body.email.trim().toLowerCase();
        account = await getAccount(userEmail);
      }

      if (!userEmail) {
        userEmail = (req.body.email && typeof req.body.email === "string" && req.body.email.trim())
          ? req.body.email.trim().toLowerCase()
          : "guest@tata.local";
        account = await getAccount(userEmail);
      }

      // KLAIM PROMO VOUCHER SECARA ATOMIK DI REDIS (SADD, INCR, ROLLBACK)
      const claimResult = await claimPromoVoucherAtomically(cleanCode, userEmail);

      if (!claimResult.success) {
        if (claimResult.error === "invalid_code") {
          const currentFailed = (ipRecord && now >= ipRecord.lockedUntil ? 0 : ipRecord?.count || 0) + 1;
          if (currentFailed >= 5) {
            promoFailedAttempts.set(clientIp, { count: currentFailed, lockedUntil: now + 5 * 60 * 1000 });
          } else {
            promoFailedAttempts.set(clientIp, { count: currentFailed, lockedUntil: 0 });
          }
        }
        const statusCode = claimResult.error === "storage_error" ? 503 : 400;
        return res.status(statusCode).json({
          error: claimResult.error,
          message: claimResult.message
        });
      }

      // Reset failed attempts upon entering a valid code
      promoFailedAttempts.delete(clientIp);

      const promo = claimResult.promo!;
      const tier = promo.tier === 'pro_max' ? 'pro_max' : 'pro';
      const isProMax = tier === 'pro_max';
      const isLifetime = promo.durationDays === null || promo.durationDays === undefined;
      const defaultPlanName = isProMax
        ? (isLifetime ? 'Tata Pro Max Seumur Hidup (Voucher Promo)' : `Tata Pro Max ${promo.durationDays || 365} Hari (Voucher Promo)`)
        : (isLifetime ? 'Tata Pro Seumur Hidup (Voucher Promo)' : `Tata Pro ${promo.durationDays || 365} Hari (Voucher Promo)`);
      const planName = promo.planName || defaultPlanName;

      const durationMs = isLifetime 
        ? 100 * 365 * 24 * 60 * 60 * 1000 
        : (promo.durationDays || 365) * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs).toISOString();

      const newTxn = {
        id: `PROMO-${cleanCode}-${Date.now()}`,
        transactionId: `PROMO-${cleanCode}-${Date.now()}`,
        planName,
        amount: 0,
        currency: 'IDR',
        status: 'success' as const,
        paymentMethod: `Voucher Promo (${cleanCode})`,
        paidAt: new Date().toISOString()
      };

      try {
        if (!account) {
          account = {
            userId: `tata_user_${Date.now().toString(36)}`,
            email: userEmail,
            name: userEmail.split('@')[0],
            avatarUrl: generateInitialsAvatar(userEmail.split('@')[0]),
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isPremium: false,
            transactions: []
          };
        }
        account.isPremium = true;
        account.premiumType = isLifetime ? (isProMax ? 'lifetime' : 'pro') : tier;
        account.premiumExpiresAt = expiresAt;
        account.transactions = [newTxn, ...(account.transactions || [])];
        await setAccount(userEmail, account);
      } catch (saveErr) {
        // JIKA PENYIMPANAN AKUN GAGAL: JANGAN MEMBERI PREMIUM! ROLLBACK RESERVASI REDIS!
        console.error("[Tata Promo Save Account Error]:", saveErr);
        if (claimResult.rollback) {
          await claimResult.rollback();
        }
        return res.status(500).json({
          error: "storage_failed",
          message: "Gagal menyimpan status premium ke akun. Kuota promo tidak terpakai."
        });
      }

      return res.json({
        success: true,
        account,
        isPremium: true,
        tier,
        planName,
        isLifetime,
        expiresAt,
        message: `Voucher ${cleanCode} berhasil diklaim!`
      });
    } catch (e: any) {
      console.error("[Tata Redeem Promo Error]:", e);
      const isStorage = e.message?.includes("redis") || e.message?.includes("Redis") || e.code === "ECONNREFUSED" || e.name === "UpstashError";
      const status = isStorage ? 503 : 500;
      return res.status(status).json({ error: isStorage ? "storage_error" : "server_error", message: e.message });
    }
  });

  // Logout session (Revoke session token)
  app.post("/api/account/logout", async (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      await deleteSession(token);
    }
    res.json({ success: true, message: "Berhasil keluar dari Akun Tata." });
  });

  // Export app for serverless platforms like Vercel
  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Express Global Error]:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  });

  export default app;

  async function startServer() {
    // Vite middleware for development (check process.env.NODE_ENV or process.env.VITE_DEV)
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      const viteModule = await import("vite");
      const vite = await viteModule.createServer({
        server: { 
          middlewareMode: true,
          hmr: false
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // Production static serving
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith(".html") || 
            filePath.endsWith("sw.js") || 
            filePath.endsWith("sw-custom.js") ||
            filePath.endsWith(".webmanifest") || 
            filePath.endsWith("manifest.json") ||
            filePath.endsWith(".png") ||
            filePath.endsWith(".ico") ||
            filePath.endsWith(".svg")
          ) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }

          if (filePath.endsWith(".webmanifest") || filePath.endsWith("manifest.json")) {
            res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
          } else if (filePath.endsWith("sw.js") || filePath.endsWith("sw-custom.js")) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          }
        }
      }));

      app.get("*all", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running securely on port ${PORT}`);
    });
  }

  // On Vercel Serverless Functions, Vercel invokes the exported Express app handler directly.
  // In container/standalone environments, listen on PORT 3000.
  if (!process.env.VERCEL) {
    startServer();
  }

