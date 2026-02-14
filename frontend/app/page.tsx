"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#1e2f2a] text-white font-sans overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#A3E635] rounded-full filter blur-[120px] opacity-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#174d41] rounded-full filter blur-[100px] opacity-20 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

      {/* Header */}
      <header className="flex-none h-20 flex items-center justify-between px-8 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/5">
            <span className="text-xl">🌿</span>
          </div>
          <h1 className="text-xl font-semibold tracking-wide">Pladoc</h1>
        </div>
        <div className="text-sm text-white/50 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          v1.2 Beta
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">

          {/* Live Diagnosis Card */}
          <Link href="/live" className="group relative">
            <div
              className={`relative h-[400px] bg-gradient-to-br from-[#172521] to-[#0f1f1a] rounded-[32px] p-8 border border-white/10 transition-all duration-500 overflow-hidden ${hoveredCard === 'live' ? 'scale-[1.02] shadow-2xl border-[#A3E635]/30' : 'hover:border-white/20'}`}
              onMouseEnter={() => setHoveredCard('live')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-700 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f1a] via-[#0f1f1a]/50 to-transparent"></div>

              <div className="relative h-full flex flex-col justify-end z-10">
                <div className="mb-auto mt-4">
                  <div className="h-14 w-14 rounded-2xl bg-[#A3E635] flex items-center justify-center text-black text-2xl mb-6 shadow-lg group-hover:rotate-12 transition-transform duration-500">
                    📹
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-3 group-hover:text-[#A3E635] transition-colors">Live Diagnosis</h2>
                <p className="text-white/60 leading-relaxed mb-6">
                  Real-time plant identification and health analysis using your camera and voice. Simply point and ask.
                </p>

                <div className="flex items-center gap-2 text-sm font-medium text-[#A3E635]">
                  <span>Start Camera</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Expert Chat Card */}
          <Link href="/chat" className="group relative">
            <div
              className={`relative h-[400px] bg-gradient-to-br from-[#172521] to-[#0f1f1a] rounded-[32px] p-8 border border-white/10 transition-all duration-500 overflow-hidden ${hoveredCard === 'chat' ? 'scale-[1.02] shadow-2xl border-blue-400/30' : 'hover:border-white/20'}`}
              onMouseEnter={() => setHoveredCard('chat')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1463320898484-cdee8141c787?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-700 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f1a] via-[#0f1f1a]/50 to-transparent"></div>

              <div className="relative h-full flex flex-col justify-end z-10">
                <div className="mb-auto mt-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl mb-6 shadow-lg group-hover:-rotate-12 transition-transform duration-500">
                    💬
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-3 group-hover:text-blue-400 transition-colors">Expert Chat</h2>
                <p className="text-white/60 leading-relaxed mb-6">
                  Upload photos and have a detailed conversation with our AI botanist. Perfect for complex diagnosis.
                </p>

                <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                  <span>Start Chat</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none h-16 flex items-center justify-center text-white/20 text-sm">
        <p>Made by Charan</p>
      </footer>
    </div>
  );
}
