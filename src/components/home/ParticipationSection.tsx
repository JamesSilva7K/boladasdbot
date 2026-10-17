import stepOne from "@/assets/step-one.webp";
import stepTwo from "@/assets/step-two.webp";
import stepThree from "@/assets/step-three.webp";

export function ParticipationSection() {
  const steps = [
    [
      stepOne,
      "Escolha seu título",
      "Você pode escolher quantos títulos quiser! Quanto mais selecionar, mais chances você tem de ganhar!",
    ],
    [
      stepTwo,
      "Efetue o pagamento",
      "Fácil e seguro! E você pode pagar via pix!",
    ],
    [
      stepThree,
      "Pronto!",
      'Agora você já está participando! Você pode consultar o seu bilhete em "Meus números"',
    ],
  ];

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
            <div className="participation-step" key={alt}>
              <img src={src} alt={alt} loading="lazy" />
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
