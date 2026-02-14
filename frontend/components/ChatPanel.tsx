"use client";

import { FormEvent, useState } from "react";
import { askPlantAssistant, detectPlant } from "../lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

function toPlainText(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

type Props = {
  scanContext?: string;
};

export default function ChatPanel({ scanContext }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localScanContext, setLocalScanContext] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Ask me anything about watering, light, or plant health." }
  ]);
  const activeContext = localScanContext || scanContext || "";

  async function onImageUpload(file?: File) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const result = await detectPlant(file);
      if (result.best_match.species_id === "not-a-plant") {
        setLocalScanContext("");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "I detected a person/non-plant image. Please upload a clear photo of the plant."
          }
        ]);
        return;
      }
      const context = `Detected species: ${result.best_match.species_id}
Confidence: ${Math.round(result.best_match.confidence * 100)}%
Care tip: ${result.care_tip}`;
      setLocalScanContext(context);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Image analyzed. I will use ${result.best_match.species_id} context in this chat.`
        }
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Image analysis failed. Please try another image." }]);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);
    try {
      const response = await askPlantAssistant(message, activeContext);
      setMessages((prev) => [...prev, { role: "assistant", text: toPlainText(response.answer) }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Assistant is temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-green-100 bg-white/80 p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Care Chat</h2>
      {activeContext ? (
        <p className="mt-1 text-xs text-slate-600">Using latest scan context for responses.</p>
      ) : (
        <p className="mt-1 text-xs text-slate-600">Upload a plant image to enrich chat responses.</p>
      )}
      <div className="mt-3 h-64 space-y-2 overflow-y-auto rounded-lg border border-green-100 bg-white p-3">
        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={
                m.role === "user"
                  ? "inline-block rounded-xl bg-green-600 px-3 py-2 text-sm text-white"
                  : "inline-block rounded-xl bg-green-100 px-3 py-2 text-sm text-green-900"
              }
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <label className="cursor-pointer rounded-lg border border-green-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-green-50">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImageUpload(e.target.files?.[0])}
            disabled={uploading || loading}
          />
          {uploading ? "Analyzing..." : "Upload image"}
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why are my leaves turning yellow?"
          className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm outline-none ring-green-500 focus:ring"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
