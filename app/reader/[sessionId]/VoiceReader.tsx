"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

interface VoiceOption {
  id: string;
  name: string;
  category: string;
}

interface VoiceReaderProps {
  chunkText: string;
}

export function VoiceReader({ chunkText }: VoiceReaderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const hasAudio = Boolean(audioUrl);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const formattedTime = useMemo(() => {
    const current = formatTime(currentTime);
    const total = formatTime(duration);
    return `${current} / ${total}`;
  }, [currentTime, duration]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingVoices(true);
      try {
        const res = await fetch("/api/voice/voices");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { voices?: VoiceOption[] };
        if (cancelled) return;
        const fetchedVoices = Array.isArray(data.voices) ? data.voices : [];
        setVoices(fetchedVoices);
        if (fetchedVoices.some((voice) => voice.id === DEFAULT_VOICE_ID)) {
          setSelectedVoice(DEFAULT_VOICE_ID);
        } else if (fetchedVoices[0]) {
          setSelectedVoice(fetchedVoices[0].id);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load voices right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  function abortInFlightGeneration() {
    if (generateAbortRef.current) {
      generateAbortRef.current.abort();
      generateAbortRef.current = null;
    }
    setIsGenerating(false);
  }

  function resetPlayerState() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleVoiceChange(nextVoiceId: string) {
    setSelectedVoice(nextVoiceId);
    abortInFlightGeneration();
    resetPlayerState();
    setError(null);
  }

  async function handleGenerateAudio() {
    abortInFlightGeneration();
    resetPlayerState();
    setError(null);
    setIsGenerating(true);
    const controller = new AbortController();
    generateAbortRef.current = controller;

    try {
      const res = await fetch("/api/voice/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chunkText,
          voiceId: selectedVoice,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const blob = await res.blob();
      if (!blob.size) {
        throw new Error("No audio returned");
      }

      const nextUrl = URL.createObjectURL(blob);
      setAudioUrl(nextUrl);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setError("Could not generate audio for this section. Please try again.");
    } finally {
      if (generateAbortRef.current === controller) {
        generateAbortRef.current = null;
        setIsGenerating(false);
      }
    }
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function handleSeek(percent: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (percent / 100) * audio.duration;
    setCurrentTime(audio.currentTime);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={handleGenerateAudio}
            disabled={isGenerating}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? "Generating audio..." : "🔊 Listen to this section"}
          </button>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>Voice</span>
            <select
              value={selectedVoice}
              onChange={(event) => handleVoiceChange(event.target.value)}
              className="cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {voices.length === 0 ? (
                <option value={DEFAULT_VOICE_ID}>
                  {isLoadingVoices ? "Loading voices..." : "Default voice"}
                </option>
              ) : (
                voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.category})
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {hasAudio && (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <audio
              ref={audioRef}
              src={audioUrl ?? undefined}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayback}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <div className="flex flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={progressPercent}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-indigo-600"
                />
                <span className="w-24 text-right text-xs text-slate-500">{formattedTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Speed</span>
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackRate(speed)}
                  className={`rounded-full px-2.5 py-1 transition-colors ${
                    playbackRate === speed
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
