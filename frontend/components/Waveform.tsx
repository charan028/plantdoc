"use client";

import { useEffect, useState } from "react";

type Props = {
    active: boolean;
    barColor?: string;
};

export default function Waveform({ active, barColor = "bg-white" }: Props) {
    const [bars, setBars] = useState<number[]>(new Array(20).fill(10));

    useEffect(() => {
        if (!active) {
            setBars(new Array(20).fill(10)); // Reset to flat
            return;
        }

        const interval = setInterval(() => {
            setBars(prev => prev.map(() => Math.random() * 40 + 10)); // Random height 10-50px
        }, 100);

        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="flex items-center gap-1 h-12">
            {bars.map((height, i) => (
                <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-100 ${barColor}`}
                    style={{ height: `${height}%` }}
                />
            ))}
        </div>
    );
}
