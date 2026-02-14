"use client";

import { useState } from "react";
import { detectPlant, type DetectionResponse } from "../lib/api";

type Props = {
  onDetection: (result: DetectionResponse) => void;
};

export default function PlantScanner({ onDetection }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onFileChange(file?: File) {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const result = await detectPlant(file);
      onDetection(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-green-100 bg-white/80 p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Plant Scanner</h2>
      <p className="mt-1 text-sm text-slate-600">Upload a plant image to identify species and get care tips.</p>
      <label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-green-300 bg-green-50 p-4 text-center text-sm hover:bg-green-100">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />
        {loading ? "Scanning image..." : "Choose plant image"}
      </label>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
