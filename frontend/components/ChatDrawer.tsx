"use client";

import { useEffect, useRef, useState } from "react";
import { createChatSession, getChatHistory, submitChatMessage, uploadChatImage } from "../lib/api";

type Message = {
    id: string;
    role: "user" | "model";
    content: string;
    image_url?: string;
    timestamp?: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ChatDrawer({ isOpen, onClose }: Props) {
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
        if (isOpen) {
            initSession();
        }
    }, [isOpen]);

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
        <div
            className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-[#172521] shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 bg-[#0f1f1a] border-b border-white/10">
                <h2 className="text-white font-semibold flex items-center gap-2">
                    <span>💬</span> Plant Chat
                </h2>
                <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                >
                    ✕
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-white/30 mt-10 p-4">
                        <p>No messages yet.</p>
                        <p className="text-sm">Upload a photo or ask a question!</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === "user"
                            ? "bg-[#A3E635] text-[#0f1f1a]"
                            : "bg-white/10 text-white"
                            }`}>
                            {msg.image_url && (
                                <img
                                    src={msg.image_url.startsWith("http") ? msg.image_url : `http://localhost:8000${msg.image_url}`}
                                    alt="User upload"
                                    className="w-full h-auto rounded-lg mb-2 border border-black/10"
                                />
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-white/30 mt-1 px-1">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                        </span>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-start">
                        <div className="bg-white/10 rounded-2xl p-3 text-white/50 text-sm animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#0f1f1a] border-t border-white/10">
                {previewUrl && (
                    <div className="mb-2 relative inline-block">
                        <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                        <button
                            onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <label className="cursor-pointer h-10 w-10 flex-none rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
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
                            className="w-full bg-[#1e2f2a] text-white placeholder-white/30 rounded-2xl py-2 px-4 focus:outline-none focus:ring-1 focus:ring-[#A3E635] resize-none h-10 min-h-[40px] max-h-32 scrollbar-hide text-sm"
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
                        className="h-10 w-10 flex-none rounded-full bg-[#A3E635] hover:bg-[#8ed32f] disabled:opacity-50 disabled:hover:bg-[#A3E635] flex items-center justify-center text-[#0f1f1a] transition-colors"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}
