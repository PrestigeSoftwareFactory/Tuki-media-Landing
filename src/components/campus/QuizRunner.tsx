"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicQuiz } from "@/lib/quiz";
import { submitQuizAction, type QuizSubmitResult } from "@/app/actions/quiz";

type Props = {
  lessonId: string;
  quiz: PublicQuiz;
  best: { score: number; passed: boolean; attempts: number } | null;
};

export function QuizRunner({ lessonId, quiz, best }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[][]>(() => quiz.questions.map(() => []));
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [pending, start] = useTransition();
  const [started, setStarted] = useState(!best);

  const toggle = (qi: number, oi: number, multiple: boolean) => {
    if (result) return;
    setAnswers((prev) => {
      const next = prev.map((a) => [...a]);
      if (multiple) next[qi] = next[qi].includes(oi) ? next[qi].filter((x) => x !== oi) : [...next[qi], oi];
      else next[qi] = [oi];
      return next;
    });
  };

  const answered = answers.filter((a) => a.length).length;
  const submit = () =>
    start(async () => {
      const r = await submitQuizAction(lessonId, answers);
      setResult(r);
      if (r.ok && r.passed) router.refresh();
      if (r.ok && r.certificateCode) {
        window.dispatchEvent(new CustomEvent("tuki:toast", { detail: { text: "¡Completaste el curso! Tu certificado ya está disponible 🎓" } }));
      }
    });

  const retry = () => {
    setAnswers(quiz.questions.map(() => []));
    setResult(null);
    setStarted(true);
  };

  if (!started && best) {
    return (
      <div className="qz">
        <div className="qz-head">
          <strong>Evaluación de la clase</strong>
          <span className={`badge ${best.passed ? "answered" : "open"}`}>
            {best.passed ? `Aprobada · ${best.score}%` : `Mejor nota: ${best.score}% (mínimo ${quiz.passScore}%)`}
          </span>
        </div>
        <p className="qz-sub">
          {best.attempts} {best.attempts === 1 ? "intento" : "intentos"}. {best.passed ? "Podés volver a hacerla para repasar." : "Repasá la clase y volvé a intentarlo."}
        </p>
        <button type="button" className="cp-btn lg" onClick={retry}>
          {best.passed ? "Repetir evaluación" : "Intentar de nuevo"}
        </button>
      </div>
    );
  }

  return (
    <div className="qz">
      <div className="qz-head">
        <strong>Evaluación de la clase</strong>
        <span className="badge">
          {quiz.questions.length} {quiz.questions.length === 1 ? "pregunta" : "preguntas"} · aprobás con {quiz.passScore}%
        </span>
      </div>
      <ol className="qz-list">
        {quiz.questions.map((q, qi) => {
          const res = result?.ok ? result.results[qi] : null;
          return (
            <li key={qi} className={res ? (res.correct ? "ok" : "bad") : ""}>
              <p className="qz-q">{q.text}</p>
              {q.multiple && !res && <small className="qz-hint">Puede haber más de una respuesta correcta.</small>}
              <div className="qz-opts">
                {q.options.map((o, oi) => {
                  const chosen = answers[qi].includes(oi);
                  const isCorrect = res?.correctOptions.includes(oi);
                  return (
                    <label key={oi} className={`qz-opt${chosen ? " chosen" : ""}${res && isCorrect ? " right" : ""}${res && chosen && !isCorrect ? " wrong" : ""}`}>
                      <input
                        type={q.multiple ? "checkbox" : "radio"}
                        name={`q${qi}`}
                        checked={chosen}
                        onChange={() => toggle(qi, oi, q.multiple)}
                        disabled={!!result}
                      />
                      <span>{o}</span>
                    </label>
                  );
                })}
              </div>
              {res && res.explanation && <p className="qz-exp">{res.explanation}</p>}
            </li>
          );
        })}
      </ol>
      {result && !result.ok && <div className="cp-msg cp-msg-error">{result.error}</div>}
      {result?.ok ? (
        <div className={`qz-result ${result.passed ? "pass" : "fail"}`}>
          <strong>
            {result.passed ? "¡Aprobaste!" : "No llegaste al mínimo"} · {result.score}%
          </strong>
          <span>{result.passed ? "La clase quedó completada." : `Necesitás ${result.passScore}% para aprobar. Revisá las respuestas marcadas y volvé a intentarlo.`}</span>
          <button type="button" className="cp-btn ghost" onClick={retry}>
            {result.passed ? "Volver a hacerla" : "Intentar de nuevo"}
          </button>
        </div>
      ) : (
        <button type="button" className="cp-btn lg" disabled={pending || answered < quiz.questions.length} onClick={submit}>
          {pending ? "Corrigiendo…" : answered < quiz.questions.length ? `Respondé todas (${answered}/${quiz.questions.length})` : "Entregar evaluación"}
        </button>
      )}
    </div>
  );
}
