"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { saveTutorMessage } from "../socratic-actions";

const MAX_QUESTIONS = 5;

interface Message {
  role: "user" | "tutor";
  content: string;
}

interface SocraticTutorProps {
  sessionId: string;
  documentTitle: string;
  documentText: string;
  onClose: () => void;
}

/**
 * Socratic Tutor (Phase 3) — full-screen overlay that activates when the user
 * finishes reading all chunks.
 *
 * Asks exactly MAX_QUESTIONS (5) questions. After the user answers Q5 the
 * input is locked and Claude sends a closing encouragement. When that stream
 * finishes a completion card appears at the bottom of the conversation so the
 * user can scroll back through everything before leaving. Nothing closes
 * automatically — only "Back to reader" or "End session" exits the overlay.
 */
export function SocraticTutor({ sessionId, documentTitle, documentText, onClose }: SocraticTutorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Number of TUTOR messages committed to history (questions 1–5, then closing = 6). */
  const [questionCount, setQuestionCount] = useState(0);
  /** True after the user submits their 5th answer — locks the input. */
  const [inputLocked, setInputLocked] = useState(false);

  // Derived: show the completion card once the closing message has finished
  // streaming. No timer — it appears naturally when the stream ends.
  const isSessionDone = inputLocked && !isStreaming && questionCount > MAX_QUESTIONS;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Fire the first question on mount.
  useEffect(() => {
    askNextQuestion([], false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Calls Claude and streams the next question (or closing message).
   * @param history  Full conversation history to send.
   * @param isClosing  True when this response is the closing encouragement
   *                   (after user answered Q5). Triggers the 3-second
   *                   completion delay once streaming finishes.
   */
  async function askNextQuestion(history: Message[], isClosing: boolean) {
    setIsStreaming(true);
    setStreamingText("");
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let fullResponse = "";

    try {
      const response = await fetch("/api/tutor/socratic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          conversationHistory: history,
          documentText,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        setStreamingText(fullResponse);
      }

      const tutorMessage: Message = { role: "tutor", content: fullResponse };
      setMessages((prev) => [...prev, tutorMessage]);
      setStreamingText("");
      setQuestionCount((prev) => prev + 1);

      saveTutorMessage(sessionId, "TUTOR", fullResponse).catch(() => {});
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The tutor is unavailable right now. Please try again.");
      setStreamingText("");
    } finally {
      setIsStreaming(false);
      if (!isClosing) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }

  function handleSubmit() {
    const answer = userInput.trim();
    if (!answer || isStreaming || inputLocked) return;

    const userMessage: Message = { role: "user", content: answer };
    const updatedHistory = [...messages, userMessage];

    setMessages(updatedHistory);
    setUserInput("");

    saveTutorMessage(sessionId, "USER", answer).catch(() => {});

    // Count how many user answers exist after this submission.
    const userAnswerCount = updatedHistory.filter((m) => m.role === "user").length;
    const isLastAnswer = userAnswerCount >= MAX_QUESTIONS;

    if (isLastAnswer) {
      // Lock the input immediately so no further answers can be submitted.
      setInputLocked(true);
    }

    askNextQuestion(updatedHistory, isLastAnswer);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    onClose();
  }

  // ── Question counter display ──────────────────────────────────────────────
  // Show "Question N of 5" in the header. While a new question is streaming
  // (and input isn't locked yet), preview the upcoming number.
  const displayedQuestionNum = Math.min(
    questionCount + (isStreaming && !inputLocked ? 1 : 0),
    MAX_QUESTIONS,
  );
  const showCounter = !isSessionDone && questionCount <= MAX_QUESTIONS;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <span className="text-sm text-indigo-600">✦</span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Socratic Tutor</p>
            <h1 className="text-sm font-semibold leading-tight text-slate-900">{documentTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showCounter && displayedQuestionNum > 0 && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              Question {displayedQuestionNum} of {MAX_QUESTIONS}
            </span>
          )}
          <button
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            End session
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div className="self-center rounded-full bg-slate-100 px-4 py-1.5 text-xs text-slate-500">
            You finished reading. Now let&apos;s think deeper.
          </div>

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {isStreaming && streamingText.length > 0 && (
            <div className="flex gap-3">
              <TutorAvatar />
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-indigo-50 px-4 py-3 text-sm text-slate-800">
                <MarkdownContent text={streamingText} />
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-500" />
              </div>
            </div>
          )}

          {isStreaming && streamingText.length === 0 && (
            <div className="flex gap-3">
              <TutorAvatar />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-indigo-50 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {error && <p className="self-center text-sm text-red-500">{error}</p>}

          {/* Completion card — appears inline after Claude's closing message
              so the user can scroll back through the full conversation. */}
          {isSessionDone && (
            <div className="mx-auto flex w-full flex-col items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <span className="text-2xl">★</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-slate-900">Socratic session complete</p>
                <p className="text-sm text-slate-500">{MAX_QUESTIONS} questions explored</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Back to reader
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-end gap-3">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || inputLocked}
            placeholder={
              inputLocked
                ? "Session closing…"
                : "Type your answer… (Enter to send, Shift+Enter for new line)"
            }
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim() || isStreaming || inputLocked}
            className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Send
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-slate-400">
          {inputLocked ? "Wrapping up your session…" : "The tutor only asks questions — answers come from you."}
        </p>
      </div>
    </div>
  );
}

function TutorAvatar() {
  return (
    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
      <span className="text-xs text-indigo-600">✦</span>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "tutor") {
    return (
      <div className="flex gap-3">
        <TutorAvatar />
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-indigo-50 px-4 py-3 text-sm text-slate-800">
          <MarkdownContent text={message.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-3 text-sm text-white">
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1.5 leading-relaxed last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
