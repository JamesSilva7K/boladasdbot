import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questions } from "@/lib/constants";

export function FaqSection() {
  const [openedQuestion, setOpenedQuestion] = useState<number | null>(null);

  return (
    <section className="faq-section" id="duvidas">
      <div className="section-inner">
        <h2>
          <strong>BOLADA PIX</strong> <span>É SEGURO</span>
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
                <span>{question}</span>
                <span className="faq-icon">
                  {openedQuestion === index ? <Minus /> : <Plus />}
                </span>
              </Button>
              {openedQuestion === index && (
                <div className="faq-answer" id={`answer-${index}`}>
                  {answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
