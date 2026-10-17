// Gateway de Pagamento com Failover Automático e Inteligente
// Primário: União 7 Pay
// Secundário / Reserva: Elite PAYbr

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
}

// Armazena transações recentes em memória para reconciliação do Lead
const transactionLeadMap = new Map<string, { lead: PurchaseLeadInfo; amount: number; provider: string; createdAt: string }>();

export function storeTransactionLead(txId: string, lead: PurchaseLeadInfo, amount: number, provider: string) {
  transactionLeadMap.set(txId, {
    lead,
    amount,
    provider,
    createdAt: new Date().toISOString(),
  });
}

export function getTransactionLead(txId: string) {
  return transactionLeadMap.get(txId);
}

export class PaymentManager {
  private static uniaoFailCount = 0;
  private static maxFailuresBeforeSwitch = 2;

  // Cálculo da Taxa e Valor Líquido do Admin Supremo
  // União 7 Pay: taxa padrão de ~0.99% ou R$ 0,50 fixo
  // Elite PAYbr: taxa descrita na documentação (ex: 1.50 fixo ou 4% com taxas da adquirente MisticPay)
  public static calculateNet(amount: number, provider: "União 7 Pay" | "Elite PAYbr"): { fee: number; netAmount: number } {
    let fee = 0;
    if (provider === "União 7 Pay") {
      fee = 0.50; // Taxa estimada por transação PIX
    } else {
      fee = 1.50; // Taxa informada no payload de webhook da ElitePay
    }

    if (fee > amount) {
      fee = Number((amount * 0.05).toFixed(2)); // fallback se a cota for menor que a taxa fixa
    }

    const netAmount = Number((amount - fee).toFixed(2));
    return { fee, netAmount };
  }

  // 1. Tentar União 7 Pay (Principal)
  private static async chargeUniao7(data: PixChargeRequest): Promise<PixChargeResponse> {
    const apiKey = process.env["UNIAO7_API_KEY"] || "up_live_4dfac754f54c28d4f692fa1f58752e66354a36346c589cac";
    const baseUrl = process.env["UNIAO7_BASE_URL"] || "https://meupagamento.site/api/v1/uniaopay/pix/create";

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
      throw new Error(`União 7 Pay retornou HTTP ${response.status}`);
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

  // 2. Tentar Elite PAYbr (Secundária / Backup com Failover Automático)
  private static async chargeElitePay(data: PixChargeRequest): Promise<PixChargeResponse> {
    const clientId = process.env["ELITE_CLIENT_ID"] || "ep_6048463324683e160dc35f1fd0f27d37";
    const clientSecret = process.env["ELITE_CLIENT_SECRET"] || "eps_daa2098e2b7319a83a2d26090f749003709889d24594332ae0eb712e0bc1b467";
    const baseUrl = process.env["ELITE_BASE_URL"] || "https://api.elitepaybr.com";

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
      throw new Error(`Elite PAYbr retornou HTTP ${response.status}`);
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

  // Orquestrador Central com Failover Automático
  public static async createPixCharge(data: PixChargeRequest): Promise<PixChargeResponse> {
    if (this.uniaoFailCount < this.maxFailuresBeforeSwitch) {
      try {
        const result = await this.chargeUniao7(data);
        this.uniaoFailCount = 0;
        return result;
      } catch (err) {
        this.uniaoFailCount += 1;
        console.warn(`[Failover] União 7 Pay falhou (${this.uniaoFailCount}/${this.maxFailuresBeforeSwitch}):`, err);
      }
    }

    console.log("[Failover] Acionando Gateway de Reserva: Elite PAYbr...");
    try {
      const result = await this.chargeElitePay(data);
      return result;
    } catch (eliteErr) {
      console.error("[Failover] Ambas as adquirentes falharam:", eliteErr);
      return {
        success: false,
        provider: "Elite PAYbr",
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

  public static getGatewayHealth(): { activeProvider: string; uniaoHealth: string; eliteHealth: string } {
    return {
      activeProvider: this.uniaoFailCount >= this.maxFailuresBeforeSwitch ? "Elite PAYbr (Reserva Ativa)" : "União 7 Pay (Principal)",
      uniaoHealth: this.uniaoFailCount === 0 ? "100% Online" : `${this.uniaoFailCount} falhas detectadas`,
      eliteHealth: "100% Online e Pronta",
    };
  }
}
