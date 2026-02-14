"use client";

import { useEffect, useRef, useState } from "react";
import { createChatSession, getChatHistory, submitChatMessage, uploadChatImage } from "../lib/api";
import Link from "next/link";

type Message = {
    id: string;
    role: "user" | "model";
    content: string;
    image_url?: string;
    timestamp?: string;
};

export default function ChatInterface() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize session on mount
    useEffect(() => {
        const initSession = async () => {
            // In a real app, load from local storage or list sessions
            // For now, create a new one or use fixed one for demo
            const savedId = localStorage.getItem("plant_chat_session");
            if (savedId) {
                setSessionId(savedId);
                const history = await getChatHistory(savedId);
                setMessages(history);
            } else {
                const newSession = await createChatSession("demo-user", "My Plant Chat");
                setSessionId(newSession.id);
                localStorage.setItem("plant_chat_session", newSession.id);
            }
        };
        initSession();
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedImage) || !sessionId || isLoading) return;

        setIsLoading(true);
        try {
            let imageUrl: string | undefined = undefined;

            // 1. Upload image if present
            if (selectedImage) {
                const uploadRes = await uploadChatImage(selectedImage);
                imageUrl = uploadRes.image_url;
            }

            // 2. Optimistic Update
            const tempMsg: Message = {
                id: Date.now().toString(),
                role: "user",
                content: inputText,
                image_url: imageUrl || (previewUrl as string),
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMsg]);
            setInputText("");
            setSelectedImage(null);
            setPreviewUrl(null);

            // 3. Submit to backend
            const response = await submitChatMessage(sessionId, tempMsg.content, "user", imageUrl);

            // 4. Add model response
            const modelMsg: Message = {
                id: Date.now().toString() + "_AI",
                role: "model",
                content: response.answer,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, modelMsg]);

        } catch (e) {
            console.error(e);
            alert("Failed to send message");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#1e2f2a] text-white">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 bg-[#172521] shadow-md z-10">
                <div className="flex items-center gap-4">
                    <Link href="/" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                        ←
                    </Link>
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <span>💬</span> Pladoc Chat
                    </h1>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/20" ref={scrollRef}>
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {messages.length === 0 && (
                        <div className="text-center text-white/30 mt-20 p-8 rounded-2xl bg-white/5 border border-white/5">
                            <span className="text-4xl block mb-4">🌿</span>
                            <p className="text-lg font-medium">Start your plant consultation</p>
                            <p className="text-sm mt-2">Upload a photo or describe your plant's symptoms.</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${msg.role === "user"
                                ? "bg-[#A3E635] text-[#0f1f1a]"
                                : "bg-white/10 text-white"
                                }`}>
                                {msg.image_url && (
                                    <img
                                        src={msg.image_url.startsWith("http") ? msg.image_url : `http://localhost:8000${msg.image_url}`}
                                        alt="User upload"
                                        className="w-full h-auto rounded-lg mb-3 border border-black/10 max-h-[400px] object-cover"
                                    />
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                            <span className="text-xs text-white/30 mt-1 px-2">
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                            </span>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start">
                            <div className="bg-white/10 rounded-2xl p-4 text-white/50 text-sm animate-pulse flex items-center gap-2">
                                <span className="animate-bounce">●</span>
                                <span className="animate-bounce delay-100">●</span>
                                <span className="animate-bounce delay-200">●</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#172521] border-t border-white/5">
                <div className="max-w-3xl mx-auto w-full">
                    {previewUrl && (
                        <div className="mb-4 relative inline-block animate-in fade-in slide-in-from-bottom-2">
                            <img src={previewUrl} alt="Preview" className="h-24 w-24 object-cover rounded-xl border border-white/20 shadow-lg" />
                            <button
                                onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="flex items-end gap-3">
                        <label className="cursor-pointer h-12 w-12 flex-none rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors text-xl">
                            📷
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageSelect}
                            />
                        </label>

                        <div className="flex-grow relative">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ask about your plant..."
                                className="w-full bg-[#0f1f1a] text-white placeholder-white/30 rounded-2xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-[#A3E635]/50 resize-none h-12 min-h-[48px] max-h-40 scrollbar-hide text-base shadow-inner"
                                style={{ lineHeight: '1.5rem' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={(!inputText.trim() && !selectedImage) || isLoading}
                            className="h-12 w-12 flex-none rounded-full bg-[#A3E635] hover:bg-[#8ed32f] disabled:opacity-50 disabled:hover:bg-[#A3E635] flex items-center justify-center text-[#0f1f1a] transition-colors shadow-lg"
                        >
                            <span className="text-xl ml-0.5">➤</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
