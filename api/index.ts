import type { VercelRequest, VercelResponse } from "@vercel/node";
import server from "../../dist/server/server.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const fullUrl = `${protocol}://${host}${req.url}`;

    // Converte requisição do Node/Vercel em Web Standard Request
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) {
        if (Array.isArray(val)) {
          headers.set(key, val.join(", "));
        } else {
          headers.set(key, val);
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
