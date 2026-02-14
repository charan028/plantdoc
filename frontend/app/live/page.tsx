"use client";

import { useState } from "react";
import LiveCamera from "../../components/LiveCamera";
import { type DetectionResponse } from "../../lib/api";
import { useGeminiLive } from "../../hooks/use-gemini-live";
import Waveform from "../../components/Waveform";
import Link from "next/link";

import ShareCard from "../../components/ShareCard";

export default function LivePage() {
    const [latest, setLatest] = useState<DetectionResponse | null>(null);
    const [showShare, setShowShare] = useState(false);

    // Use the custom hook for logic
    const { isConnected, isTalking, connect, disconnect, sendVideoFrame, error } = useGeminiLive();

    function onDetection(result: DetectionResponse) {
        if (result.best_match.confidence < 0.6) return;
        setLatest(result);
    }

    const toggleConnection = () => {
        if (isConnected) {
            disconnect();
        } else {
            connect();
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-[#1e2f2a] text-white overflow-hidden font-sans">
            {/* Header */}
            <header className="flex-none h-16 flex items-center justify-between px-6 bg-[#172521] shadow-md z-10">
                <div className="flex items-center gap-4">
                    <Link href="/" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                        ←
                    </Link>
                    <h1 className="text-lg font-semibold tracking-wide">Pladoc Live</h1>
                </div>
                <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-red-500 animate-pulse" : "bg-white/20"}`} />
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col items-center justify-center p-4 relative">
                <div className="relative w-full max-w-4xl h-full flex flex-col">
                    <LiveCamera
                        active={isConnected}
                        onDetection={onDetection}
                        onFrame={sendVideoFrame}
                    />

                    {/* Floating Detection Pill (Overlay on Video) */}
                    {latest && latest.best_match.species_id !== "not-a-plant" && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                            <div className="flex items-center gap-2">
                                <div className="bg-black/60 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-4 border border-white/10 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex flex-col items-center">
                                        <span className="text-white font-bold text-sm tracking-wide">
                                            {latest.best_match.species_id}
                                        </span>
                                        {latest.care_tip && (
                                            <span className="text-white/80 text-[10px] max-w-[200px] truncate">
                                                {latest.care_tip}
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-8 w-px bg-white/20" />
                                    <span className="text-[#A3E635] text-xs font-bold">
                                        {Math.round(latest.best_match.confidence * 100)}%
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowShare(true)}
                                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-lg border border-white/10 transition-all active:scale-95"
                                >
                                    📤
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Share Card Modal */}
                    {showShare && latest && (
                        <ShareCard
                            plantName={latest.best_match.species_id}
                            confidence={latest.best_match.confidence}
                            careTip={latest.care_tip}
                            // In a real app, we'd capture the current frame. For now, we'll let the card use a placeholder or previous image if available.
                            // Ideally, we'd pass the frame dataUrl here if LiveCamera exposed it.
                            onClose={() => setShowShare(false)}
                        />
                    )}

                    {/* Error Toast */}
                    {error && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg">
                            {error}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer Controls */}
            <footer className="flex-none h-24 bg-[#14201c] flex items-center justify-center px-8 gap-8 relative shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20">
                {/* Waveform / Visualizer Area */}
                <div className="flex-grow flex items-center justify-center h-full max-w-sm mx-4">
                    {isConnected ? (
                        <Waveform active={isTalking} barColor="bg-[#A3E635]" />
                    ) : (
                        <div className="text-white/30 text-xs font-medium tracking-widest uppercase">
                            Connect to Start
                        </div>
                    )}
                </div>

                {/* Mic / End Call Toggle */}
                <button
                    onClick={toggleConnection}
                    className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${isConnected
                        ? "bg-red-500 hover:bg-red-600 rotate-180"
                        : "bg-white hover:bg-gray-200"
                        }`}
                >
                    <span className={`text-2xl ${isConnected ? "text-white" : "text-[#1e2f2a]"}`}>
                        {isConnected ? "📞" : "🎙️"}
                    </span>
                </button>
            </footer>
        </div>
    );
}
