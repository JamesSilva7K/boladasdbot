/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHATSAPP_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_ADMIN_CHAT_ID?: string;
    UNIAO7_API_KEY?: string;
    UNIAO7_BASE_URL?: string;
    ELITE_CLIENT_ID?: string;
    ELITE_CLIENT_SECRET?: string;
    ELITE_BASE_URL?: string;
    ENFORCE_BRAZIL_ONLY?: string;
    RATE_LIMIT_WINDOW_MS?: string;
    RATE_LIMIT_MAX_REQUESTS?: string;
    NODE_ENV?: "development" | "production" | "test";
  }
}
