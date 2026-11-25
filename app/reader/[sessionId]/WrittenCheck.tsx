"use client";
import { useEffect, useState } from "react";
import { gradingSchema, overallScore, questions, type WrittenResult } from "@/lib/written-check/schema";

export function WrittenCheck({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [answers, setAnswers] = useState(["", "", ""]);
  const [result, setResult] = useState<WrittenResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/written-check?sessionId=${encodeURIComponent(sessionId)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load answers.");
        if (!active) return;
        if (data.saved) {
          setAnswers(data.saved.answers);
          setSaved(true);
          const parsed = gradingSchema.safeParse(data.saved.result);
          if (parsed.success) setResult(parsed.data);
        }
      }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionId]);
  async function submit() {
    if (busy) return;
    setBusy(true); setError(null); setResult(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 115000);
    try {
      const response = await fetch("/api/written-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, answers }), signal: controller.signal });
      const data = await response.json();
      if (data.saved) setSaved(true);
      if (!response.ok) throw new Error(data.error || "Submission failed. Keep your answers here and retry.");
      setResult(gradingSchema.parse(data.result));
    } catch (e) {
      setError(e instanceof Error && e.name !== "AbortError" ? e.message : "The response took too long. Your answers may already be saved. Retry to check; the same submission will not be counted twice.");
    } finally { clearTimeout(timer); setBusy(false); }
  }
  const score = result ? overallScore(result) : null;
  return <div role="dialog" aria-modal="true" aria-labelledby="written-title" className="fixed inset-0 z-[90] overflow-y-auto bg-white p-6">
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4"><h2 id="written-title" className="text-xl font-semibold">Written comprehension check</h2><button disabled={busy} onClick={() => { if (saved || answers.every(a => !a) || window.confirm("Your latest edits have not been saved. Close anyway?")) onClose(); }} className="rounded border px-3 py-2 disabled:opacity-50">Close</button></div>
      <p className="text-sm text-slate-600">Trial · Explain your understanding in your own words. Short answers and bullet points are welcome. Spelling, grammar, and writing style are not part of the grading criteria.</p>
      <p className="text-sm text-slate-600">These experimental grades do not change your Progress score while we evaluate grading quality. AI feedback can be mistaken.</p>
      {loading ? <p>Loading saved answers…</p> : questions.map((question, index) => <div key={question.prompt} className="space-y-2">
        <label htmlFor={`answer-${index}`} className="block font-medium">{index + 1}. {question.prompt}</label>
        <textarea id={`answer-${index}`} value={answers[index]} disabled={busy} maxLength={4000} rows={4} className="w-full rounded-lg border p-3" onChange={event => { setAnswers(previous => previous.map((answer, i) => i === index ? event.target.value : answer)); setSaved(false); setResult(null); }} />
        {result && <div className="rounded-lg bg-indigo-50 p-3"><p className="font-medium">{result.results[index].needsClarification ? "Clarification needed — revise your answer" : `${result.results[index].score}/100`}</p><p>{result.results[index].feedback}</p></div>}
      </div>)}
      {result && <p className="font-semibold" role="status">{score === null ? "No overall grade yet. Clarify the answer above and resubmit." : `Trial comprehension grade: ${score}%`}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {saved && <p className="text-sm text-slate-600">Your submitted answers are saved.</p>}
      <button disabled={loading || busy || answers.some(a => !a.trim())} onClick={submit} className="rounded-lg bg-indigo-700 px-5 py-3 text-white disabled:opacity-50">{busy ? "Saving and reviewing your answers…" : result ? "Check saved result" : "Submit for feedback"}</button>
    </div>
  </div>;
}
