// Evaluaciones por clase. La definición (con respuestas) solo vive en el servidor;
// al alumno se le envía la versión pública sin las opciones correctas.

export type QuizQuestion = { text: string; options: string[]; correct: number[]; explanation?: string };
export type Quiz = { passScore: number; questions: QuizQuestion[] };
export type PublicQuiz = { passScore: number; questions: { text: string; options: string[]; multiple: boolean }[] };
export type QuizResult = {
  score: number;
  passed: boolean;
  passScore: number;
  results: { correct: boolean; correctOptions: number[]; explanation?: string }[];
};

/** Valida y normaliza una evaluación. Devuelve null si no hay evaluación o el JSON es inválido. */
export function parseQuiz(raw: string | null | undefined): Quiz | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Quiz>;
    const questions = (data.questions ?? [])
      .map((q) => ({
        text: String(q?.text ?? "").trim().slice(0, 500),
        options: (Array.isArray(q?.options) ? q.options : []).map((o) => String(o ?? "").trim().slice(0, 300)).filter(Boolean).slice(0, 8),
        correct: (Array.isArray(q?.correct) ? q.correct : []).map(Number).filter((n) => Number.isInteger(n)),
        explanation: q?.explanation ? String(q.explanation).trim().slice(0, 800) : undefined,
      }))
      .map((q) => ({ ...q, correct: [...new Set(q.correct.filter((n) => n >= 0 && n < q.options.length))].sort((a, b) => a - b) }))
      .filter((q) => q.text && q.options.length >= 2 && q.correct.length >= 1)
      .slice(0, 50);
    if (!questions.length) return null;
    const passScore = Math.min(100, Math.max(1, Math.round(Number(data.passScore) || 70)));
    return { passScore, questions };
  } catch {
    return null;
  }
}

/** Errores de validación legibles para el admin (vacío si está todo bien). */
export function quizErrors(raw: string): string | null {
  let data: Partial<Quiz>;
  try {
    data = JSON.parse(raw);
  } catch {
    return "La evaluación tiene un formato inválido.";
  }
  const qs = data.questions ?? [];
  if (!qs.length) return "Agregá al menos una pregunta a la evaluación.";
  for (const [i, q] of qs.entries()) {
    const n = i + 1;
    if (!String(q?.text ?? "").trim()) return `La pregunta ${n} no tiene enunciado.`;
    const opts = (q?.options ?? []).filter((o) => String(o ?? "").trim());
    if (opts.length < 2) return `La pregunta ${n} necesita al menos 2 opciones.`;
    if (!(q?.correct ?? []).length) return `Marcá la respuesta correcta de la pregunta ${n}.`;
  }
  return null;
}

export function publicQuiz(quiz: Quiz): PublicQuiz {
  return {
    passScore: quiz.passScore,
    questions: quiz.questions.map((q) => ({ text: q.text, options: q.options, multiple: q.correct.length > 1 })),
  };
}

/** Corrige: una pregunta es correcta si se marcaron exactamente las opciones correctas. */
export function gradeQuiz(quiz: Quiz, answers: number[][]): QuizResult {
  const results = quiz.questions.map((q, i) => {
    const given = [...new Set((answers[i] ?? []).map(Number))].sort((a, b) => a - b);
    const correct = given.length === q.correct.length && given.every((v, k) => v === q.correct[k]);
    return { correct, correctOptions: q.correct, explanation: q.explanation };
  });
  const ok = results.filter((r) => r.correct).length;
  const score = Math.round((ok / quiz.questions.length) * 100);
  return { score, passed: score >= quiz.passScore, passScore: quiz.passScore, results };
}
