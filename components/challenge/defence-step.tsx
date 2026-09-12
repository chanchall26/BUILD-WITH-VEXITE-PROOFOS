"use client";

import { useEffect, useRef, useState } from "react";
import type { ChallengeSpec, DefenceAnswer } from "@/lib/domain";

interface Question {
  question: string;
  probes: string;
  weakAnswerLooksLike: string;
}

/**
 * The spoken defence.
 *
 * This is what replaces webcam proctoring. Gemini reads the candidate's own
 * submission and asks about decisions visible in it, which is a question you
 * cannot delegate, paste, or send someone else to answer.
 *
 * Typing is always offered on equal terms. A broken microphone must never cost
 * anyone a job, and the assessment is of what is said rather than how it sounds.
 */
export function DefenceStep({
  challenge,
  work,
  onDone,
}: {
  challenge: ChallengeSpec;
  work: string;
  onDone: (answers: DefenceAnswer[]) => void;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DefenceAnswer[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [working, setWorking] = useState(false);
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [notice, setNotice] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/defence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challenge, work }),
        });
        const data = await res.json();
        if (cancelled) return;
        setQuestions(data.questions ?? []);
        if (data.audio) setAudioUrl(`data:audio/wav;base64,${data.audio}`);
      } catch {
        if (!cancelled) setQuestions([]);
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
    // Questions are written once, from the work exactly as submitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = questions?.[index];

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mr.start();
      recorder.current = mr;
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timer.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAt.current) / 1000);
        setElapsed(secs);
        if (secs >= 75) void stopRecording();
      }, 250);
    } catch {
      setMode("text");
      setNotice(
        "No microphone available, so type your answer instead. It is assessed in exactly the same way.",
      );
    }
  }

  async function stopRecording() {
    const mr = recorder.current;
    if (!mr || mr.state === "inactive") return;
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    setWorking(true);

    const finished = new Promise<Blob>((resolve) => {
      mr.addEventListener(
        "stop",
        () => resolve(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })),
        { once: true },
      );
    });
    mr.stop();
    const blob = await finished;
    const durationMs = Date.now() - startedAt.current;

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: await blobToBase64(blob),
          mimeType: blob.type || "audio/webm",
        }),
      });
      const data = (await res.json()) as { transcript?: string; empty?: boolean };
      if (!data.transcript || data.empty) {
        setNotice("Nothing intelligible came through. Record it again, or type it.");
        setWorking(false);
        return;
      }
      commit({
        question: current?.question ?? "",
        transcript: data.transcript,
        durationMs,
        typed: false,
      });
    } catch {
      setNotice("Transcription failed. Type your answer instead.");
      setMode("text");
    }
    setWorking(false);
  }

  function commit(answer: DefenceAnswer) {
    const next = [...answers, answer];
    setAnswers(next);
    setTyped("");
    setNotice(null);
    if (questions && index + 1 < questions.length) setIndex(index + 1);
    else onDone(next);
  }

  if (!questions) {
    return (
      <div className="panel p-10 text-center">
        <p className="thinking text-[15px]">
          Gemini is reading what you built and writing your questions…
        </p>
        <p className="mt-2 text-[13px] text-dim">
          They come from your submission, so they are different for everyone.
        </p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[15px]">No questions could be generated.</p>
        <button className="btn btn-ghost mt-4" onClick={() => onDone(answers)}>
          Continue to the passport
        </button>
      </div>
    );
  }

  return (
    <div className="panel-raised p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="eyebrow">
          Spoken defence · {index + 1} of {questions.length}
        </span>
        {audioUrl && (
          <audio controls src={audioUrl} className="ml-auto h-8" aria-label="Hear the question">
            Your browser cannot play audio.
          </audio>
        )}
      </div>

      <p className="mt-4 text-[19px] leading-snug tracking-[-0.015em]">{current.question}</p>
      <p className="mt-3 text-[13px] leading-relaxed text-dim">
        About forty-five seconds, the way you would say it to a colleague. The recording is
        transcribed and then discarded. Nothing about your voice is measured.
      </p>

      {notice && (
        <p className="mt-4 rounded-lg border border-caution/30 bg-caution/5 px-3.5 py-2.5 text-[13px] text-caution">
          {notice}
        </p>
      )}

      {mode === "voice" ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!recording ? (
            <button
              className="btn btn-primary"
              onClick={() => void startRecording()}
              disabled={working}
            >
              {working ? "Transcribing…" : "Record answer"}
            </button>
          ) : (
            <button
              className="btn btn-ghost border-alert/50 text-alert"
              onClick={() => void stopRecording()}
            >
              <span className="live-dot mr-1 inline-block h-2 w-2 rounded-full bg-alert" />
              Stop · {elapsed}s
            </button>
          )}
          <button className="btn btn-quiet" onClick={() => setMode("text")} disabled={recording}>
            Type it instead
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={5}
            placeholder="Write what you would have said."
            aria-label="Typed answer"
            className="field resize-none text-[14px]"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="btn btn-primary"
              disabled={typed.trim().length < 20}
              onClick={() =>
                commit({
                  question: current.question,
                  transcript: typed.trim(),
                  durationMs: 0,
                  typed: true,
                })
              }
            >
              Submit answer
            </button>
            <button className="btn btn-quiet" onClick={() => setMode("voice")}>
              Record instead
            </button>
          </div>
        </div>
      )}

      {answers.length > 0 && (
        <p className="mt-6 border-t border-edge-soft pt-4 text-[12.5px] text-dim">
          Answered {answers.length} of {questions.length}.
        </p>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
