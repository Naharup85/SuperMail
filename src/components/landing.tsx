"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface LandingProps {
  signInAction: () => Promise<void>;
}

export function Landing({ signInAction }: LandingProps) {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInAction();
    } catch {
      window.location.href = "/auth/signin";
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 h-[400px] w-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 flex h-20 items-center justify-between px-6 lg:px-12 border-b border-zinc-800/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="SuperMail Logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain shadow-lg shadow-indigo-500/25"
            priority
          />
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              SuperMail
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-200 shadow-sm transition-all hover:border-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
        >
          {isSigningIn ? "Signing in..." : "Sign In"}
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <span>Unified Gmail & Google Calendar Workspace</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Supercharge your email & calendar in one place.
        </h1>

        <p className="mt-6 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
          SuperMail delivers ultra-fast email browsing, seamless Google Calendar coordination, and multi-tenant Corsair integration built for speed and focus.
        </p>

        {/* CTA Button */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>{isSigningIn ? "Connecting to Google..." : "Continue with Google"}</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </button>
        </div>

        {/* Features preview grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 w-full text-left">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">Gmail Integration</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Read messages, threads, and attachments directly with Corsair tenant routing.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">Calendar Agenda</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Track upcoming meetings and 1-click launch Google Meet calls right from your dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">Secure & Multi-User</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Encrypted OAuth tokens, tenant-isolated data, and NextAuth authentication.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex h-16 items-center justify-center border-t border-zinc-900 px-6 text-xs text-zinc-500">
        SuperMail &copy; {new Date().getFullYear()} &bull; Unified Gmail & Google Calendar Workspace
      </footer>
    </div>
  );
}
