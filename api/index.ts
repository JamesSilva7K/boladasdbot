import type { VercelRequest, VercelResponse } from "@vercel/node";
// @ts-expect-error server.js is generated at build time in dist/
import server from "../dist/server/server.js";

import fs from "node:fs";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function tryServeStaticFile(urlPath: string, res: VercelResponse): boolean {
  const cleanPath = urlPath.split("?")[0]?.replace(/^\/+/, "") || "";
  if (!cleanPath) return false;

  const candidateDirs = [
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "dist", "client"),
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, cleanPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
      return true;
    }
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const reqUrl = req.url || "/";

    // Se for requisição de arquivo estático (/assets, favicon, etc.), tenta servir imediatamente
    if (
      reqUrl.startsWith("/assets/") ||
      reqUrl === "/favicon.ico" ||
      reqUrl === "/robots.txt"
    ) {
      if (tryServeStaticFile(reqUrl, res)) {
        return;
      }
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const fullUrl = `${protocol}://${host}${reqUrl}`;

    // Converte requisição do Node/Vercel em Web Standard Request
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) {
        if (Array.isArray(val)) {
          headers.set(key, val.join(", "));
        } else {
          headers.set(key, String(val));
        }
      }
    }

    const method = req.method || "GET";
    let body: BodyInit | null = null;
    if (method !== "GET" && method !== "HEAD") {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const webRequest = new Request(fullUrl, {
      method,
      headers,
      body,
    });

    // Executa o servidor SSR nativo da aplicação
    const webResponse = await server.fetch(webRequest, process.env, {});

    res.status(webResponse.status);
    webResponse.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const responseText = await webResponse.text();
    return res.send(responseText);
  } catch (err: unknown) {
    console.error("Vercel Serverless Function Error:", err);
    return res.status(500).send("Erro interno ao renderizar a página.");
  }
}
