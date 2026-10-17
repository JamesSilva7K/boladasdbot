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

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "rifa-config.json");
const EVENTS_FILE = path.join(DATA_DIR, "events-log.json");
const METRICS_FILE = path.join(DATA_DIR, "metrics.json");

const DEFAULT_CONFIG: RifaConfig = {
  edition: "Edição 11",
  ticketPrice: 0.69,
  totalPrize: "R$ 300.000",
  drawDate: "04/11/2026",
  drawTime: "20:00",
  lotteryMethod: "pela Loteria Federal",
  whatsappSupportNumber: "5511999999999",
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

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getRifaConfig(): RifaConfig {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    return DEFAULT_CONFIG;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function updateRifaConfig(partial: Partial<RifaConfig>): RifaConfig {
  ensureDir();
  const current = getRifaConfig();
  const updated = { ...current, ...partial };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

export function getMetrics(): DashboardMetrics {
  ensureDir();
  if (!fs.existsSync(METRICS_FILE)) {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(DEFAULT_METRICS, null, 2), "utf-8");
    return DEFAULT_METRICS;
  }
  try {
    const raw = fs.readFileSync(METRICS_FILE, "utf-8");
    return { ...DEFAULT_METRICS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_METRICS;
  }
}

export function updateMetrics(updater: (m: DashboardMetrics) => void): DashboardMetrics {
  ensureDir();
  const metrics = getMetrics();
  updater(metrics);
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), "utf-8");
  return metrics;
}

export function logActivity(event: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent {
  ensureDir();
  const newEvent: ActivityEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  let list: ActivityEvent[] = [];
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }

  list.unshift(newEvent);
  if (list.length > 500) {
    list = list.slice(0, 500);
  }
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(list, null, 2), "utf-8");

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
  if (!fs.existsSync(EVENTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
    const list: ActivityEvent[] = JSON.parse(raw);
    return list.slice(0, limit);
  } catch {
    return [];
  }
}
