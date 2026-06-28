import type { AssessmentQuestion } from "@/lib/baseline-assessment/content";

interface QuestionStepProps {
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  answers: number[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
}

/** Renders one section (comprehension / vocabulary / inference) of MCQs. */
export function QuestionStep({ title, description, questions, answers, onAnswer }: QuestionStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <ol className="flex flex-col gap-6">
        {questions.map((question, questionIndex) => (
          <li key={question.id} className="flex flex-col gap-3">
            <p className="font-medium text-slate-900">
              {questionIndex + 1}. {question.prompt}
            </p>
            <div role="radiogroup" aria-label={question.prompt} className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => {
                const inputId = `${question.id}-${optionIndex}`;
                const checked = answers[questionIndex] === optionIndex;
                return (
                  <label
                    key={inputId}
                    htmlFor={inputId}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                      checked
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={question.id}
                      checked={checked}
                      onChange={() => onAnswer(questionIndex, optionIndex)}
                      className="sr-only"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
