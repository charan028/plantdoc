"use client";

import { useEffect, useRef, useState } from "react";
import { type DetectionResponse } from "../lib/api";

type Props = {
  active: boolean;
  onDetection: (result: DetectionResponse) => void;
  onFrame: (base64Data: string) => void;
};

export default function LiveCamera({ active, onDetection, onFrame }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setPermissionGranted(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Camera permission denied or camera not available.");
      }
    }

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Video Frame Streaming Loop
  useEffect(() => {
    if (!active || !canvasRef.current || !videoRef.current) return;

    const interval = setInterval(() => {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const context = canvas.getContext("2d");

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      // Resize for bandwidth
      const scale = 640 / video.videoWidth;
      canvas.width = 640;
      canvas.height = video.videoHeight * scale;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Data = canvas.toDataURL("image/jpeg", 0.7);

      // Send frame up to parent/hook
      onFrame(base64Data);

    }, 1000); // 1 FPS

    return () => clearInterval(interval);
  }, [active, onFrame]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 text-zinc-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-zinc-900 overflow-hidden rounded-3xl border border-white/5 shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="hidden" // We don't need to show the canvas
      />

      {!permissionGranted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          <p>Waiting for camera...</p>
        </div>
      )}
    </div>
  );
}
