"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import type { SessionState } from "@/lib/types";

const FIBONACCI = ["1", "2", "3", "5", "8", "13", "21", "?"];

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get("name") || "";
  const isNew = code === "new";

  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const [myVote, setMyVote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!name) { router.push("/"); return; }

    const socket = getSocket();

    socket.on("session-update", (state: SessionState) => {
      setSession((prev) => {
        if (prev?.revealed && !state.revealed) setMyVote(null);
        return state;
      });
    });

    socket.on("disconnect", () => setDisconnected(true));
    socket.on("connect", () => {
      setDisconnected(false);
      // rejoin on reconnect
      if (!isNew && code !== "new") {
        socket.emit("join-session", code, name, (ok: boolean) => {
          if (!ok) setError("Session expired");
        });
      }
    });

    if (isNew) {
      socket.emit("create-session", name, (newCode: string) => {
        window.history.replaceState(null, "", `/session/${newCode}?name=${encodeURIComponent(name)}`);
      });
    } else {
      socket.emit("join-session", code, name, (ok: boolean) => {
        if (!ok) setError("Session not found");
      });
    }

    return () => {
      socket.off("session-update");
      socket.off("disconnect");
      socket.off("connect");
    };
  }, [code, name, isNew, router]);

  const copyCode = useCallback(() => {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center bg-slate-800 rounded-xl p-8 max-w-sm w-full">
          <p className="text-5xl mb-4">😕</p>
          <h1 className="text-2xl font-bold mb-2">{error}</h1>
          <p className="text-slate-400 mb-6 text-sm">The session may have ended or the code is incorrect.</p>
          <button onClick={() => router.push("/")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors cursor-pointer">
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          Connecting...
        </div>
      </main>
    );
  }

  const socket = getSocket();
  const isHost = session.host === socket.id;
  const allVoted = session.players.every((p) => p.vote);
  const numericVotes = session.revealed
    ? session.players.map((p) => parseFloat(p.vote ?? "")).filter((n) => !isNaN(n))
    : [];
  const avg = numericVotes.length
    ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
    : null;

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Disconnect banner */}
      {disconnected && (
        <div className="bg-red-600/20 border border-red-500 text-red-300 text-sm rounded-lg px-4 py-2 mb-4 text-center">
          Connection lost — reconnecting...
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">🃏 Story Pointer</h1>
          <button
            onClick={copyCode}
            className="text-slate-400 text-sm hover:text-white transition-colors cursor-pointer flex items-center gap-1 mt-0.5"
          >
            Session: <span className="font-mono text-white">{session.code}</span>
            <span className="text-xs">{copied ? " ✓ Copied!" : " 📋"}</span>
          </button>
        </div>
        <div className="text-right text-xs sm:text-sm text-slate-400">
          <p>{session.players.length} player{session.players.length !== 1 && "s"}</p>
          <p>{isHost ? "You are the host" : `Host: ${session.players.find((p) => p.id === session.host)?.name}`}</p>
        </div>
      </header>

      {/* Host controls */}
      {isHost && (
        <section className="mb-6 flex justify-center">
          {!session.revealed ? (
            <button
              onClick={() => socket.emit("reveal", session.code)}
              disabled={!allVoted}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors cursor-pointer ${
                allVoted
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              {allVoted ? "Reveal Votes" : "Waiting for votes..."}
            </button>
          ) : (
            <button
              onClick={() => socket.emit("new-round", session.code)}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              New Round
            </button>
          )}
        </section>
      )}

      {/* Results summary */}
      {session.revealed && (
        <section className="mb-6 bg-slate-800 rounded-xl p-6 flex justify-center gap-12">
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Average</p>
            <p className="text-3xl font-bold">{avg ?? "—"}</p>
          </div>
          {numericVotes.length > 0 && (
            <>
              <div className="text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Min</p>
                <p className="text-3xl font-bold">{Math.min(...numericVotes)}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Max</p>
                <p className="text-3xl font-bold">{Math.max(...numericVotes)}</p>
              </div>
            </>
          )}
        </section>
      )}

      {/* Players */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Players</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {session.players.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl p-4 text-center transition-all ${
                session.revealed && p.vote
                  ? "bg-indigo-600/20 border border-indigo-500"
                  : p.vote
                  ? "bg-slate-700 border border-slate-600"
                  : "bg-slate-800 border border-slate-700"
              }`}
            >
              <p className="font-medium truncate text-sm">
                {p.name}
                {p.id === socket.id && <span className="text-indigo-400"> (you)</span>}
              </p>
              {session.revealed ? (
                <p className={`mt-2 ${p.vote ? "text-3xl font-bold text-white" : "text-slate-500 text-sm"}`}>
                  {p.vote ?? "—"}
                </p>
              ) : (
                <p className="text-xs mt-2 text-slate-400">
                  {p.vote ? "✅ Voted" : "⏳ Waiting"}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Voting cards */}
      <section className="mt-auto pt-4 border-t border-slate-800">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 text-center">
          {session.revealed ? "Votes revealed — waiting for new round" : "Pick your estimate"}
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
          {FIBONACCI.map((v) => (
            <button
              key={v}
              onClick={() => {
                setMyVote(v);
                socket.emit("vote", session.code, v);
              }}
              disabled={session.revealed}
              className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl text-lg sm:text-xl font-bold border-2 transition-all ${
                session.revealed
                  ? "opacity-40 cursor-not-allowed bg-slate-800 border-slate-700"
                  : myVote === v
                  ? "bg-indigo-600 border-indigo-400 scale-110 cursor-pointer"
                  : "bg-slate-800 border-slate-600 hover:border-indigo-400 hover:scale-105 cursor-pointer"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
