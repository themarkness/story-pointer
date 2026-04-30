export interface PlayerState {
  id: string;
  name: string;
  vote: string | null;
  spectator: boolean;
}

export interface SessionState {
  code: string;
  host: string;
  players: PlayerState[];
  revealed: boolean;
}
