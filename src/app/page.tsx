"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [spectator, setSpectator] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    router.push(`/session/new?name=${encodeURIComponent(name.trim())}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    router.push(`/session/${joinCode.trim()}?name=${encodeURIComponent(name.trim())}${spectator ? "&spectator=1" : ""}`);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const btnClass =
    "w-full py-3 rounded-lg font-semibold transition-colors cursor-pointer";

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2">🃏 Story Pointer</h1>
        <p className="text-slate-400 text-center mb-8">Planning poker for agile teams</p>

        <div className="flex mb-6 bg-slate-800 rounded-lg p-1">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                tab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "create" ? "Create Session" : "Join Session"}
            </button>
          ))}
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <form onSubmit={tab === "create" ? handleCreate : handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
            {tab === "join" && (
              <input
                type="text"
                placeholder="Session code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className={inputClass}
                maxLength={6}
                required
              />
            )}
            {tab === "join" && (
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spectator}
                  onChange={(e) => setSpectator(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                Join as spectator (view only)
              </label>
            )}
            <button
              type="submit"
              className={`${btnClass} ${
                tab === "create"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {tab === "create" ? "Create Session" : "Join Session"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
