"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioPlayer, AudioRecorder } from "../lib/audio-streamer";

export type GeminiLiveState = {
    isConnected: boolean;
    isTalking: boolean;
    connect: () => void;
    disconnect: () => void;
    sendVideoFrame: (base64Data: string) => void;
    error: string;
};

export function useGeminiLive(): GeminiLiveState {
    const [isConnected, setIsConnected] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [error, setError] = useState("");

    const websocketRef = useRef<WebSocket | null>(null);
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const audioPlayerRef = useRef<AudioPlayer | null>(null);

    const connect = useCallback(() => {
        if (websocketRef.current) return;

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
            const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
            const wsBase = baseUrl.replace(/^http(s)?:\/\//, ""); // Remove protocol
            const wsUrl = `${wsProtocol}://${wsBase}/ws/live`;

            const ws = new WebSocket(wsUrl);
            websocketRef.current = ws;

            ws.onopen = async () => {
                console.log("Connected to Gemini Live API");
                setIsConnected(true);
                setError("");

                // Start Audio Output
                audioPlayerRef.current = new AudioPlayer();

                // Start Audio Input
                audioRecorderRef.current = new AudioRecorder((base64Data) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "audio", data: base64Data }));
                    }
                });
                await audioRecorderRef.current.start();
            };

            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "audio") {
                    setIsTalking(true);
                    audioPlayerRef.current?.play(message.data);
                    setTimeout(() => setIsTalking(false), 500);
                }
            };

            ws.onclose = (ev) => {
                console.log("Disconnected from Gemini Live API", ev.code, ev.reason);
                setIsConnected(false);
                cleanup();
            };

            ws.onerror = (e) => {
                console.error("WebSocket error:", e);
                setError("Connection failed");
                setIsConnected(false);
            };
        } catch (e) {
            setError("Failed to create connection");
        }
    }, []);

    const disconnect = useCallback(() => {
        if (websocketRef.current) {
            websocketRef.current.close();
        }
        // Cleanup happens in onclose
    }, []);

    const cleanup = useCallback(() => {
        if (audioRecorderRef.current) {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
        }
        audioPlayerRef.current = null;
        websocketRef.current = null;
        setIsConnected(false);
    }, []);

    const sendVideoFrame = useCallback((base64Data: string) => {
        const ws = websocketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "video", data: base64Data }));
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
            cleanup();
        };
    }, []);

    return {
        isConnected,
        isTalking,
        connect,
        disconnect,
        sendVideoFrame,
        error
    };
}
