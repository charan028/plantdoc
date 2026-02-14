import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface ShareCardProps {
    plantName: string;
    confidence: number;
    careTip?: string;
    imageSrc?: string; // Optional: Pass captured frame or uploaded image
    onClose: () => void;
}

export default function ShareCard({ plantName, confidence, careTip, imageSrc, onClose }: ShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            // 1. Generate Image from DOM
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                backgroundColor: '#1e2f2a', // Match app theme
                scale: 2, // High res
            });

            // 2. Convert to Blob
            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File([blob], 'pladoc-diagnosis.png', { type: 'image/png' });

                // 3. Web Share API
                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `I found a ${plantName}!`,
                        text: `Check out this ${plantName} I diagnosed with Pladoc. 🌱\n\nCare Tip: ${careTip || "It's beautiful!"}`,
                        files: [file],
                    });
                } else {
                    // Fallback: Download
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = 'pladoc-diagnosis.png';
                    link.click();
                }
                onClose();
            }, 'image/png');
        } catch (e) {
            console.error("Sharing failed:", e);
            alert("Could not share image. Try taking a screenshot!");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="flex flex-col gap-4 w-full max-w-sm">

                {/* The Card (Visible to user + captured by canvas) */}
                <div
                    ref={cardRef}
                    className="bg-gradient-to-br from-[#172521] to-[#0f1f1a] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative"
                >
                    {/* Image Area */}
                    <div className="h-64 w-full bg-black/20 relative group">
                        {imageSrc ? (
                            <img
                                src={imageSrc}
                                alt={plantName}
                                className="w-full h-full object-cover"
                                // CrossOrigin is crucial for html2canvas if image is external
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">🌿</div>
                        )}

                        {/* Overlay Logo */}
                        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 border border-white/5">
                            <span className="text-sm">🌿</span>
                            <span className="text-xs font-bold text-white tracking-wide">Pladoc</span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 text-white text-center">
                        <div className="mb-1 text-[#A3E635] text-xs font-bold tracking-wider uppercase">
                            Analysis Complete
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{plantName}</h2>
                        <div className="flex justify-center mb-4">
                            <div className="bg-white/10 rounded-full px-3 py-1 text-xs text-white/70">
                                {Math.round(confidence * 100)}% Confidence
                            </div>
                        </div>

                        {careTip && (
                            <div className="bg-white/5 rounded-2xl p-4 mb-2">
                                <p className="text-sm text-white/80 italic leading-relaxed">
                                    "{careTip}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-[#14201c] p-3 text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">
                            Diagnosed by AI
                        </p>
                    </div>
                </div>

                {/* Controls (Not captured) */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 py-3 rounded-full bg-[#A3E635] text-[#0f1f1a] font-bold hover:bg-[#8ed32f] transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        {isGenerating ? "Generating..." : "Share Card 📤"}
                    </button>
                </div>
            </div>
        </div>
    );
}
