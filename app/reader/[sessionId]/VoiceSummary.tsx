"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceSummaryProps {
  onUseSummary: (summaryText: string) => Promise<void> | void;
  disabled?: boolean;
}

const TIMER_INTERVAL_MS = 1000;

export function VoiceSummary({ onUseSummary, disabled = false }: VoiceSummaryProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      stopMediaTracks();
      mediaRecorderRef.current = null;
    };
  }, []);

  function startTimer() {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, TIMER_INTERVAL_MS);
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopMediaTracks() {
    if (!mediaStreamRef.current) return;
    for (const track of mediaStreamRef.current.getTracks()) {
      track.stop();
    }
    mediaStreamRef.current = null;
  }

  function resolveMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return preferred.find((type) => MediaRecorder.isTypeSupported(type));
  }

  async function startRecording() {
    setError(null);
    setTranscribedText("");
    setElapsedSeconds(0);
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = resolveMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopTimer();
        stopMediaTracks();

        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (recordedBlob.size === 0) {
          setError("No audio was captured. Please try again.");
          return;
        }
        void transcribeAudio(recordedBlob);
      };

      recorder.start();
      setIsRecording(true);
      startTimer();
    } catch {
      setError("Microphone access was denied. Please allow microphone and try again.");
      stopMediaTracks();
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  }

  async function transcribeAudio(audioBlob: Blob) {
    setIsTranscribing(true);
    setError(null);

    try {
      const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
      const audioFile = new File([audioBlob], `summary.${extension}`, {
        type: audioBlob.type || "audio/webm",
      });

      const body = new FormData();
      body.append("audio", audioFile);

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      setTranscribedText(data.text.trim());
    } catch {
      setError("Couldn't transcribe your recording. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleUseSummary() {
    const summary = transcribedText.trim();
    if (!summary) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onUseSummary(summary);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRecordAgain() {
    stopTimer();
    stopMediaTracks();
    setIsRecording(false);
    setElapsedSeconds(0);
    setTranscribedText("");
    setError(null);
    chunksRef.current = [];
  }

  function handleUseSummaryButtonClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void handleUseSummary();
  }

  // Keep the action gate local to this component to avoid parent transition
  // state accidentally leaving the voice submit CTA disabled.
  const isActionDisabled = isTranscribing || isSubmitting;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || isActionDisabled}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🎤 Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Stop recording
            </button>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 text-sm font-medium text-rose-600">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
              <span>Recording {formatTimer(elapsedSeconds)}</span>
            </div>
          )}

          {isTranscribing && <p className="text-sm text-slate-500">Transcribing your summary…</p>}
        </div>

        {transcribedText && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transcribed summary</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{transcribedText}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUseSummaryButtonClick}
                disabled={isActionDisabled}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Use this summary"}
              </button>
              <button
                type="button"
                onClick={handleRecordAgain}
                disabled={isActionDisabled}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Record again
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
