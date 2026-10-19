import fs from "fs";
import path from "path";

export interface RifaConfig {
  edition: string;
  ticketPrice: number;
  totalPrize: string;
  drawDate: string;
  drawTime: string;
  lotteryMethod: string;
  whatsappSupportNumber: string;
  primaryGateway: "União 7 Pay" | "Elite PAYbr";
  secondaryGateway: "União 7 Pay" | "Elite PAYbr";
  autoFailoverEnabled: boolean;
  customBannerUrl?: string;
}

export interface ActivityEvent {
  id: string;
  type:
    | "click_comprar"
    | "modal_opened"
    | "cpf_validado"
    | "cpf_invalido"
    | "tentativa_consulta"
    | "entrada"
    | "saida"
    | "compra_iniciada"
    | "pagamento_confirmado"
    | "pagamento_cancelado"
    | "clique_whatsapp";
  timestamp: string;
  data?: Record<string, unknown> | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  state?: string | undefined;
  city?: string | undefined;
  device?: string | undefined;
}

export interface DashboardMetrics {
  totalRevenue: number;
  confirmedPayments: number;
  pendingPayments: number;
  canceledPayments: number;
  totalEntries: number;
  totalExits: number;
  buyClicks: number;
  whatsappRedirects: number;
  totalRifasSold: number;
  topSellingPlan: string;
  revenueByState: Record<string, { count: number; revenue: number }>;
}

import os from "node:os";

export interface LeadPurchaseRecord {
  txId: string;
  leadName: string;
  cpf: string;
  ip: string;
  city: string;
  state: string;
  device: string;
  provider: string;
  amount: number;
  netAmount: number;
  ticketCount: number;
  tickets: string[];
  proofToken: string;
  createdAt: string;
}

const IS_SERVERLESS = Boolean(process.env["VERCEL"] || process.env["AWS_LAMBDA_FUNCTION_NAME"]);
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), "bolada-data")
  : path.resolve(process.cwd(), "data");

const CONFIG_FILE = path.join(DATA_DIR, "rifa-config.json");
const EVENTS_FILE = path.join(DATA_DIR, "events-log.json");
const METRICS_FILE = path.join(DATA_DIR, "metrics.json");
const PURCHASES_FILE = path.join(DATA_DIR, "purchases-log.json");

let memoryPurchases: LeadPurchaseRecord[] = [];

export function storeLeadPurchase(record: LeadPurchaseRecord): LeadPurchaseRecord {
  ensureDir();
  try {
    let list: LeadPurchaseRecord[] = [];
    if (fs.existsSync(PURCHASES_FILE)) {
      const raw = fs.readFileSync(PURCHASES_FILE, "utf-8");
      list = JSON.parse(raw);
    }
    list.unshift(record);
    if (list.length > 500) list = list.slice(0, 500);
    memoryPurchases = list;
    try {
      fs.writeFileSync(PURCHASES_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch {}
  } catch {
    memoryPurchases.unshift(record);
  }
  return record;
}

export function getLeadPurchases(limit = 20): LeadPurchaseRecord[] {
  ensureDir();
  try {
    if (!fs.existsSync(PURCHASES_FILE)) return memoryPurchases.slice(0, limit);
    const raw = fs.readFileSync(PURCHASES_FILE, "utf-8");
    const list: LeadPurchaseRecord[] = JSON.parse(raw);
    return list.slice(0, limit);
  } catch {
    return memoryPurchases.slice(0, limit);
  }
}

const DEFAULT_CONFIG: RifaConfig = {
  edition: "Edição 11",
  ticketPrice: 0.69,
  totalPrize: "R$ 300.000",
  drawDate: "04/11/2026",
  drawTime: "20:00",
  lotteryMethod: "pela Loteria Federal",
  whatsappSupportNumber: "5511999999999",
  primaryGateway: "União 7 Pay",
  secondaryGateway: "Elite PAYbr",
  autoFailoverEnabled: true,
};

const DEFAULT_METRICS: DashboardMetrics = {
  totalRevenue: 0,
  confirmedPayments: 0,
  pendingPayments: 0,
  canceledPayments: 0,
  totalEntries: 0,
  totalExits: 0,
  buyClicks: 0,
  whatsappRedirects: 0,
  totalRifasSold: 0,
  topSellingPlan: "10 Cotas (Mais Popular)",
  revenueByState: {},
};

// Armazenamento em memória de fallback ultra-resiliente
let memoryConfig: RifaConfig = { ...DEFAULT_CONFIG };
let memoryMetrics: DashboardMetrics = { ...DEFAULT_METRICS };
let memoryEvents: ActivityEvent[] = [];

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    // Silently fallback to memory store
  }
}

export function getRifaConfig(): RifaConfig {
  ensureDir();
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(memoryConfig, null, 2), "utf-8");
      } catch {
        // Ignora se read-only
      }
      return memoryConfig;
    }
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    memoryConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    return memoryConfig;
  } catch {
    return memoryConfig;
  }
}

export function updateRifaConfig(partial: Partial<RifaConfig>): RifaConfig {
  ensureDir();
  const current = getRifaConfig();
  memoryConfig = { ...current, ...partial };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(memoryConfig, null, 2), "utf-8");
  } catch {
    // Ignora erro de disco
  }
  return memoryConfig;
}

export function getMetrics(): DashboardMetrics {
  ensureDir();
  try {
    if (!fs.existsSync(METRICS_FILE)) {
      try {
        fs.writeFileSync(METRICS_FILE, JSON.stringify(memoryMetrics, null, 2), "utf-8");
      } catch {
        // Ignora se read-only
      }
      return memoryMetrics;
    }
    const raw = fs.readFileSync(METRICS_FILE, "utf-8");
    memoryMetrics = { ...DEFAULT_METRICS, ...JSON.parse(raw) };
    return memoryMetrics;
  } catch {
    return memoryMetrics;
  }
}

export function updateMetrics(updater: (m: DashboardMetrics) => void): DashboardMetrics {
  ensureDir();
  const metrics = getMetrics();
  updater(metrics);
  memoryMetrics = metrics;
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), "utf-8");
  } catch {
    // Ignora erro de disco
  }
  return memoryMetrics;
}

export function logActivity(event: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent {
  ensureDir();
  const newEvent: ActivityEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    let list: ActivityEvent[] = [];
    if (fs.existsSync(EVENTS_FILE)) {
      try {
        const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
        list = JSON.parse(raw);
      } catch {
        list = [...memoryEvents];
      }
    } else {
      list = [...memoryEvents];
    }

    list.unshift(newEvent);
    if (list.length > 500) {
      list = list.slice(0, 500);
    }
    memoryEvents = list;

    try {
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Ignora erro de escrita em disco read-only
    }
  } catch {
    memoryEvents.unshift(newEvent);
  }

  // Atualiza métricas em tempo real
  updateMetrics((m) => {
    if (event.type === "entrada") m.totalEntries += 1;
    if (event.type === "saida") m.totalExits += 1;
    if (event.type === "click_comprar") m.buyClicks += 1;
    if (event.type === "clique_whatsapp") m.whatsappRedirects += 1;

    if (event.type === "pagamento_confirmado") {
      const dataObj = event.data || {};
      const amount = typeof dataObj["amount"] === "number" ? dataObj["amount"] : 0;
      const qtd = typeof dataObj["rifas"] === "number" ? dataObj["rifas"] : 1;
      const state = event.state || "SP";

      m.confirmedPayments += 1;
      m.totalRevenue += amount;
      m.totalRifasSold += qtd;

      if (!m.revenueByState[state]) {
        m.revenueByState[state] = { count: 0, revenue: 0 };
      }
      const st = m.revenueByState[state];
      if (st) {
        st.count += 1;
        st.revenue += amount;
      }
    }

    if (event.type === "pagamento_cancelado") {
      m.canceledPayments += 1;
    }
    if (event.type === "compra_iniciada") {
      m.pendingPayments += 1;
    }
  });

  return newEvent;
}

export function getRecentEvents(limit = 10): ActivityEvent[] {
  ensureDir();
  try {
    if (!fs.existsSync(EVENTS_FILE)) return memoryEvents.slice(0, limit);
    const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
    const list: ActivityEvent[] = JSON.parse(raw);
    return list.slice(0, limit);
  } catch {
    return memoryEvents.slice(0, limit);
  }
}
