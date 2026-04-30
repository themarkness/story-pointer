export interface PlayerState {
  id: string;
  name: string;
  vote: string | null;
}

export interface SessionState {
  code: string;
  host: string;
  players: PlayerState[];
  revealed: boolean;
}
