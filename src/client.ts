import { LightLeaderboardError } from './error.js';
import type {
  LightLeaderboardConfig,
  SubmitScoreOptions,
  SubmitScoreResult,
  GetLeaderboardOptions,
  GetLeaderboardResult,
  GetRankOptions,
  PlayerRankResult,
  GetCentricOptions,
  CentricLeaderboardResult,
  PlayerProfile,
  UpdatePlayerOptions,
  GetPlayerScoresOptions,
  GetPlayerScoresResult,
} from './types.js';

const DEFAULT_BASE_URL = 'https://leaderboard.goproso.com';

async function hmacSha256(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildUrl(base: string, path: string, params?: object): string {
  const url = `${base}${path}`;
  if (!params) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}

export class LightLeaderboard {
  private readonly apiKey: string;
  private readonly gameId: string;
  private readonly baseUrl: string;
  private readonly scoreSecret?: string;

  constructor(config: LightLeaderboardConfig) {
    if (!config.apiKey) throw new Error('LightLeaderboard: apiKey is required');
    if (!config.gameId) throw new Error('LightLeaderboard: gameId is required');
    this.apiKey = config.apiKey;
    this.gameId = config.gameId;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.scoreSecret = config.scoreSecret;
  }

  private gameUrl(path: string, params?: object): string {
    return buildUrl(this.baseUrl, `/api/v1/games/${encodeURIComponent(this.gameId)}${path}`, params);
  }

  private async fetch<T>(
    method: string,
    url: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    const res = await globalThis.fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new LightLeaderboardError(`HTTP ${res.status}: failed to parse response`, res.status, null);
    }

    if (!res.ok || data?.ok === false) {
      throw new LightLeaderboardError(
        data?.error ?? `HTTP ${res.status}`,
        res.status,
        data
      );
    }

    return data as T;
  }

  // ─── Score submission ───────────────────────────────────────────────────────

  /**
   * Submit a score to the leaderboard.
   *
   * Returns the player's new rank immediately — no second API call needed.
   *
   * @example
   * const result = await lb.submitScore({ score: 9500, playerRefId: 'p1', playerName: 'Alice' });
   * console.log(`Rank #${result.rank} of ${result.totalPlayers}`);
   */
  async submitScore(options: SubmitScoreOptions): Promise<SubmitScoreResult> {
    const url = this.gameUrl('/scores');
    const bodyStr = JSON.stringify(options);
    const extraHeaders: Record<string, string> = {};

    if (this.scoreSecret) {
      const sig = await hmacSha256(this.scoreSecret, bodyStr);
      extraHeaders['x-score-signature'] = `sha256=${sig}`;
    }

    const res = await globalThis.fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: bodyStr,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new LightLeaderboardError(`HTTP ${res.status}: failed to parse response`, res.status, null);
    }

    if (!res.ok || data?.ok === false) {
      throw new LightLeaderboardError(data?.error ?? `HTTP ${res.status}`, res.status, data);
    }

    return {
      id: data.id,
      rank: data.rank ?? null,
      isPersonalBest: data.isPersonalBest ?? false,
      totalPlayers: data.totalPlayers ?? null,
      deduped: data.deduped,
    };
  }

  // ─── Leaderboard ───────────────────────────────────────────────────────────

  /**
   * Fetch the leaderboard. Returns one entry per player (their best score) by default.
   *
   * @example
   * const { entries } = await lb.getLeaderboard({ limit: 10, period: 'weekly' });
   * entries.forEach(e => console.log(`#${e.rank} ${e.playerName}: ${e.score}`));
   */
  async getLeaderboard(options?: GetLeaderboardOptions): Promise<GetLeaderboardResult> {
    const { allEntries, ...rest } = options ?? {};
    const data = await this.fetch<any>(
      'GET',
      this.gameUrl('/leaderboard', {
        ...rest,
        allEntries: allEntries ? 'true' : undefined,
      })
    );
    return {
      entries: data.entries,
      scoreOrder: data.scoreOrder,
      period: data.period,
      season: data.season ?? null,
      team: data.team ?? null,
      limit: data.limit,
      offset: data.offset,
    };
  }

  // ─── Rank ───────────────────────────────────────────────────────────────────

  /**
   * Get a player's current rank, score, and percentile.
   *
   * @example
   * const { rank, percentile } = await lb.getPlayerRank('player-123');
   * console.log(`Rank #${rank} — top ${(100 - percentile).toFixed(1)}%`);
   */
  async getPlayerRank(playerRefId: string, options?: GetRankOptions): Promise<PlayerRankResult> {
    return this.fetch<PlayerRankResult>(
      'GET',
      this.gameUrl(`/players/${encodeURIComponent(playerRefId)}/rank`, options)
    );
  }

  // ─── Centric leaderboard ───────────────────────────────────────────────────

  /**
   * Fetch the leaderboard centered on a specific player, showing the players
   * immediately above and below them.
   *
   * @example
   * const { entries, playerRank } = await lb.getCentricLeaderboard('player-123', { limit: 11 });
   */
  async getCentricLeaderboard(
    playerRefId: string,
    options?: GetCentricOptions
  ): Promise<CentricLeaderboardResult> {
    const data = await this.fetch<any>(
      'GET',
      this.gameUrl(`/players/${encodeURIComponent(playerRefId)}/centric`, options)
    );
    return {
      entries: data.entries,
      playerRank: data.playerRank ?? null,
      period: data.period,
      season: data.season ?? null,
      team: data.team ?? null,
      scoreOrder: data.scoreOrder,
    };
  }

  // ─── Player profile ─────────────────────────────────────────────────────────

  /**
   * Fetch a player's profile (name, avatar, country, level, etc.).
   */
  async getPlayer(playerRefId: string): Promise<PlayerProfile> {
    const data = await this.fetch<any>(
      'GET',
      this.gameUrl(`/players/${encodeURIComponent(playerRefId)}`)
    );
    return data.player as PlayerProfile;
  }

  /**
   * Create or update a player's profile. Fields are merged — omitted fields
   * keep their existing values.
   *
   * @example
   * await lb.updatePlayer('player-123', { playerName: 'Alice', country: 'US', level: 5 });
   */
  async updatePlayer(playerRefId: string, options: UpdatePlayerOptions): Promise<void> {
    await this.fetch<any>(
      'PUT',
      this.gameUrl(`/players/${encodeURIComponent(playerRefId)}`),
      options
    );
  }

  // ─── Score history ──────────────────────────────────────────────────────────

  /**
   * Fetch all submissions a player has ever made, ordered newest first.
   * Useful for progression charts and run history screens.
   *
   * @example
   * const { entries, bestScore, total } = await lb.getPlayerScores('player-123');
   */
  async getPlayerScores(
    playerRefId: string,
    options?: GetPlayerScoresOptions
  ): Promise<GetPlayerScoresResult> {
    return this.fetch<GetPlayerScoresResult>(
      'GET',
      this.gameUrl(`/players/${encodeURIComponent(playerRefId)}/scores`, options)
    );
  }
}
