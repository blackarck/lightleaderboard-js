# lightleaderboard

[![npm version](https://img.shields.io/npm/v/lightleaderboard.svg?style=flat-square)](https://www.npmjs.com/package/lightleaderboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg?style=flat-square)](package.json)

Official JavaScript / TypeScript SDK for **[LightLeaderboard](https://leaderboard.goproso.com)** — lightweight leaderboard-as-a-service for game developers.

Works seamlessly across **Node.js (18+)**, **modern browsers**, **Bun**, **Deno**, and edge runtimes (Cloudflare Workers, Vercel Edge) using native `fetch` and the standard **Web Crypto API**.

---

## Features

- ⚡ **Instant Rank on Submit** — Score submissions return the player's rank, personal-best status, and total player count in a single request.
- 🔒 **Zero-Config HMAC Anti-Cheat** — Optional automatic HMAC-SHA256 score signing using native Web Crypto (`crypto.subtle`).
- 🎯 **Player-Centric Views** — Fetch leaderboards centered around the current player ("You vs. Neighbors").
- ⏱️ **Time & Custom Buckets** — Built-in support for `weekly`, `monthly`, `all-time`, as well as custom `seasonId` and `teamId` filters.
- 👤 **Player Profiles & History** — Store player metadata (name, avatar, country, level) and query run/progression history.
- 🔁 **Idempotent Submissions** — Deduplicate submissions with `submissionId` keys to prevent double-counting on network retries.
- 📦 **Zero External Dependencies** — Lightweight ESM + CJS bundle with complete TypeScript declarations.

---

## Installation

```bash
npm install lightleaderboard
```

```bash
# or using yarn
yarn add lightleaderboard

# or using pnpm
pnpm add lightleaderboard

# or using bun
bun add lightleaderboard
```

---

## Quick Start

```ts
import { LightLeaderboard } from 'lightleaderboard';

const lb = new LightLeaderboard({
  apiKey: 'YOUR_API_KEY', // from the LightLeaderboard dashboard
  gameId: 'YOUR_GAME_ID', // your game reference ID
});

// 1. Submit a score — returns rank and personal best immediately
const submission = await lb.submitScore({
  score: 14250,
  playerRefId: 'player-101',
  playerName: 'Alice',
});

console.log(`Rank #${submission.rank} of ${submission.totalPlayers}! Personal best: ${submission.isPersonalBest}`);
// → "Rank #3 of 1240! Personal best: true"

// 2. Fetch the top 10 players
const { entries } = await lb.getLeaderboard({ limit: 10, period: 'weekly' });
entries.forEach((e) => {
  console.log(`#${e.rank}  ${e.playerName} — ${e.score}`);
});
```

---

## Configuration

### `new LightLeaderboard(config)`

```ts
const lb = new LightLeaderboard({
  apiKey: 'your-api-key',
  gameId: 'your-game-ref-id',
  scoreSecret: 'your-signature-secret', // optional: enables HMAC signing
  baseUrl: 'https://leaderboard.goproso.com', // optional: custom backend URL
});
```

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | **Yes** | Your game's API key generated in the developer portal. |
| `gameId` | `string` | **Yes** | Your game reference ID (e.g. `cosmic-runner`). |
| `scoreSecret` | `string` | No | Optional signature secret for HMAC-SHA256 score verification. |
| `baseUrl` | `string` | No | Custom API base URL (defaults to `https://leaderboard.goproso.com`). |

---

## API Reference

### `submitScore(options)`

Submits a score for a player. Automatically computes their current rank, updates personal bests, and returns leaderboard counts in one roundtrip.

```ts
const result = await lb.submitScore({
  score: 9500,
  playerRefId: 'player-123',
  playerName: 'Alice',
  playTimeMs: 124500,                    // 2m 4.5s
  seasonId: 'season-2',                  // optional season bucket
  teamId: 'team-blue',                   // optional team bucket
  submissionId: crypto.randomUUID(),      // idempotency key
  metadata: { level: 8, character: 'rogue' },
  gameStatTxt1: 'Hard Mode',             // custom text slot 1
  gameStatInt1: 42,                      // custom integer slot 1 (e.g. coins)
});

console.log(result.id);             // DB submission record ID
console.log(result.rank);           // Current rank (e.g. 4)
console.log(result.isPersonalBest); // true if this is player's highest score
console.log(result.totalPlayers);   // Total unique players on leaderboard
console.log(result.deduped);        // true if submissionId was already processed
```

#### Parameters (`SubmitScoreOptions`)

| Field | Type | Required | Description |
|---|---|---|---|
| `score` | `number` | **Yes** | The numeric score to submit. |
| `playerRefId` | `string` | No | Your internal player identifier. Required for rank calculation. |
| `playerName` | `string` | No | Display name to show on the leaderboard. |
| `playTimeMs` | `number` | No | Playtime duration in milliseconds. |
| `seasonId` | `string` | No | Seasonal leaderboard identifier. |
| `teamId` | `string` | No | Team / clan identifier. |
| `submissionId` | `string` | No | Unique client ID to prevent duplicate submissions on retry. |
| `metadata` | `Record<string, unknown>` | No | Custom JSON payload attached to the score entry. |
| `gameStatTxt1` / `2` / `3` | `string` | No | Additional custom string stat slots. |
| `gameStatInt1` / `2` / `3` | `number` | No | Additional custom numeric stat slots. |

---

### `getLeaderboard(options?)`

Fetches leaderboard rankings. By default, returns **one entry per player** (their highest score).

```ts
const { entries, scoreOrder, total, limit, offset } = await lb.getLeaderboard({
  limit: 25,          // 1–100 (default: 20)
  offset: 0,          // pagination offset
  period: 'weekly',   // 'all' | 'weekly' | 'monthly'
  season: 'season-2', // filter by season
  team: 'team-blue',  // filter by team
  allEntries: false,  // true = all submissions, false = best score per player
});

entries.forEach((entry) => {
  console.log(`#${entry.rank} [${entry.playerName}] ${entry.score}`);
});
```

---

### `getPlayerRank(playerRefId, options?)`

Retrieves a player's rank, best score, and **percentile** standing.

```ts
const rankInfo = await lb.getPlayerRank('player-123', {
  period: 'weekly',
  season: 'season-2',
});

console.log(rankInfo.rank);         // e.g. 15
console.log(rankInfo.score);        // e.g. 9500
console.log(rankInfo.totalPlayers);  // e.g. 1500
console.log(rankInfo.percentile);    // e.g. 99.0 (Top 1%)
```

> **Note on Percentiles:** Percentile is scaled from 0 to 100 where higher is better. A percentile of `99.0` means the player ranks above 99% of all participants.

---

### `getCentricLeaderboard(playerRefId, options?)`

Returns a localized slice of the leaderboard centered on the player (e.g. 5 ranks above, the player, and 5 ranks below). Ideal for "You vs. Nearest Competitors" screens.

```ts
const { entries, playerRank } = await lb.getCentricLeaderboard('player-123', {
  limit: 11, // 5 above + player + 5 below
  period: 'all',
});

console.log(`Current player rank: #${playerRank}`);
entries.forEach((e) => {
  const isMe = e.playerRefId === 'player-123' ? ' (YOU)' : '';
  console.log(`#${e.rank} ${e.playerName}: ${e.score}${isMe}`);
});
```

---

### `getPlayer(playerRefId)`

Fetches a player's saved profile data.

```ts
const profile = await lb.getPlayer('player-123');
console.log(profile.playerName, profile.avatarUrl, profile.country, profile.level);
```

---

### `updatePlayer(playerRefId, options)`

Creates or updates a player's profile metadata. Existing omitted fields remain unchanged.

```ts
await lb.updatePlayer('player-123', {
  playerName: 'Alice Wonder',
  avatarUrl: 'https://example.com/avatar.png',
  country: 'US',
  level: 42,
  teamId: 'team-blue',
  device: 'desktop',
});
```

---

### `getPlayerScores(playerRefId, options?)`

Retrieves all individual score submissions recorded for a player, sorted newest first. Useful for run histories, personal statistics, and progression graphs.

```ts
const history = await lb.getPlayerScores('player-123', {
  limit: 20,
  offset: 0,
});

console.log(`Total runs: ${history.total}, Best score: ${history.bestScore}`);
history.entries.forEach((run) => {
  console.log(`${run.createdAt}: ${run.score} (time: ${run.playTimeMs}ms)`);
});
```

---

## Anti-Cheat & Score Signing

When **Require signed scores** is enabled in your game settings on the LightLeaderboard dashboard, score requests must include an HMAC-SHA256 signature.

Pass `scoreSecret` into the constructor and the SDK will automatically sign every score payload:

```ts
const lb = new LightLeaderboard({
  apiKey: 'YOUR_API_KEY',
  gameId: 'YOUR_GAME_ID',
  scoreSecret: 'YOUR_SIGNATURE_SECRET', // from Dashboard -> Security / Secrets
});

// Automatically signed with header 'x-score-signature: sha256=...'
await lb.submitScore({
  score: 12500,
  playerRefId: 'player-123',
});
```

Signing relies on the standardized **Web Crypto API** (`globalThis.crypto.subtle`), available in all modern browsers, Node.js 18+, Bun, Deno, and Edge Workers.

---

## Error Handling

All failed API requests throw an instance of `LightLeaderboardError`:

```ts
import { LightLeaderboard, LightLeaderboardError } from 'lightleaderboard';

try {
  await lb.submitScore({ score: 9500 });
} catch (error) {
  if (error instanceof LightLeaderboardError) {
    console.error(`API Error: ${error.message} (HTTP ${error.status})`);

    if (error.isAuthError) {
      console.error('Invalid API Key or Game ID.');
    } else if (error.isRateLimitError) {
      console.warn('Rate limit exceeded. Please back off.');
    } else if (error.isBillingError) {
      console.warn('Game account limit or plan quota reached.');
    } else if (error.isValidationError) {
      console.error('Payload validation failed:', error.response);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## TypeScript Support

This SDK is written in TypeScript and exports all request, response, and entity types:

```ts
import type {
  LightLeaderboardConfig,
  SubmitScoreOptions,
  SubmitScoreResult,
  GetLeaderboardOptions,
  GetLeaderboardResult,
  LeaderboardEntry,
  GetRankOptions,
  PlayerRankResult,
  GetCentricOptions,
  CentricLeaderboardResult,
  PlayerProfile,
  UpdatePlayerOptions,
  GetPlayerScoresOptions,
  GetPlayerScoresResult,
  PlayerScoreEntry,
} from 'lightleaderboard';
```

---

## License

[MIT](LICENSE) © [LightLeaderboard](https://leaderboard.goproso.com)
