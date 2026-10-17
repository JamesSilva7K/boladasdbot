import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { cpf as cpfValidator } from "cpf-cnpj-validator";

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
  selectedCotas: initialSelectedCotas = 30,
}: PaymentModalProps) {
  const config = useRifaConfig();
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const [selectedCotas, setSelectedCotas] = useState(initialSelectedCotas);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCopiaCola: string;
    qrCodeBase64?: string;
    provider: string;
  } | null>(null);

  const [tickets, setTickets] = useState<{ code: string; hash: string }[]>([]);
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

  const isValidCpf = cpfValidator.isValid(cpf.replace(/\D/g, ""));
  const isFormValid = isValidCpf && captchaToken && !loading;

  const currentTotal = Number((selectedCotas * (config.ticketPrice || 0.69)).toFixed(2));
  const currentTotalFormatted = currentTotal.toFixed(2).replace(".", ",");

  const handleOpenModal = () => {
    setOpen(true);
    setPixData(null);
    setTickets([]);
    setCurrentTxId(null);
    setSelectedCotas(initialSelectedCotas || 30);
    if (onModalOpen) onModalOpen();
    reportUserActivity("modal_opened", { cotas: initialSelectedCotas || 30 });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    setCpf(value);

    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 11) {
      if (cpfValidator.isValid(digitsOnly)) {
        reportUserActivity("cpf_validado", { cpf: value, cpfLimpo: digitsOnly });
      } else {
        reportUserActivity("cpf_invalido", { cpfDigitado: value });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    const digitsOnly = cpf.replace(/\D/g, "");

    reportUserActivity("tentativa_consulta", {
      cpf: cpf,
      cpfLimpo: digitsOnly,
      hasCaptcha: Boolean(captchaToken),
      cotas: selectedCotas,
      amount: currentTotal,
    });

    try {
      const res = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: currentTotal,
          description: `Bolada Pix - ${selectedCotas} Cotas - ${config.edition}`,
          payerDocument: digitsOnly,
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
        alert(data.error || "Não foi possível gerar a cobrança PIX no momento. Tente novamente.");
      }
    } catch {
      alert("Erro ao conectar com o gateway de pagamento.");
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
      <div onClick={handleOpenModal} className="w-full flex justify-center cursor-pointer">
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
            <div className="flex flex-col gap-4 py-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-900 text-sm">
                ✅ <b>{tickets.length} cotas oficiais</b> geradas de 6 dígitos numéricos. Seus números já estão concorrendo!
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-wrap gap-2">
                {tickets.map((t, idx) => (
                  <div
                    key={t.code + idx}
                    className="flex flex-col items-center justify-center bg-white border border-gray-300 rounded px-3 py-1.5 shadow-2xs font-mono"
                  >
                    <span className="text-xs text-gray-500 font-sans font-medium">#{idx + 1}</span>
                    <span className="text-base font-extrabold text-[#4d8227] tracking-wider">{t.code}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <Button
                  onClick={handleCopyAllTickets}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-[#4d8227] text-[#4d8227] hover:bg-[#4d8227]/10"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  {copiedCodes ? "Copiado!" : "Copiar Todas as Cotas"}
                </Button>

                <Button
                  onClick={handleDownloadTxt}
                  className="w-full flex items-center justify-center gap-2 bg-[#4d8227] hover:bg-[#437422] text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Salvar Comprovante em TXT
                </Button>
              </div>
            </div>
          ) : pixData ? (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* Exibição do QR Code Oficial com Fallback Automático Infalível */}
              <div className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl shadow-xs">
                {qrCodeSrc ? (
                  <img
                    src={qrCodeSrc}
                    alt="QR Code PIX"
                    className="w-48 h-48 object-contain rounded-md"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-50 border border-dashed rounded-md text-xs text-gray-400">
                    Gerando QR Code...
                  </div>
                )}
                <span className="text-[11px] font-semibold text-gray-500 mt-2">
                  Aponte a câmera do aplicativo do seu banco
                </span>
              </div>

              <div className="w-full flex flex-col gap-2">
                <Label className="text-sm font-medium">{cloakText("PIX Copia e Cola:")}</Label>
                <div className="flex gap-2">
                  <Input readOnly value={pixData.pixCopiaCola} className="text-xs font-mono h-10 select-all" />
                  <Button onClick={handleCopyPix} className="bg-[#518b2b] hover:bg-[#437422] text-white shrink-0 px-5">
                    Copiar
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Aguardando confirmação do banco... Ao pagar, seus bilhetes de 6 dígitos surgirão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-foreground font-medium flex justify-between items-center">
                  <span>{cloakText("Quantidade de Cotas:")}</span>
                  <span className="text-xs text-[#518b2b] font-bold">
                    R$ {(config.ticketPrice || 0.69).toFixed(2).replace(".", ",")} por cota
                  </span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {packages.map((pkg) => {
                    const price = (pkg.cotas * (config.ticketPrice || 0.69)).toFixed(2).replace(".", ",");
                    const isSelected = selectedCotas === pkg.cotas;
                    return (
                      <button
                        key={pkg.cotas}
                        type="button"
                        onClick={() => setSelectedCotas(pkg.cotas)}
                        className={`relative p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-[#518b2b] bg-[#518b2b]/10 shadow-sm ring-1 ring-[#518b2b]"
                            : "border-input bg-card hover:border-[#518b2b]/50"
                        }`}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2 bg-[#518b2b] text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Mais Popular
                          </span>
                        )}
                        <span className="font-bold text-sm sm:text-base text-foreground">
                          {pkg.cotas} {cloakText("cotas")}
                        </span>
                        <span className="text-xs font-semibold text-[#518b2b]">
                          R$ {price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cpf" className="text-sm text-foreground font-medium">
                  CPF
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  className={`h-12 text-base px-4 border ${
                    cpf.length === 14 && !isValidCpf ? "border-red-500 focus-visible:ring-red-500" : "border-input"
                  }`}
                />
                {cpf.length === 14 && !isValidCpf && (
                  <span className="text-sm text-red-500 font-medium">CPF inválido</span>
                )}
              </div>

              <div className="w-full flex items-center justify-center min-h-[78px] overflow-hidden">
                <Turnstile
                  siteKey="1x00000000000000000000AA"
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{
                    theme: "light",
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={!isFormValid}
                className="w-full h-12 text-base font-bold text-white bg-[#518b2b] hover:bg-[#437422] disabled:bg-[#d8e4d1] disabled:text-white disabled:opacity-100 mt-2 rounded-md shadow"
              >
                {loading
                  ? "Gerando PIX com Blindagem..."
                  : `Garantir ${selectedCotas} Cotas por R$ ${currentTotalFormatted}`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
