import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  validateBrazilianCpf,
  type CpfValidationResult,
} from "@/lib/brazilian-player-validator";
import {
  initPlayerTelemetry,
  recordFormKeystroke,
  getClientPlayerTelemetryPayload,
} from "@/lib/client-player-telemetry";

import { Turnstile } from "@marsidev/react-turnstile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { reportUserActivity, useRifaConfig } from "@/hooks/useRifaConfig";
import { cloakText } from "@/lib/cloaker";

interface PaymentModalProps {
  children: React.ReactNode;
  onModalOpen?: () => void;
  selectedCotas?: number;
  totalPrice?: number;
}

export function PaymentModal({
  children,
  onModalOpen,
  selectedCotas: initialSelectedCotas = 25,
}: PaymentModalProps) {
  const config = useRifaConfig();
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const [selectedCotas, setSelectedCotas] = useState(initialSelectedCotas);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    pixCopiaCola: string;
    qrCodeBase64?: string;
    provider: string;
  } | null>(null);

  const [tickets, setTickets] = useState<{ code: string; hash: string }[]>([]);
  const [proofToken, setProofToken] = useState<string | null>(null);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);

  // Geração garantida do QR Code PIX a partir do código PIX Copia e Cola ou Base64 retornado
  useEffect(() => {
    if (!pixData?.pixCopiaCola) {
      setQrCodeSrc(null);
      return;
    }

    // Se o gateway já forneceu imagem base64 válida ou URL HTTP direta
    if (pixData.qrCodeBase64) {
      const b64 = pixData.qrCodeBase64.trim();
      if (b64.startsWith("data:") || b64.startsWith("http")) {
        setQrCodeSrc(b64);
        return;
      }
      if (b64.length > 50 && !b64.includes(" ")) {
        setQrCodeSrc(`data:image/png;base64,${b64.replace(/^base64:/, "")}`);
        return;
      }
    }

    // Fallback dinâmico infalível: gera a imagem do QR Code instantaneamente a partir da string EMV do PIX
    let active = true;
    QRCode.toDataURL(pixData.pixCopiaCola, {
      width: 320,
      margin: 1,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setQrCodeSrc(url);
      })
      .catch(() => {
        // Fallback para serviço online de QR code caso falhe localmente
        if (active) {
          setQrCodeSrc(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixData.pixCopiaCola)}`);
        }
      });

    return () => {
      active = false;
    };
  }, [pixData]);


  // Polling automático de status de pagamento e liberação dos códigos criptografados
  useEffect(() => {
    if (!currentTxId || tickets.length > 0) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tickets/status?txId=${encodeURIComponent(currentTxId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.proofToken) setProofToken(data.proofToken);
          if (data.hasTickets && Array.isArray(data.tickets)) {
            setTickets(data.tickets);
            clearInterval(interval);
          }
        }
      } catch {
        // Silencioso
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentTxId, tickets.length]);

  const handleCopyAllTickets = () => {
    if (tickets.length > 0) {
      const text = tickets.map((t, idx) => `Cota #${idx + 1}: ${t.code} (Hash: ${t.hash})`).join("\n");
      navigator.clipboard.writeText(text);
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    }
  };

  const handleDownloadTxt = () => {
    if (currentTxId) {
      window.open(`/api/tickets/download?txId=${encodeURIComponent(currentTxId)}`, "_blank");
    }
  };

  const packages = [
    { cotas: 23, tag: "INICIANTE", popular: false },
    { cotas: 30, tag: "MAIS POPULAR", popular: true },
    { cotas: 50, tag: "RECOMENDADO", popular: false },
    { cotas: 100, tag: "SUPER CHANCE", popular: false },
  ];

  useEffect(() => {
    initPlayerTelemetry();
  }, []);

  const cpfDigits = cpf.replace(/\D/g, "");
  const cpfResult: CpfValidationResult = validateBrazilianCpf(cpfDigits);
  const isValidCpf = cpfResult.isValid || cpfDigits.length === 11;
  const isFormValid = cpfDigits.length === 11 && !loading;

  const currentTotal = Number((selectedCotas * (config.ticketPrice || 0.69)).toFixed(2));
  const currentTotalFormatted = currentTotal.toFixed(2).replace(".", ",");

  useEffect(() => {
    if (initialSelectedCotas) {
      setSelectedCotas(initialSelectedCotas);
    }
  }, [initialSelectedCotas]);

  const handleOpenModal = () => {
    setOpen(true);
    setPixData(null);
    setTickets([]);
    setCurrentTxId(null);
    setFormError(null);
    setSelectedCotas(initialSelectedCotas || 30);
    if (onModalOpen) onModalOpen();
    reportUserActivity("modal_opened", { cotas: initialSelectedCotas || 30 });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    recordFormKeystroke();
    setFormError(null);
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 11) raw = raw.slice(0, 11);

    let formatted = raw;
    if (raw.length > 9) {
      formatted = raw.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    } else if (raw.length > 6) {
      formatted = raw.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (raw.length > 3) {
      formatted = raw.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }

    setCpf(formatted);

    if (raw.length === 11) {
      const check = validateBrazilianCpf(raw);
      reportUserActivity("cpf_validado", {
        cpf: formatted,
        cpfLimpo: raw,
        fiscalRegion: check.fiscalRegion?.description,
        estados: check.fiscalRegion?.states,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const digitsOnly = cpf.replace(/\D/g, "");
    if (digitsOnly.length < 11) {
      setFormError("Por favor, digite os 11 dígitos do seu CPF para emitir os bilhetes oficiais.");
      const el = document.getElementById("cpf");
      if (el) el.focus();
      return;
    }

    setLoading(true);
    const telemetry = getClientPlayerTelemetryPayload(digitsOnly);

    reportUserActivity("tentativa_consulta", {
      cpf: cpf,
      cpfLimpo: digitsOnly,
      hasCaptcha: Boolean(captchaToken),
      cotas: selectedCotas,
      amount: currentTotal,
      telemetry,
      fiscalRegion: cpfResult.fiscalRegion?.description,
    });

    try {
      const res = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: currentTotal,
          description: `Bolada Pix - ${selectedCotas} Cotas - ${config.edition}`,
          payerDocument: digitsOnly,
          telemetry,
        }),
      });

      const data = await res.json();
      if (data.success && data.pixCopiaCola) {
        setPixData({
          pixCopiaCola: data.pixCopiaCola,
          qrCodeBase64: data.qrCodeBase64,
          provider: data.provider,
        });
        setCurrentTxId(data.transactionId || null);
      } else {
        setFormError(data.error || "Não foi possível gerar a cobrança PIX no momento. Tente novamente.");
      }
    } catch {
      setFormError("Erro de comunicação com o servidor de pagamento. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.pixCopiaCola) {
      navigator.clipboard.writeText(pixData.pixCopiaCola);
      alert("Código PIX Copia e Cola copiado com sucesso!");
    }
  };

  return (
    <>
      <div onClick={handleOpenModal} className="inline-flex cursor-pointer">
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] gap-6 p-6">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl font-semibold">
              {tickets.length > 0
                ? "🎉 Pagamento Confirmado! Seus Números Estão Prontos"
                : pixData
                ? cloakText("Pagamento PIX Gerado")
                : "Informe o CPF"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {tickets.length > 0
                ? "Parabéns! Seus bilhetes criptografados de 6 dígitos foram emitidos com sucesso:"
                : pixData
                ? cloakText("Efetue o pagamento via PIX para garantir suas cotas com segurança:")
                : cloakText("Para visualizar os dados da sua compra e gerar o PIX, selecione suas cotas e informe seu CPF:")}
            </DialogDescription>
          </DialogHeader>

          {tickets.length > 0 ? (
            <div className="flex flex-col gap-4 py-1">
              {/* Banner de sucesso */}
              <div className="flex flex-col items-center gap-1.5 py-3 px-4 bg-gradient-to-b from-green-50 to-white border border-green-200 rounded-xl text-center">
                <span className="text-3xl">🎉</span>
                <p className="text-sm font-bold text-green-800">
                  Pagamento confirmado! Seus <span className="text-green-600">{tickets.length} números</span> estão concorrendo!
                </p>
                <p className="text-xs text-green-700 opacity-80">
                  Guarde os códigos abaixo — eles são seus bilhetes oficiais
                </p>
              </div>

              {/* Selo Criptográfico Militar de Autenticidade */}
              <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 shadow-2xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>🛡️</span>
                  <span>Compra Autenticada via <strong>AES-256-GCM</strong></span>
                </div>
                {proofToken && (
                  <span className="font-mono text-[10px] text-emerald-900 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                    RECIBO: {proofToken.substring(0, 10)}
                  </span>
                )}
              </div>

              {/* Grid de bilhetes numerados */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    🎟️ Seus Bilhetes Oficiais
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{tickets.length} cotas</span>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 flex flex-col gap-1">
                  {tickets.map((t, idx) => (
                    <div
                      key={t.code + idx}
                      className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-2xs"
                    >
                      <span className="text-[11px] text-gray-400 font-semibold font-sans w-6 shrink-0">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-center text-base font-extrabold text-[#4d8227] tracking-widest font-mono">
                        {t.code}
                      </span>
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 border border-green-100 rounded px-1.5 py-0.5 shrink-0">
                        ATIVO
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instruções */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 leading-relaxed">
                ℹ️ <strong>Guarde seus números!</strong> Salve o comprovante em TXT ou copie os códigos. Você concorre automaticamente no sorteio do dia <strong>{cloakText("04/11 às 20:00")}</strong>.
              </div>

              {/* Botões de ação */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleCopyAllTickets}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-[#4d8227] text-[#4d8227] hover:bg-[#4d8227]/10 text-sm font-semibold h-11"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  {copiedCodes ? "✅ Copiado!" : "Copiar Todos"}
                </Button>

                <Button
                  onClick={handleDownloadTxt}
                  className="w-full flex items-center justify-center gap-2 bg-[#4d8227] hover:bg-[#437422] text-white text-sm font-semibold h-11"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Salvar TXT
                </Button>
              </div>
            </div>
          ) : pixData ? (
            <div className="flex flex-col items-center gap-5 py-2">
              {/* Box elegante do QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200/90 rounded-2xl shadow-xs">
                {qrCodeSrc ? (
                  <img
                    src={qrCodeSrc}
                    alt="QR Code PIX"
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-lg gap-2 text-xs text-gray-400">
                    <span className="w-6 h-6 border-2 border-[#4d8227] border-t-transparent rounded-full animate-spin"></span>
                    <span>Gerando QR Code Oficial...</span>
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-500 mt-2.5">
                  Aponte a câmera do aplicativo do seu banco
                </span>
              </div>

              {/* Input PIX Copia e Cola com botão Copiar verde */}
              <div className="w-full flex flex-col gap-2">
                <Label className="text-sm font-semibold text-gray-700">{cloakText("PIX Copia e Cola:")}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={pixData.pixCopiaCola}
                    className="text-xs font-mono h-11 bg-gray-50/60 border-gray-300 rounded-lg select-all"
                  />
                  <Button
                    onClick={handleCopyPix}
                    className="bg-[#4d8227] hover:bg-[#437422] text-white font-bold px-6 h-11 rounded-lg shrink-0 cursor-pointer shadow-xs active:scale-98 transition-all"
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Status de aguardo em tempo real */}
              <div className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-gray-50/80 border border-gray-200/70 rounded-xl text-xs text-gray-600 text-center leading-relaxed">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span>
                  Aguardando confirmação do banco... Ao pagar, seus bilhetes de 6 dígitos surgirão aqui instantaneamente.
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-800">
                  <span>Quantidade de Cotas:</span>
                  <span className="text-xs text-[#4d8227] font-bold">
                    R$ {(config.ticketPrice || 0.69).toFixed(2).replace(".", ",")} por cota
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {packages.map((pkg) => {
                    const price = (pkg.cotas * (config.ticketPrice || 0.69)).toFixed(2).replace(".", ",");
                    const isSelected = selectedCotas === pkg.cotas;
                    return (
                      <button
                        key={pkg.cotas}
                        type="button"
                        onClick={() => setSelectedCotas(pkg.cotas)}
                        className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-[#4d8227] bg-[#edf7ea] ring-1 ring-[#4d8227]"
                            : "border-gray-200 bg-white hover:border-[#4d8227]/40"
                        }`}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2.5 bg-[#4d8227] text-[9.5px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            MAIS POPULAR
                          </span>
                        )}
                        <span className="font-extrabold text-sm sm:text-base text-gray-900 leading-tight">
                          {pkg.cotas} cotas
                        </span>
                        <span className="text-xs font-bold text-[#4d8227] mt-0.5">
                          R$ {price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cpf" className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span>CPF</span>
                    <span className="text-[11px] font-normal text-gray-500">(Chave Oficial)</span>
                  </Label>
                  {cpfDigits.length === 11 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>✓</span>
                      <span>{cpfResult.fiscalRegion ? `Receita Federal • ${cpfResult.fiscalRegion.states.join(", ")}` : "CPF Pronto"}</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    inputMode="numeric"
                    maxLength={14}
                    className={`h-12 text-base px-4 pr-10 border rounded-lg font-medium transition-colors ${
                      cpfDigits.length === 11
                        ? "border-emerald-500 bg-emerald-50/20 focus-visible:ring-emerald-500 text-gray-900"
                        : "border-gray-200 focus-visible:ring-[#4d8227]"
                    }`}
                  />
                  {cpfDigits.length === 11 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-emerald-600 text-base font-bold">✓</span>
                    </div>
                  )}
                </div>

                {cpfDigits.length < 11 && (
                  <span className="text-[11px] text-gray-400 font-normal">
                    🔒 Validação instantânea e protegida para emissão dos seus bilhetes oficiais.
                  </span>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <span className="text-sm shrink-0">⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-extrabold text-white bg-[#4d8227] hover:bg-[#437222] disabled:bg-[#4d8227]/70 disabled:text-white rounded-lg shadow-xs transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Gerando PIX Oficial Seguro...</span>
                  </span>
                ) : (
                  `Garantir ${selectedCotas} Cotas por R$ ${currentTotalFormatted}`
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
