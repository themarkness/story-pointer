import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

interface Player {
  id: string;
  name: string;
  vote: string | null;
}

interface Session {
  code: string;
  host: string;
  players: Map<string, Player>;
  revealed: boolean;
}

const sessions = new Map<string, Session>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return sessions.has(code) ? generateCode() : code;
}

function sessionState(session: Session) {
  const players = Array.from(session.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    vote: session.revealed ? p.vote : p.vote ? "hidden" : null,
  }));
  return { code: session.code, host: session.host, players, revealed: session.revealed };
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: "/api/socketio" });

  io.on("connection", (socket) => {
    socket.on("create-session", (name: string, cb: (code: string) => void) => {
      const code = generateCode();
      const session: Session = {
        code,
        host: socket.id,
        players: new Map([[socket.id, { id: socket.id, name, vote: null }]]),
        revealed: false,
      };
      sessions.set(code, session);
      socket.join(code);
      cb(code);
      io.to(code).emit("session-update", sessionState(session));
    });

    socket.on("join-session", (code: string, name: string, cb: (ok: boolean) => void) => {
      const session = sessions.get(code);
      if (!session) return cb(false);
      session.players.set(socket.id, { id: socket.id, name, vote: null });
      socket.join(code);
      cb(true);
      io.to(code).emit("session-update", sessionState(session));
    });

    socket.on("vote", (code: string, vote: string) => {
      const session = sessions.get(code);
      const player = session?.players.get(socket.id);
      if (!player || session!.revealed) return;
      player.vote = vote;
      io.to(code).emit("session-update", sessionState(session!));
    });

    socket.on("reveal", (code: string) => {
      const session = sessions.get(code);
      if (!session || socket.id !== session.host) return;
      session.revealed = true;
      io.to(code).emit("session-update", sessionState(session));
    });

    socket.on("new-round", (code: string) => {
      const session = sessions.get(code);
      if (!session || socket.id !== session.host) return;
      session.revealed = false;
      session.players.forEach((p) => (p.vote = null));
      io.to(code).emit("session-update", sessionState(session));
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        const session = sessions.get(room);
        if (!session) continue;
        session.players.delete(socket.id);
        if (session.players.size === 0) {
          // keep session alive for 5 min so players can rejoin
          setTimeout(() => {
            const s = sessions.get(room);
            if (s && s.players.size === 0) sessions.delete(room);
          }, 5 * 60 * 1000);
        } else {
          if (session.host === socket.id) {
            session.host = session.players.keys().next().value!;
          }
          io.to(room).emit("session-update", sessionState(session));
        }
      }
    });
  });

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
