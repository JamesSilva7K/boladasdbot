import stepOne from "@/assets/step-one.webp";
import stepTwo from "@/assets/step-two.webp";
import stepThree from "@/assets/step-three.webp";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";

export function ParticipationSection() {
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const steps = [
    [
      stepOne,
      "Escolha seu título",
      cloakText("Você pode escolher quantos títulos quiser! Quanto mais selecionar, mais chances você tem de ganhar!"),
    ],
    [
      stepTwo,
      "Efetue o pagamento",
      cloakText("Fácil e seguro! E você pode pagar via pix!"),
    ],
    [
      stepThree,
      "Pronto!",
      cloakText('Agora você já está participando! Você pode consultar o seu bilhete em "Meus números"'),
    ],
  ];

  const handleStepClick = (stepTitle?: string) => {
    redirectToWhatsApp("passos_participacao", stepTitle || "");
  };

  return (
    <section className="participation-section">
      <div className="section-inner">
        <h1>
          É <span>FÁCIL</span> PARTICIPAR!
        </h1>
        <p className="participation-intro">
          E o melhor de tudo é poder concorrer a esse super prêmio com apenas
          algumas moedas!
        </p>
        <div className="participation-steps">
          {steps.map(([src, alt, text]) => (
            <div
              className="participation-step cursor-pointer"
              key={alt}
              onClick={() => handleStepClick(alt)}
              title="Clique para tirar dúvidas sobre este passo via WhatsApp"
            >
              <img src={src} alt={alt} loading="lazy" />
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
