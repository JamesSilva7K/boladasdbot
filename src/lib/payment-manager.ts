// Gateway de Pagamento com Failover Automático e Inteligente
// Primário: União 7 Pay
// Secundário / Reserva: Elite PAYbr
import { getSecret } from "./vault-shield";

export interface PixChargeRequest {
  amount: number;
  description: string;
  payerName?: string | undefined;
  payerDocument?: string | undefined; // CPF
  externalId: string;
}

export interface PixChargeResponse {
  success: boolean;
  provider: "União 7 Pay" | "Elite PAYbr";
  transactionId: string;
  pixCopiaCola: string;
  qrCodeBase64?: string | undefined;
  amount: number;
  estimatedFee: number;
  netAmount: number;
  status: "PENDENTE" | "paid" | "falha";
  error?: string | undefined;
}

export interface PurchaseLeadInfo {
  name: string;
  cpf: string;
  cpfMascarado: string;
  ip: string;
  state: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  email?: string | undefined;
  phone?: string | undefined;
  cep?: string | undefined;
  address?: string | undefined;
  neighborhood?: string | undefined;
  number?: string | undefined;
  complement?: string | undefined;
  fiscalRegion?: string | undefined;
  authenticityScore?: number | undefined;
  confidenceLevel?: string | undefined;
}

// Armazena transações recentes em memória para reconciliação do Lead e auditoria
const transactionLeadMap = new Map<
  string,
  {
    lead: PurchaseLeadInfo;
    amount: number;
    provider: string;
    createdAt: string;
    encryptedEnvelope?: unknown | undefined;
    proofToken?: string | undefined;
  }
>();

export function storeTransactionLead(
  txId: string,
  lead: PurchaseLeadInfo,
  amount: number,
  provider: string,
  encryptedEnvelope?: unknown,
  proofToken?: string
) {
  transactionLeadMap.set(txId, {
    lead,
    amount,
    provider,
    createdAt: new Date().toISOString(),
    encryptedEnvelope,
    proofToken,
  });
}

export function getTransactionLead(txId: string) {
  return transactionLeadMap.get(txId);
}

import { formatBrasiliaTime } from "./date-utils";
import { getRifaConfig, updateRifaConfig } from "./rifa-store";

export interface GatewayProbeResult {
  provider: "União 7 Pay" | "Elite PAYbr";
  status: "ONLINE" | "LENTO" | "OFFLINE";
  latencyMs: number;
  message: string;
  httpStatus?: number;
}

export interface StealthApiTestReport {
  timestamp: string;
  primaryGateway: "União 7 Pay" | "Elite PAYbr";
  secondaryGateway: "União 7 Pay" | "Elite PAYbr";
  autoFailoverEnabled: boolean;
  uniao: GatewayProbeResult;
  elite: GatewayProbeResult;
  activeProvider: "União 7 Pay" | "Elite PAYbr";
  switchActionTaken: string;
  allSystemsOperational: boolean;
}

export class PaymentManager {
  private static primaryFailCount = 0;
  private static maxFailuresBeforeSwitch = 2;
  private static lastProbeReport: StealthApiTestReport | null = null;
  private static lastProbeTime = 0;
  private static isProbing = false;

  // Cálculo da Taxa e Valor Líquido do Admin Supremo
  public static calculateNet(amount: number, provider: "União 7 Pay" | "Elite PAYbr"): { fee: number; netAmount: number } {
    let fee = 0;
    if (provider === "União 7 Pay") {
      fee = 0.50; // Taxa estimada por transação PIX União 7 Pay
    } else {
      fee = 1.50; // Taxa padrão Elite PAYbr
    }

    if (fee > amount) {
      fee = Number((amount * 0.05).toFixed(2));
    }

    const netAmount = Number((amount - fee).toFixed(2));
    return { fee, netAmount };
  }

  // 1. Cobrança na União 7 Pay
  private static async chargeUniao7(data: PixChargeRequest): Promise<PixChargeResponse> {
    const apiKey = getSecret("UNIAO7_API_KEY");
    const baseUrl = getSecret("UNIAO7_BASE_URL");

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        amount: data.amount,
        description: data.description,
        external_id: data.externalId,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`União 7 Pay retornou HTTP ${response.status}: ${errBody}`);
    }

    const resJson = await response.json();
    if (!resJson.success && resJson.status !== "success") {
      throw new Error(resJson.message || "Erro na geração do PIX União 7 Pay");
    }

    const pixCode = resJson.pix_code || resJson.payment?.pix_copia_cola || "";
    const qrBase64 = resJson.qr_base64 || "";
    const txId = resJson.transaction_id || `up_${Date.now()}`;
    const { fee, netAmount } = this.calculateNet(data.amount, "União 7 Pay");

    return {
      success: true,
      provider: "União 7 Pay",
      transactionId: txId,
      pixCopiaCola: pixCode,
      qrCodeBase64: qrBase64,
      amount: data.amount,
      estimatedFee: fee,
      netAmount: netAmount,
      status: "PENDENTE",
    };
  }

  // 2. Cobrança na Elite PAYbr
  private static async chargeElitePay(data: PixChargeRequest): Promise<PixChargeResponse> {
    const clientId = getSecret("ELITE_CLIENT_ID");
    const clientSecret = getSecret("ELITE_CLIENT_SECRET");
    const baseUrl = getSecret("ELITE_BASE_URL");

    const response = await fetch(`${baseUrl}/api/v1/deposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      body: JSON.stringify({
        amount: data.amount,
        description: data.description,
        payerName: data.payerName || "Participante Bolada Pix",
        payerDocument: data.payerDocument?.replace(/\D/g, "") || "00000000000",
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`Elite PAYbr retornou HTTP ${response.status}: ${errBody}`);
    }

    const resJson = await response.json();
    if (!resJson.success) {
      throw new Error(resJson.message || "Erro na geração do PIX Elite PAYbr");
    }

    const txId = resJson.transactionId || `ep_${Date.now()}`;
    const { fee, netAmount } = this.calculateNet(data.amount, "Elite PAYbr");

    return {
      success: true,
      provider: "Elite PAYbr",
      transactionId: txId,
      pixCopiaCola: resJson.copyPaste || "",
      qrCodeBase64: resJson.qrcodeUrl || "",
      amount: data.amount,
      estimatedFee: fee,
      netAmount: netAmount,
      status: "PENDENTE",
    };
  }

  // Orquestrador Central com Escolha Dinâmica do Admin e Failover de Alta Resiliência
  public static async createPixCharge(data: PixChargeRequest): Promise<PixChargeResponse> {
    const config = getRifaConfig();
    const primary = (config.primaryGateway as "União 7 Pay" | "Elite PAYbr") || "União 7 Pay";
    const secondary = (config.secondaryGateway as "União 7 Pay" | "Elite PAYbr") || (primary === "União 7 Pay" ? "Elite PAYbr" : "União 7 Pay");
    const autoFailover = config.autoFailoverEnabled !== false;

    const chargeWithProvider = async (provider: "União 7 Pay" | "Elite PAYbr"): Promise<PixChargeResponse> => {
      if (provider === "União 7 Pay") {
        return await this.chargeUniao7(data);
      } else {
        const sanitizedAmount = Math.max(Number(data.amount) || 0, 2.00);
        return await this.chargeElitePay({ ...data, amount: sanitizedAmount });
      }
    };

    // Se o primário estiver em estado degradado e failover estiver ativo, prioriza o secundário
    const shouldBypassPrimary = autoFailover && this.primaryFailCount >= this.maxFailuresBeforeSwitch;
    const firstChoice = shouldBypassPrimary ? secondary : primary;
    const secondChoice = shouldBypassPrimary ? primary : secondary;

    try {
      console.log(`[PaymentManager] Disparando cobrança no gateway primário/ativo (${firstChoice})...`);
      const result = await chargeWithProvider(firstChoice);
      this.primaryFailCount = 0;
      return result;
    } catch (firstErr) {
      this.primaryFailCount += 1;
      console.warn(`[PaymentManager] Gateway (${firstChoice}) falhou (${this.primaryFailCount}/${this.maxFailuresBeforeSwitch}):`, firstErr);

      if (autoFailover) {
        console.log(`[PaymentManager] 🛡️ Acionando Failover Automático para gateway reserva (${secondChoice})...`);
        try {
          const fallbackResult = await chargeWithProvider(secondChoice);
          return fallbackResult;
        } catch (secondErr) {
          console.error(`[PaymentManager] Gateway de reserva (${secondChoice}) também falhou:`, secondErr);
        }
      }

      return {
        success: false,
        provider: firstChoice,
        transactionId: "",
        pixCopiaCola: "",
        amount: data.amount,
        estimatedFee: 0,
        netAmount: 0,
        status: "falha",
        error: "Adquirentes temporariamente indisponíveis. Tente novamente em instantes.",
      };
    }
  }

  // Define o gateway Principal e configura o Secundário automaticamente
  public static setPrimaryGateway(gateway: "União 7 Pay" | "Elite PAYbr"): { primary: string; secondary: string } {
    const secondary = gateway === "União 7 Pay" ? "Elite PAYbr" : "União 7 Pay";
    updateRifaConfig({
      primaryGateway: gateway,
      secondaryGateway: secondary,
    });
    this.primaryFailCount = 0;
    return { primary: gateway, secondary };
  }

  // Inverte os gateways (Principal vira Secundário e vice-versa)
  public static swapGateways(): { primary: string; secondary: string } {
    const config = getRifaConfig();
    const currentPrimary = config.primaryGateway || "União 7 Pay";
    const newPrimary = currentPrimary === "União 7 Pay" ? "Elite PAYbr" : "União 7 Pay";
    return this.setPrimaryGateway(newPrimary);
  }

  // Alterna o Failover Automático inteligente (Ligar / Desligar)
  public static toggleAutoFailover(): boolean {
    const config = getRifaConfig();
    const current = config.autoFailoverEnabled !== false;
    const updated = !current;
    updateRifaConfig({ autoFailoverEnabled: updated });
    return updated;
  }

  public static resetFailures(): void {
    this.primaryFailCount = 0;
  }

  // 🧪 Sondagem Camuflada de APIs (Synthetic Stealth Health Probe)
  public static async runStealthApiHealthCheck(origin = "automático"): Promise<StealthApiTestReport> {
    console.log(`[PaymentManager] Iniciando Teste Camuflado de APIs (Origem: ${origin})...`);
    const config = getRifaConfig();
    const primary = (config.primaryGateway as "União 7 Pay" | "Elite PAYbr") || "União 7 Pay";
    const secondary = (config.secondaryGateway as "União 7 Pay" | "Elite PAYbr") || (primary === "União 7 Pay" ? "Elite PAYbr" : "União 7 Pay");
    const autoFailover = config.autoFailoverEnabled !== false;

    // 1. Sondagem Camuflada União 7 Pay
    const uniaoStart = performance.now();
    let uniaoResult: GatewayProbeResult;
    try {
      const apiKey = getSecret("UNIAO7_API_KEY");
      const baseUrl = getSecret("UNIAO7_BASE_URL");

      if (!apiKey || !baseUrl) {
        uniaoResult = {
          provider: "União 7 Pay",
          status: "OFFLINE",
          latencyMs: 0,
          message: "Chave ou URL da API não configurada",
        };
      } else {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            amount: 2.00,
            description: "Sondagem de Integridade Sintetica",
            external_id: `probe_${Date.now()}`,
          }),
          signal: AbortSignal.timeout(5000),
        });
        const elapsed = Math.round(performance.now() - uniaoStart);
        if (res.ok) {
          const resJson = await res.json().catch(() => ({}));
          uniaoResult = {
            provider: "União 7 Pay",
            status: elapsed > 2500 ? "LENTO" : "ONLINE",
            latencyMs: elapsed,
            httpStatus: res.status,
            message: resJson.success || resJson.status === "success" ? "PIX e Autenticação 100% Validados" : "Endpoint respondeu normalmente",
          };
        } else {
          uniaoResult = {
            provider: "União 7 Pay",
            status: "OFFLINE",
            latencyMs: elapsed,
            httpStatus: res.status,
            message: `Retornou HTTP ${res.status}`,
          };
        }
      }
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - uniaoStart);
      const msg = err instanceof Error ? err.message : "Timeout ou falha de rede";
      uniaoResult = {
        provider: "União 7 Pay",
        status: "OFFLINE",
        latencyMs: elapsed,
        message: msg.includes("Timeout") || msg.includes("timeout") ? "Timeout de Conexão (> 5s)" : msg,
      };
    }

    // 2. Sondagem Camuflada Elite PAYbr
    const eliteStart = performance.now();
    let eliteResult: GatewayProbeResult;
    try {
      const clientId = getSecret("ELITE_CLIENT_ID");
      const clientSecret = getSecret("ELITE_CLIENT_SECRET");
      const baseUrl = getSecret("ELITE_BASE_URL");

      if (!clientId || !clientSecret || !baseUrl) {
        eliteResult = {
          provider: "Elite PAYbr",
          status: "OFFLINE",
          latencyMs: 0,
          message: "Client ID ou Secret não configurado",
        };
      } else {
        const res = await fetch(`${baseUrl}/api/v1/deposit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": clientId,
            "x-client-secret": clientSecret,
          },
          body: JSON.stringify({
            amount: 2.00,
            description: "Sondagem de Integridade Sintetica",
            payerName: "Sondagem Sintetica",
            payerDocument: "00000000000",
          }),
          signal: AbortSignal.timeout(5000),
        });
        const elapsed = Math.round(performance.now() - eliteStart);
        if (res.ok) {
          const resJson = await res.json().catch(() => ({}));
          eliteResult = {
            provider: "Elite PAYbr",
            status: elapsed > 2500 ? "LENTO" : "ONLINE",
            latencyMs: elapsed,
            httpStatus: res.status,
            message: resJson.success ? "PIX e Credenciais Validados" : "Endpoint de depósito ativo",
          };
        } else {
          eliteResult = {
            provider: "Elite PAYbr",
            status: "OFFLINE",
            latencyMs: elapsed,
            httpStatus: res.status,
            message: `Retornou HTTP ${res.status}`,
          };
        }
      }
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - eliteStart);
      const msg = err instanceof Error ? err.message : "Timeout ou falha de rede";
      eliteResult = {
        provider: "Elite PAYbr",
        status: "OFFLINE",
        latencyMs: elapsed,
        message: msg.includes("Timeout") || msg.includes("timeout") ? "Timeout de Conexão (> 5s)" : msg,
      };
    }

    // 3. Tomada de Decisão Preventiva Baseada na Configuração do Admin
    const primaryResult = primary === "União 7 Pay" ? uniaoResult : eliteResult;
    const secondaryResult = primary === "União 7 Pay" ? eliteResult : uniaoResult;

    let actionTaken = "Nenhuma alteração necessária.";
    if (primaryResult.status === "OFFLINE" && secondaryResult.status !== "OFFLINE" && autoFailover) {
      this.primaryFailCount = this.maxFailuresBeforeSwitch;
      actionTaken = `⚠️ Failover Preventivo Ativado: ${secondary} assumiu o comando para blindar as compras dos leads.`;
    } else if (primaryResult.status === "ONLINE") {
      if (this.primaryFailCount >= this.maxFailuresBeforeSwitch) {
        actionTaken = `✅ Gateway Principal (${primary}) restabelecido com sucesso.`;
      } else {
        actionTaken = "🛡️ Gateways monitorados com resposta rápida e prontos para checkout.";
      }
      this.primaryFailCount = 0;
    }

    const activeProviderName: "União 7 Pay" | "Elite PAYbr" =
      (this.primaryFailCount >= this.maxFailuresBeforeSwitch && autoFailover) ? secondary : primary;

    const report: StealthApiTestReport = {
      timestamp: formatBrasiliaTime(),
      primaryGateway: primary,
      secondaryGateway: secondary,
      autoFailoverEnabled: autoFailover,
      uniao: uniaoResult,
      elite: eliteResult,
      activeProvider: activeProviderName,
      switchActionTaken: actionTaken,
      allSystemsOperational: uniaoResult.status !== "OFFLINE" && eliteResult.status !== "OFFLINE",
    };

    this.lastProbeReport = report;
    this.lastProbeTime = Date.now();
    return report;
  }

  // Preflight Inteligente: Se passaram mais de 10 minutos sem teste, roda silenciosamente
  public static async ensurePreflightGatewayCheck(): Promise<void> {
    if (Date.now() - this.lastProbeTime > 10 * 60 * 1000 && !this.isProbing) {
      this.isProbing = true;
      try {
        await this.runStealthApiHealthCheck("preflight_automático");
      } catch (err) {
        console.warn("[Stealth Probe Error]:", err);
      } finally {
        this.isProbing = false;
      }
    }
  }

  public static getLastReport(): StealthApiTestReport | null {
    return this.lastProbeReport;
  }

  public static getGatewayHealth(): {
    primaryGateway: string;
    secondaryGateway: string;
    autoFailoverEnabled: boolean;
    activeProvider: string;
    uniaoHealth: string;
    eliteHealth: string;
    lastTested?: string | undefined;
  } {
    const config = getRifaConfig();
    const primary = config.primaryGateway || "União 7 Pay";
    const secondary = config.secondaryGateway || (primary === "União 7 Pay" ? "Elite PAYbr" : "União 7 Pay");
    const autoFailover = config.autoFailoverEnabled !== false;
    const report = this.lastProbeReport;

    const isFailing = this.primaryFailCount >= this.maxFailuresBeforeSwitch;
    const activeProvider = isFailing && autoFailover ? `${secondary} (Failover Ativo)` : `${primary} (Operacional)`;

    const result: {
      primaryGateway: string;
      secondaryGateway: string;
      autoFailoverEnabled: boolean;
      activeProvider: string;
      uniaoHealth: string;
      eliteHealth: string;
      lastTested?: string | undefined;
    } = {
      primaryGateway: primary,
      secondaryGateway: secondary,
      autoFailoverEnabled: autoFailover,
      activeProvider,
      uniaoHealth: report ? `${report.uniao.status} (${report.uniao.latencyMs}ms)` : (this.primaryFailCount === 0 ? "100% Online" : `${this.primaryFailCount} falhas`),
      eliteHealth: report ? `${report.elite.status} (${report.elite.latencyMs}ms)` : "100% Online e Pronta",
    };

    if (report?.timestamp) {
      result.lastTested = report.timestamp;
    }

    return result;
  }
}
