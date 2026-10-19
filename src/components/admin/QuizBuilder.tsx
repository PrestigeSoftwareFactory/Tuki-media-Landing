"use client";

import { useState } from "react";
import type { Quiz, QuizQuestion } from "@/lib/quiz";

const emptyQuestion = (): QuizQuestion => ({ text: "", options: ["", ""], correct: [], explanation: "" });

/** Editor de la evaluación de una clase. Envía el JSON en el campo oculto `quiz` ("" = sin evaluación). */
export function QuizBuilder({ initial }: { initial: Quiz | null }) {
  const [enabled, setEnabled] = useState(!!initial);
  const [passScore, setPassScore] = useState(initial?.passScore ?? 70);
  const [questions, setQuestions] = useState<QuizQuestion[]>(initial?.questions ?? [emptyQuestion()]);

  const update = (qi: number, patch: Partial<QuizQuestion>) => setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const move = (qi: number, dir: number) =>
    setQuestions((qs) => {
      const j = qi + dir;
      if (j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[qi], next[j]] = [next[j], next[qi]];
      return next;
    });

  const value = enabled ? JSON.stringify({ passScore, questions }) : "";

  return (
    <div>
      <input type="hidden" name="quiz" value={value} />
      <label className="a-check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>
          Esta clase tiene evaluación
          <small>El alumno completa la clase al aprobarla. Si todas las clases están completas, recibe su certificado.</small>
        </span>
      </label>
      {enabled && (
        <>
          <label className="f" style={{ maxWidth: 220 }}>
            <span>Nota mínima para aprobar (%)</span>
            <input type="number" min={1} max={100} value={passScore} onChange={(e) => setPassScore(Number(e.target.value) || 70)} />
          </label>
          {questions.map((q, qi) => (
            <div key={qi} style={{ border: "1px solid #ece9e2", borderRadius: 10, padding: 14, marginBottom: 12, background: "#fcfbf9" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Pregunta {qi + 1}</strong>
                <span style={{ flex: 1 }} />
                <button type="button" className="icon-btn" onClick={() => move(qi, -1)} disabled={qi === 0} aria-label="Subir">
                  ↑
                </button>
                <button type="button" className="icon-btn" onClick={() => move(qi, 1)} disabled={qi === questions.length - 1} aria-label="Bajar">
                  ↓
                </button>
                <button type="button" className="icon-btn danger" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} aria-label="Eliminar pregunta">
                  ×
                </button>
              </div>
              <input value={q.text} onChange={(e) => update(qi, { text: e.target.value })} placeholder="Enunciado de la pregunta" style={{ marginBottom: 8 }} />
              <small className="hint" style={{ marginBottom: 6 }}>
                Marcá la o las respuestas correctas.
              </small>
              {q.options.map((o, oi) => (
                <div key={oi} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={q.correct.includes(oi)}
                    onChange={(e) =>
                      update(qi, { correct: e.target.checked ? [...q.correct, oi] : q.correct.filter((c) => c !== oi) })
                    }
                    aria-label={`Opción ${oi + 1} correcta`}
                    style={{ width: 18, height: 18, accentColor: "var(--ok)" }}
                  />
                  <input
                    value={o}
                    onChange={(e) => update(qi, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })}
                    placeholder={`Opción ${oi + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    disabled={q.options.length <= 2}
                    onClick={() =>
                      update(qi, {
                        options: q.options.filter((_, k) => k !== oi),
                        correct: q.correct.filter((c) => c !== oi).map((c) => (c > oi ? c - 1 : c)),
                      })
                    }
                    aria-label="Quitar opción"
                  >
                    ×
                  </button>
                </div>
              ))}
              {q.options.length < 8 && (
                <button type="button" className="a-btn ghost xs" onClick={() => update(qi, { options: [...q.options, ""] })}>
                  + Opción
                </button>
              )}
              <input
                value={q.explanation ?? ""}
                onChange={(e) => update(qi, { explanation: e.target.value })}
                placeholder="Explicación que se muestra al corregir (opcional)"
                style={{ marginTop: 8 }}
              />
            </div>
          ))}
          <button type="button" className="a-btn ghost sm" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
            + Agregar pregunta
          </button>
        </>
      )}
    </div>
  );
}
