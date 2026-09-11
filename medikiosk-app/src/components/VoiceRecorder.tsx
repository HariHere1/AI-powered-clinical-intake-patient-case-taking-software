"use client";

import { useRef, useState } from "react";

export function VoiceRecorder({
  onRecorded,
  disabled,
  label,
}: {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
  label: string;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      onRecorded(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={recording ? stop : start}
      className={`rounded-full px-6 py-3 text-white disabled:opacity-50 ${
        recording ? "bg-red-600" : "bg-slate-900"
      }`}
    >
      {recording ? "● Stop" : label}
    </button>
  );
}
