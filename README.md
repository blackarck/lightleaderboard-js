# LightLeaderboard — Godot 4 SDK

[![Godot Engine](https://img.shields.io/badge/Godot-4.0%2B-478cbf?logo=godotengine&logoColor=white&style=flat-square)](https://godotengine.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Asset Library](https://img.shields.io/badge/Godot%20AssetLib-LightLeaderboard-green?style=flat-square)](https://godotengine.org/asset-library)

Official Godot 4 addon for **[LightLeaderboard](https://leaderboard.goproso.com)** — fast, lightweight leaderboard-as-a-service for indie game developers and studios.

---

## Features

- ⚡ **Instant Rank on Submit** — Get the player's new rank, total players, and personal best flag immediately from `submit_score`.
- 🔒 **Native Anti-Cheat** — Automatic HMAC-SHA256 score signing using Godot's built-in `HMACContext`.
- 🎯 **Player-Centric Views** — Centered leaderboards ("You vs. Neighbors") with one function call.
- ⏱️ **Flexible Time & Custom Buckets** — Filter by `weekly`, `monthly`, `all`, as well as custom seasons and teams.
- 👤 **Player Profiles & Run History** — Track player metadata (country, avatar, level) and complete score progression history.
- 🛡️ **Network Resilient** — Support for idempotency keys (`submission_id`) and safe error handling that won't crash your game loop.
- 📦 **Clean Singleton Design** — Simple AutoLoad node, fully asynchronous with GDScript `await`.

---

## Installation

### Option A: From the Godot Asset Library (Recommended)

1. Open your project in Godot 4 and navigate to the **AssetLib** tab at the top.
2. Search for **LightLeaderboard** and click **Download**.
3. In the installation dialog, click **Install** to add `addons/lightleaderboard/` to your project.
4. Open **Project → Project Settings → Plugins** and toggle the status checkbox to **Enable** `LightLeaderboard`.
5. Open **Project → Project Settings → AutoLoad**:
   - Click the file icon next to **Path** and select `res://addons/lightleaderboard/LightLeaderboard.gd`.
   - Set **Node Name** to `LightLeaderboard`.
   - Click **Add**.

### Option B: Manual Installation

1. Clone or download this repository.
2. Copy the `addons/lightleaderboard/` directory into your project's `addons/` folder:
   ```text
   res://addons/lightleaderboard/
     ├── LightLeaderboard.gd
     ├── icon.png
     └── plugin.cfg
   ```
3. Open **Project → Project Settings → Plugins** and enable **LightLeaderboard**.
4. Open **Project → Project Settings → AutoLoad**:
   - Path: `res://addons/lightleaderboard/LightLeaderboard.gd`
   - Node Name: `LightLeaderboard`
   - Click **Add**.

---

## Quick Start

In any script in your project (e.g. your game manager or main scene):

```gdscript
extends Node

func _ready() -> void:
    # 1. Initialize once with credentials from the LightLeaderboard dashboard
    LightLeaderboard.configure("YOUR_API_KEY", "YOUR_GAME_REF_ID")

func _on_game_over(final_score: float) -> void:
    # 2. Submit score and get rank immediately
    var result = await LightLeaderboard.submit_score({
        score         = final_score,
        player_ref_id = "player-123",
        player_name   = "Alice",
    })

    if not result.is_empty():
        print("Rank #%d of %d players! Personal Best: %s" % [
            result.rank,
            result.total_players,
            str(result.is_personal_best)
        ])

    # 3. Fetch top 10 scores
    var lb = await LightLeaderboard.get_leaderboard({ limit = 10, period = "weekly" })
    if not lb.is_empty():
        for entry in lb.entries:
            print("#%d  %s: %s" % [entry.rank, entry.player_name, entry.score])
```

---

## API Reference

### `configure(api_key, game_id, score_secret?, base_url?)`

Initializes the LightLeaderboard client. Call this once during game startup before calling other API methods.

```gdscript
LightLeaderboard.configure(
    "api-key-here",
    "game-id-here",
    "optional-signature-secret", # Optional: enables HMAC-SHA256 signing
    "https://leaderboard.goproso.com" # Optional: custom base URL
)
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | `String` | **Yes** | Your game API key from the developer portal. |
| `game_id` | `String` | **Yes** | Your game reference ID. |
| `score_secret` | `String` | No | Signature secret for automated HMAC-SHA256 score verification. |
| `base_url` | `String` | No | Custom API base URL (defaults to `https://leaderboard.goproso.com`). |

---

### `await submit_score(options: Dictionary) -> Dictionary`

Submits a score to the leaderboard. Returns the player's updated rank, total player count, and personal best status in a single call.

```gdscript
var submission = await LightLeaderboard.submit_score({
    score         = 12450.0,
    player_ref_id = "player-123",
    player_name   = "Alice",
    play_time_ms  = 84200,                    # 1m 24.2s
    season_id     = "season-2",               # optional season bucket
    team_id       = "team-red",               # optional team bucket
    submission_id = "unique-run-uuid",        # idempotency key
    metadata      = { "stage": 4, "hero": "knight" },
    game_stat_txt1 = "Normal Difficulty",
    game_stat_int1 = 120,                     # e.g. coins collected
})
```

#### Options Dictionary

| Key | Type | Required | Description |
|---|---|---|---|
| `score` | `float` or `int` | **Yes** | The numeric score to submit. |
| `player_ref_id` | `String` | No | Your internal unique player ID (needed for rank calculation). |
| `player_name` | `String` | No | Player display name shown on leaderboards. |
| `play_time_ms` | `int` | No | Run duration in milliseconds. |
| `season_id` | `String` | No | Season bucket identifier. |
| `team_id` | `String` | No | Team / Clan identifier. |
| `submission_id` | `String` | No | Unique client ID to prevent duplicate submissions on retry. |
| `metadata` | `Dictionary` | No | Arbitrary JSON dictionary attached to this score. |
| `game_stat_txt1/2/3` | `String` | No | Custom text statistic slots. |
| `game_stat_int1/2/3` | `int` | No | Custom integer statistic slots. |

#### Return Value

```gdscript
{
    "id":               int,          # Database record ID
    "rank":             int or null,  # Current rank after submission (null if no player_ref_id)
    "is_personal_best": bool,         # true if this beats player's previous best
    "total_players":    int or null,  # Total unique players on leaderboard
    "deduped":          bool,         # true if submission_id was already processed
}
```

---

### `await get_leaderboard(options?: Dictionary) -> Dictionary`

Fetches leaderboard rankings. By default, returns one entry per player (their personal best).

```gdscript
var lb = await LightLeaderboard.get_leaderboard({
    limit       = 20,         # 1–100 (default 20)
    offset      = 0,          # Pagination offset
    period      = "weekly",   # "all" | "weekly" | "monthly"
    season      = "season-2", # Filter by season ID
    team        = "team-red", # Filter by team ID
    all_entries = false,      # true = all scores, false = best score per player
})

if not lb.is_empty():
    for entry in lb.entries:
        print("#%d  %s  (Score: %s)" % [entry.rank, entry.player_name, entry.score])
```

#### Return Value

```gdscript
{
    "entries":     Array,       # Array of entry Dictionaries
    "score_order": String,      # "desc" or "asc"
    "period":      String,      # "all", "weekly", or "monthly"
    "season":      String or null,
    "team":        String or null,
    "limit":       int,
    "offset":      int,
}
```

Each item in `entries`:

```gdscript
{
    "id":            int,
    "rank":          int,
    "player_ref_id": String or null,
    "player_name":   String or null,
    "score":         float,
    "play_time_ms":  int or null,
    "metadata":      Dictionary,
    "created_at":    String,
}
```

---

### `await get_player_rank(player_ref_id: String, options?: Dictionary) -> Dictionary`

Retrieves a player's rank, personal best score, and **percentile** standing.

```gdscript
var rank_data = await LightLeaderboard.get_player_rank("player-123", { period = "weekly" })

if not rank_data.is_empty():
    print("Rank: #%d of %d" % [rank_data.rank, rank_data.total_players])
    print("Score: %s" % rank_data.score)
    print("Percentile: %.1f%%" % rank_data.percentile) # 0–100, higher is better
```

---

### `await get_centric_leaderboard(player_ref_id: String, options?: Dictionary) -> Dictionary`

Fetches a slice of the leaderboard centered on the player (e.g. 5 ranks above, the player, and 5 ranks below).

```gdscript
var centric = await LightLeaderboard.get_centric_leaderboard("player-123", {
    limit  = 11,
    period = "all",
})

if not centric.is_empty():
    print("Leaderboard around your rank #%d:" % centric.player_rank)
    for entry in centric.entries:
        var tag = " (YOU)" if entry.player_ref_id == "player-123" else ""
        print("#%d  %s: %s%s" % [entry.rank, entry.player_name, entry.score, tag])
```

---

### `await get_player(player_ref_id: String) -> Dictionary`

Fetches a player's profile data.

```gdscript
var profile = await LightLeaderboard.get_player("player-123")
if not profile.is_empty():
    print("Player: ", profile.player_name)
    print("Country: ", profile.country)
    print("Level: ", profile.level)
```

---

### `await update_player(player_ref_id: String, options: Dictionary) -> void`

Creates or updates a player's profile. Omitted fields preserve their existing values.

```gdscript
await LightLeaderboard.update_player("player-123", {
    player_name = "Alice Wonder",
    avatar_url  = "https://example.com/avatar.png",
    country     = "US",
    level       = 42,
    team_id     = "team-red",
    device      = "desktop",
})
```

---

### `await get_player_scores(player_ref_id: String, options?: Dictionary) -> Dictionary`

Fetches all individual runs/submissions made by a player, sorted newest first.

```gdscript
var history = await LightLeaderboard.get_player_scores("player-123", {
    limit  = 20,
    offset = 0,
})

if not history.is_empty():
    print("Total runs: %d, Best score: %s" % [history.total, history.best_score])
    for run in history.entries:
        print("%s — score: %s" % [run.created_at, run.score])
```

---

## Anti-Cheat & Score Signing

To prevent client-side score tampering, enable **Require signed scores** in your game settings on the LightLeaderboard dashboard.

Then provide your signature secret to `configure()`:

```gdscript
LightLeaderboard.configure("YOUR_API_KEY", "YOUR_GAME_REF_ID", "YOUR_SIGNATURE_SECRET")
```

Every subsequent `submit_score` call will automatically calculate an HMAC-SHA256 signature over the request body using Godot's built-in `HMACContext` and attach the `x-score-signature` header.

---

## Error Handling

When a network or API error occurs:
1. The method logs a detailed error to Godot's console via `push_error`.
2. The method returns an empty `Dictionary` (`{}`) rather than crashing.

Always verify results using `is_empty()` before accessing response keys:

```gdscript
var res = await LightLeaderboard.submit_score({ score = 9500.0 })
if res.is_empty():
    print("Score submission failed. Check Godot Output / Debugger for details.")
    return

print("Submission successful! Rank: ", res.rank)
```

---

## Requirements

- **Godot Engine 4.0+** (Standard or .NET edition with GDScript)
- Network/Internet permissions enabled in your target export templates (Android, iOS, Web).

---

## License

[MIT](LICENSE) © [LightLeaderboard](https://leaderboard.goproso.com)
