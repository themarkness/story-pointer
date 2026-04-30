"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import type { SessionState } from "@/lib/types";

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get("name") || "";
  const isNew = code === "new";

  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const [myVote, setMyVote] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      router.push("/");
      return;
    }

    const socket = getSocket();

    socket.on("session-update", (state: SessionState) => {
      setSession((prev) => {
        if (prev?.revealed && !state.revealed) setMyVote(null);
        return state;
      });
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
    };
  }, [code, name, isNew, router]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session not found</h1>
          <button onClick={() => router.push("/")} className="text-indigo-400 hover:underline cursor-pointer">
            Back to home
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">Connecting...</p>
      </main>
    );
  }

  const socket = getSocket();
  const me = session.players.find((p) => p.id === socket.id);
  const isHost = session.host === socket.id;

  return (
    <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">🃏 Story Pointer</h1>
          <p className="text-slate-400 text-sm">
            Session: <span className="font-mono text-white">{session.code}</span>
          </p>
        </div>
        <div className="text-right text-sm text-slate-400">
          {session.players.length} player{session.players.length !== 1 && "s"} •{" "}
          {isHost ? "You are the host" : `Host: ${session.players.find((p) => p.id === session.host)?.name}`}
        </div>
      </header>

      {/* Players */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Players</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {session.players.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg p-4 text-center ${
                p.vote ? "bg-indigo-600/20 border border-indigo-500" : "bg-slate-800 border border-slate-700"
              }`}
            >
              <p className="font-medium truncate">{p.name}{p.id === socket.id && " (you)"}</p>
              <p className={`text-sm mt-1 ${session.revealed && p.vote && p.vote !== "?" ? "text-2xl font-bold text-white mt-2" : "text-slate-400"}`}>
                {session.revealed
                  ? p.vote ?? "No vote"
                  : p.vote
                  ? "✅ Voted"
                  : "⏳ Waiting"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Results summary */}
      {session.revealed && (() => {
        const numericVotes = session.players
          .map((p) => parseFloat(p.vote ?? ""))
          .filter((n) => !isNaN(n));
        const avg = numericVotes.length
          ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
          : null;
        return (
          <section className="mb-8 bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm mb-1">Average</p>
            <p className="text-4xl font-bold">{avg ?? "—"}</p>
          </section>
        );
      })()}

      {/* Host controls */}
      {isHost && (
        <section className="mb-8 flex justify-center gap-4">
          {!session.revealed ? (
            <button
              onClick={() => socket.emit("reveal", session.code)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Reveal Votes
            </button>
          ) : (
            <button
              onClick={() => socket.emit("new-round", session.code)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              New Round
            </button>
          )}
        </section>
      )}

      {/* Voting cards */}
      <section className="mt-auto">
        <h2 className="text-lg font-semibold mb-4">Your Vote</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {["1", "2", "3", "5", "8", "13", "21", "?"].map((v) => (
            <button
              key={v}
              onClick={() => {
                setMyVote(v);
                socket.emit("vote", session.code, v);
              }}
              className={`w-16 h-24 rounded-xl text-xl font-bold border-2 transition-all cursor-pointer ${
                myVote === v
                  ? "bg-indigo-600 border-indigo-400 scale-110"
                  : "bg-slate-800 border-slate-600 hover:border-indigo-400 hover:scale-105"
              } ${session.revealed ? "opacity-50 pointer-events-none" : ""}`}
            >
              {v}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
