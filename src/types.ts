// ─── Config ──────────────────────────────────────────────────────────────────

export interface LightLeaderboardConfig {
  /** Your game's API key from the LightLeaderboard dashboard */
  apiKey: string;
  /** Your game's reference ID from the dashboard */
  gameId: string;
  /** Override the API base URL (defaults to https://leaderboard.goproso.com) */
  baseUrl?: string;
  /**
   * Optional secret key to auto-sign score submissions (HMAC-SHA256).
   * Set this if you enabled "Require signed scores" on your game.
   * Uses the Web Crypto API — requires Node 18+ or a modern browser.
   */
  scoreSecret?: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: number;
  /** 1-based position on the leaderboard */
  rank: number;
  playerRefId: string | null;
  playerName: string | null;
  score: number;
  playTimeMs: number | null;
  seasonId: string | null;
  teamId: string | null;
  /** Arbitrary metadata attached at submission time */
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface GetLeaderboardOptions {
  /** Number of entries to return (1–100, default 20) */
  limit?: number;
  /** Pagination offset (default 0) */
  offset?: number;
  /** Time window filter (default "all") */
  period?: 'all' | 'weekly' | 'monthly';
  /** Only return entries for this season ID */
  season?: string;
  /** Only return entries for this team ID */
  team?: string;
  /**
   * Return every raw submission instead of best-per-player.
   * Default is false — one entry per player (their personal best).
   */
  allEntries?: boolean;
}

export interface GetLeaderboardResult {
  entries: LeaderboardEntry[];
  scoreOrder: 'asc' | 'desc';
  period: string;
  season: string | null;
  team: string | null;
  limit: number;
  offset: number;
}

// ─── Score submission ─────────────────────────────────────────────────────────

export interface SubmitScoreOptions {
  /** The numeric score to record */
  score: number;
  /** Your game's internal player identifier */
  playerRefId?: string;
  /** Display name shown on the leaderboard */
  playerName?: string;
  /** Duration of this run in milliseconds */
  playTimeMs?: number;
  /** Season bucket for seasonal leaderboards */
  seasonId?: string;
  /** Team bucket for team leaderboards */
  teamId?: string;
  /**
   * Idempotency key — submitting the same ID twice returns the first
   * entry without creating a duplicate.
   */
  submissionId?: string;
  /** Arbitrary JSON metadata to attach to this submission */
  metadata?: Record<string, unknown>;
  /** Custom text stat slot 1 */
  gameStatTxt1?: string;
  /** Custom text stat slot 2 */
  gameStatTxt2?: string;
  /** Custom text stat slot 3 */
  gameStatTxt3?: string;
  /** Custom numeric stat slot 1 */
  gameStatInt1?: number;
  /** Custom numeric stat slot 2 */
  gameStatInt2?: number;
  /** Custom numeric stat slot 3 */
  gameStatInt3?: number;
}

export interface SubmitScoreResult {
  /** Database ID of the created entry */
  id: number;
  /**
   * Player's current global rank immediately after submission.
   * null when no playerRefId was provided.
   */
  rank: number | null;
  /** true if this score beats the player's previous personal best */
  isPersonalBest: boolean;
  /** Total unique players on this leaderboard */
  totalPlayers: number | null;
  /** true when this submissionId already existed (idempotent replay) */
  deduped?: boolean;
}

// ─── Rank ─────────────────────────────────────────────────────────────────────

export interface GetRankOptions {
  period?: 'all' | 'weekly' | 'monthly';
  season?: string;
  team?: string;
}

export interface PlayerRankResult {
  playerRefId: string;
  playerName: string | null;
  /** 1-based rank. null when the player has no entries in this filter. */
  rank: number | null;
  score: number | null;
  totalPlayers: number | null;
  /**
   * How far from the bottom the player is, 0–100.
   * Higher is better: 97.6 = top 2.4 %.
   * null when the player has no entries.
   */
  percentile: number | null;
  period: string;
  season: string | null;
  team: string | null;
  scoreOrder: 'asc' | 'desc';
}

// ─── Centric leaderboard ──────────────────────────────────────────────────────

export interface GetCentricOptions {
  /** Entries to return centered around the player (default 10) */
  limit?: number;
  period?: 'all' | 'weekly' | 'monthly';
  season?: string;
  team?: string;
}

export interface CentricLeaderboardResult {
  entries: LeaderboardEntry[];
  /** The target player's rank within the current filter */
  playerRank: number | null;
  period: string;
  season: string | null;
  team: string | null;
  scoreOrder: 'asc' | 'desc';
}

// ─── Player profile ───────────────────────────────────────────────────────────

export interface PlayerProfile {
  playerName: string | null;
  avatarUrl: string | null;
  teamId: string | null;
  level: number | null;
  country: string | null;
  device: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePlayerOptions {
  playerName?: string;
  avatarUrl?: string;
  teamId?: string;
  level?: number;
  /** ISO 3166-1 alpha-2 country code, e.g. "US" */
  country?: string;
  device?: string;
}

// ─── Score history ────────────────────────────────────────────────────────────

export interface PlayerScoreEntry {
  id: number;
  score: number;
  playTimeMs: number | null;
  seasonId: string | null;
  teamId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  gameStatTxt1: string | null;
  gameStatTxt2: string | null;
  gameStatTxt3: string | null;
  gameStatInt1: number | null;
  gameStatInt2: number | null;
  gameStatInt3: number | null;
}

export interface GetPlayerScoresOptions {
  /** Max entries to return (1–200, default 50) */
  limit?: number;
  offset?: number;
  season?: string;
  team?: string;
}

export interface GetPlayerScoresResult {
  playerRefId: string;
  entries: PlayerScoreEntry[];
  /** Player's all-time best score */
  bestScore: number | null;
  /** Total number of submissions matching the filter */
  total: number;
  limit: number;
  offset: number;
  scoreOrder: 'asc' | 'desc';
}
