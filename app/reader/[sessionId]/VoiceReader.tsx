"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const BROWSER_VOICE_PREFIX = "browser:";
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

interface VoiceOption {
  id: string;
  name: string;
  category: string;
}

interface VoiceReaderProps {
  chunkText: string;
}

function isBrowserVoiceId(id: string): boolean {
  return id.startsWith(BROWSER_VOICE_PREFIX);
}

function loadBrowserVoices(): VoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().map((voice) => ({
    id: `${BROWSER_VOICE_PREFIX}${voice.voiceURI}`,
    name: voice.name,
    category: voice.lang || "browser",
  }));
}

export function VoiceReader({ chunkText }: VoiceReaderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const useBrowserTtsRef = useRef(false);

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [useBrowserTts, setUseBrowserTts] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const hasAudio = Boolean(audioUrl);
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const formattedTime = useMemo(() => {
    const current = formatTime(currentTime);
    const total = formatTime(duration);
    return `${current} / ${total}`;
  }, [currentTime, duration]);

  function enableBrowserVoices() {
    const browserVoices = loadBrowserVoices();
    useBrowserTtsRef.current = true;
    setUseBrowserTts(true);
    setVoices(browserVoices);
    if (browserVoices[0]) {
      setSelectedVoice((prev) =>
        browserVoices.some((v) => v.id === prev) ? prev : browserVoices[0]!.id,
      );
    }
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingVoices(true);
      try {
        const res = await fetch("/api/voice/voices");
        const data = (await res.json()) as { voices?: VoiceOption[]; error?: string };
        if (cancelled) return;

        if (!res.ok) {
          // Preview often lacks ELEVENLABS_API_KEY — fall back to free browser TTS.
          enableBrowserVoices();
          return;
        }

        const fetchedVoices = Array.isArray(data.voices) ? data.voices : [];
        if (fetchedVoices.length === 0) {
          enableBrowserVoices();
          return;
        }

        useBrowserTtsRef.current = false;
        setUseBrowserTts(false);
        setVoices(fetchedVoices);
        if (fetchedVoices.some((voice) => voice.id === DEFAULT_VOICE_ID)) {
          setSelectedVoice(DEFAULT_VOICE_ID);
        } else if (fetchedVoices[0]) {
          setSelectedVoice(fetchedVoices[0].id);
        }
      } catch {
        if (!cancelled) {
          enableBrowserVoices();
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false);
        }
      }
    })();

    // Chrome loads browser voices asynchronously.
    const onVoicesChanged = () => {
      if (!cancelled && useBrowserTtsRef.current) {
        enableBrowserVoices();
      }
    };
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
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

  function stopBrowserSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsPlaying(false);
  }

  function resetPlayerState() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    stopBrowserSpeech();
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

  function speakWithBrowser() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      throw new Error("This browser doesn't support free speech playback.");
    }

    stopBrowserSpeech();
    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.rate = playbackRate;

    const voiceUri = selectedVoice.startsWith(BROWSER_VOICE_PREFIX)
      ? selectedVoice.slice(BROWSER_VOICE_PREFIX.length)
      : "";
    const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceUri);
    if (match) utterance.voice = match;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
      setError("Browser speech failed. Try another voice or enable ElevenLabs on Preview.");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  async function handleGenerateAudio() {
    abortInFlightGeneration();
    resetPlayerState();
    setError(null);

    if (useBrowserTts || isBrowserVoiceId(selectedVoice)) {
      try {
        speakWithBrowser();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not play audio.");
      }
      return;
    }

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
        const data = (await res.json()) as { error?: string };
        // If ElevenLabs isn't configured, drop to free browser TTS instead of failing hard.
        if (data.error?.includes("ELEVENLABS_API_KEY") || res.status === 502) {
          enableBrowserVoices();
          speakWithBrowser();
          return;
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
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
      // Last resort: free browser voice.
      try {
        enableBrowserVoices();
        speakWithBrowser();
      } catch {
        setError(
          error instanceof Error
            ? error.message
            : "Could not generate audio for this section. Please try again.",
        );
      }
    } finally {
      if (generateAbortRef.current === controller) {
        generateAbortRef.current = null;
        setIsGenerating(false);
      }
    }
  }

  function togglePlayback() {
    if (useBrowserTts || isBrowserVoiceId(selectedVoice)) {
      if (isPlaying) {
        stopBrowserSpeech();
      } else {
        speakWithBrowser();
      }
      return;
    }

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
            {isGenerating
              ? "Generating audio..."
              : useBrowserTts
                ? isPlaying
                  ? "⏹ Stop"
                  : "🔊 Listen to this section"
                : "🔊 Listen to this section"}
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

        {useBrowserTts && (
          <p className="text-xs text-slate-500">
            Using free browser voice — enable <code className="text-[11px]">ELEVENLABS_API_KEY</code> for
            Preview in Vercel for premium voices.
          </p>
        )}

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

        {useBrowserTts && !hasAudio && (
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
