import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questions } from "@/lib/constants";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";

export function FaqSection() {
  const [openedQuestion, setOpenedQuestion] = useState<number | null>(null);
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const handleAskSupport = (questionText?: string) => {
    redirectToWhatsApp("duvida_item", questionText || "");
  };

  return (
    <section className="faq-section" id="duvidas">
      <div className="section-inner">
        <h2>
          <strong>{cloakText("BOLADA PIX")}</strong> <span>É SEGURO</span>
        </h2>
        <p className="faq-intro">Dúvida? Estamos aqui para ajudar.</p>
        <div className="faq-list">
          {questions.map(([question, answer], index) => (
            <div className="faq-item" key={question}>
              <Button
                variant="navigation"
                className="faq-question"
                aria-expanded={openedQuestion === index}
                aria-controls={`answer-${index}`}
                onClick={() =>
                  setOpenedQuestion(openedQuestion === index ? null : index)
                }
              >
                <span>{cloakText(question)}</span>
                <span className="faq-icon">
                  {openedQuestion === index ? <Minus /> : <Plus />}
                </span>
              </Button>
              {openedQuestion === index && (
                <div className="faq-answer" id={`answer-${index}`}>
                  <p>{cloakText(answer)}</p>
                  <button
                    type="button"
                    onClick={() => handleAskSupport(question)}
                    className="mt-3 inline-flex items-center text-xs text-[#518b2b] hover:underline font-semibold cursor-pointer"
                  >
                    💬 Falar com atendente sobre isso no WhatsApp →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
