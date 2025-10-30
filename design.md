Multiplayer Vibematch-Arena — Design Document

A top-down, Hotline-Miami-style shooter with Doom-y weapons, tight TTK, a real health/armor system, and one massive twist: **AI-powered live coding that lets players hack gameplay in real-time.**

⸻

1) High-Level Pitch

Fast, sweaty, top-down arena shooter where you strafe with WASD / left stick, aim with mouse / right stick, and rip around tight arenas stacked with walls, doors, and line-of-sight traps. Think "Multiplayer Hotline Miami" pacing with a Doom-inspired arsenal, pickups (health, armor, ammo, power-ups), and short, high-intensity rounds. Server-authoritative netcode with client-side input prediction + lag compensation keeps it snappy.

**The Twist:** While playing, open the mod editor (backtick key) and write or AI-generate custom JavaScript that modifies the game loop. Hot-reload with Ctrl+Enter to instantly inject physics tweaks, visual effects, new mechanics, or wild experimental features—all without restarting. The game is your canvas.

⸻

2) Core Pillars
	•	Brutal clarity: You always understand who killed you and why (clear decals, tracers, hit markers, killcam).
	•	Frictionless movement: Momentum, slides, breakable props, readable collision.
	•	Arena agency: Spawn waves of pickups, telegraphs on spawns, strong LOS control with walls/doors.
	•	Low ceremony: 60–180s rounds; 1–2s respawns; no loadouts—map control decides.
	•	**Hackable reality**: Live-coding mod system turns every match into a creative playground.

⸻

3) Player Controls

Keyboard & Mouse
	•	Move: WASD
	•	Aim: Mouse
	•	Shoot: LMB
	•	Alt-fire / Secondary: RMB
	•	Reload: R
	•	Interact (doors/switches): E
	•	Swap weapon: Q / MouseWheel
	•	Dash (optional): Shift
	•	Ping (optional): Middle Mouse
	•	**Mod Editor**: ` (Backtick)
	•	**Hot-Reload Mod**: Ctrl+Enter

Dual-Stick Controller
	•	Move: Left Stick
	•	Aim: Right Stick
	•	Shoot: RT
	•	Alt-fire: LT
	•	Reload: X (Xbox) / Square (PS)
	•	Interact: A / Cross
	•	Swap weapon: Y / Triangle
	•	Dash: B / Circle
	•	Ping: R3

Aim Assist (controller): Mild magnetism cone + rotational dampening; disabled for competitive queues if cross-play aim-assist concerns arise.

⸻

4) Game Modes
	•	FFA Vibematch: First to 20 frags or most kills at timer.
	•	Team Vibematch (2v2 / 3v3 / 4v4): 50 team frags or timer.
	•	Duel (1v1, Best-of-5, 2-min rounds): Small map variant.
	•	Arcade Mutators: Instagib, Low-Gravity, Vampirism, Big-Head (debug/fun).

Match Length: 5–8 minutes (quick queue), 10–12 (standard).

⸻

5) Health, Armor, Damage
	•	Health: 100 base. Regeneration off by default.
	•	Armor: 50 (Light), 100 (Heavy). Reduces incoming damage by 33% until armor is depleted (Doom-ish feel).
	•	Headshots: +50% for ballistic weapons (top-down cone and hitbox).
	•	TTK Target: 300–700 ms in close quarters; 800–1200 ms at mid-range.

Pickups
	•	Health Small: +25 (respawn 15s)
	•	Health Big: +50 (respawn 25s)
	•	Armor Light: +50 (respawn 30s)
	•	Armor Heavy: +100 (respawn 45s)
	•	Ammo Crate: Refill 40% carried ammo (respawn 20s)

Power-Ups (15s duration)
	•	Quad Damage: ×2 weapon damage
	•	Haste: +25% move, +15% fire rate
	•	Shield: Temporary 50 overshield that decays after duration

⸻

6) Weapons (Baseline Set)

Weapon	Role	DMG	ROF	Mag	Notes
Pistol	Spawn fallback	20	6 rps	12	Pinpoint, infinite reserve
SMG	Close shred	12	12 rps	30	Bloom increases with spray
Shotgun	Close burst	8 × 10 pellets	1.1 s pump	6	7° spread, wall chunk decals
Rifle	Mid duel	30	5 rps	20	Minimal bloom, headshot 45
Rocket	Area denial	100 splash (≤2m) / 80 direct	0.8 rps	4	Self-damage 40; rocket-jump small
Railgun	Pick shot	90	0.7 rps	5	Pierces 1 target, tracer line
Plasma	Spam / mid	18	8 rps	40	Projectiles, slight pushback

Ammo Types: Ballistic, Shells, Rockets, Cells. Ammo pickups specify type; "Ammo Crate" gives split across carried.

⸻

7) Movement & Collisions
	•	Base Speed: 5.0 m/s; Haste: 6.25 m/s.
	•	Dash (optional toggle): 7.5 m/s for 0.25s, 3s cooldown; cancels reload.
	•	Slides (optional later): If dash ends into movement input.
	•	Collision: Axis-aligned walls, convex props. Player radius 0.35m.
	•	Doors: Manual open (Interact) or auto (pressure plates). Doors have 0.2s open/close easing (sound cue).

⸻

8) Arenas & Level Design

Design Tenets
	•	Triangles of conflict: Always 2–3 viable attack routes into any hotspot.
	•	Sightline rhythm: Alternating long/short LOS with cover "islands."
	•	Item loops: Mini-circuits that reward timing (health → armor → weapon).
	•	Unsafe power-ups: Powerful items visible and flanked by multiple angles.

Tiles/Obstacles
	•	Solid wall (bullet-stopping), low wall (projectile pass? no / yes toggle per map), glass (breakable), doors, barrels (explosive), bounce pads, teleporters, damaging floors (lava/slime).

Spawn System
	•	Weighted spawns by distance to enemies, LOS safety, recent deaths.
	•	Anti-spawn-trap: Brief 600 ms invuln + no shooting to prevent spawn peeks.

⸻

9) Session Flow
	1.	Matchmaking → map vote (3 choices) → 10s warmup with infinite ammo.
	2.	Live → pickups spawn after initial 10s delay.
	3.	End → MVP panel + heatmap (deaths/kills), fast queue to rematch.

⸻

10) Camera & Visuals
	•	Camera: Top-down with slight tilt (5–10°) for parallax; target follows player with 0.1s smoothing; screenshake micro on hits/explosions (accessibility toggle).
	•	Readability: Player outline, team color highlights, visible projectiles, bold tracers, loud hit sparks.
	•	Accessibility: High-contrast mode, colorblind palettes, toggle gore.

⸻

11) Netcode & Performance
	•	Authoritative Server (deterministic ECS where possible).
	•	Client-side Prediction for movement; Server Reconciliation on correction.
	•	Lag Compensation:
	•	Hitscan (pistol/rifle/rail): server rewinds to shooter's shot_time.
	•	Projectiles (rocket/plasma): simulated server-side; client shows predicted.
	•	Tick Rate: Server 60 Hz; Client render 120 Hz if available.
	•	Bandwidth Targets: ≤30 kbps/client typical.

Packet Sketch

C->S: InputFrame { seq, dt, move_vec(2f), aim_dir(2f), fire(bool), alt(bool), dash(bool), reload(bool) }
S->C: StateDelta { ack_seq, time, entities[compact], events[kill, pickup, hit], corrections[pos, vel] }

Anti-Cheat (Phase 1)
	•	Server checks impossible fire rates, projectile origins, speed.
	•	Encrypted packets + sanity checks on inputs.
	•	Optional: server authoritative RNG for spread.

⸻

12) Game Architecture (ECS-first)

Core Components
	•	Transform {pos, rot}
	•	PhysicsBody {vel, radius, mass, flags}
	•	Health {hp, armor}
	•	Weapon {type, ammo, state, cooldown}
	•	Input {move, aim, fire, …}
	•	Pickup {kind, amount, respawn_at}
	•	Team {id}
	•	Effect {ttl, type}
	•	Network {owner, last_serialized}

Core Systems
	•	InputSystem (client sim) → MovementSystem → WeaponSystem → DamageSystem → PickupSystem → RespawnSystem → NetworkSyncSystem.

⸻

13) Damage & Hit Resolution (Pseudo-Code)

// runs server-side
void FireHitscan(Entity shooter, Weapon w) {
  auto shotTime = shooter.lastInputTimestamp;
  RewindWorldTo(shotTime); // lag compensation window e.g., 200ms
  Ray r = RayFrom(shooter.pos, shooter.aimDir);
  Hit h = Raycast(r, HITMASK_PLAYERS | HITMASK_WALLS);
  if (h.entity && IsPlayer(h.entity)) {
    int dmg = BaseDamage(w) * (IsHeadshot(h) ? 1.5f : 1.0f);
    ApplyDamage(h.entity, dmg, shooter);
  }
  RestoreWorld();
}


⸻

14) Pickups & Respawns (JSON Spec)

{
  "pickups": [
    { "id": "health_small", "type": "health", "amount": 25, "respawn_s": 15 },
    { "id": "armor_heavy",  "type": "armor",  "amount": 100, "respawn_s": 45 },
    { "id": "quad",         "type": "power",  "effect": "quad_damage", "duration_s": 15, "respawn_s": 90 }
  ]
}

Spawn Rules
	•	Spawn points defined by tags: safe, contested, powerup_ring.
	•	Server rotates spawn tables per phase (early/mid/late) to avoid snowball.

⸻

15) UI/UX
	•	HUD: Health/Armor (numerical), current weapon & ammo, power-up timer, crosshair (changes on hit/crit), mini killfeed, score.
	•	Maps: Top-left mini-radar (optional), or map overlay in warmup.
	•	Killcam: 2–4s replay from killer POV with tracers (toggleable).
	•	Post-Match: K/D/A, damage done, item control %, heatmap.
	•	**Mod Editor**: Full-screen overlay with code editor, file browser, hot-reload status.

⸻

16) Audio Direction
	•	Weapons: Distinct per category; ducking on hits; positional stereo cues.
	•	Movement: Footsteps material-aware; dash "whoosh."
	•	Feedback: Hitmarker pips, armor break crack, headshot "ping," quad "thrum."

⸻

17) Content Pipeline
	•	Maps: Tile-based editor; export to JSON/CSV; server loads nav + LOS.
	•	Weapons: Data-driven (tuning via JSON); deterministic spread patterns.
	•	VFX: GPU-cheap particles; limited lifetimes; cap concurrent emitters.
	•	**Mods**: JavaScript files in `public/mods/`, hot-reloadable via mod API.

⸻

18) Live-Ops & Progression (Lightweight)
	•	Cosmetics only: Sprays, trails, death banners, skins.
	•	Challenges: "Get 10 shotgun kills," "Control Quad 3x."
	•	MMR: Visible ranks optional; SBMM queue off by default in customs.
	•	**Mod Marketplace**: Share and download community mods (future).

⸻

19) Technical Targets
	•	Platforms: PC (Windows/macOS/Linux), Steam Deck-friendly controls.
	•	Render: 2D/2.5D; sprite/mesh hybrid; GPU particles.
	•	Perf: 1080p/144 FPS target on mid-tier GPUs; scalable effects toggles.

⸻

20) MVP Scope (6–10 Weeks)
	•	1 small arena + 1 medium arena.
	•	Modes: FFA + 1v1.
	•	Weapons: Pistol, Shotgun, Rifle, Rocket.
	•	Pickups: Health Small/Big, Armor Light, Ammo Crate, Quad.
	•	Server: Dedicated binary, 60 Hz, basic matchmaking + custom lobbies.
	•	Cosmetics: Simple color swaps.
	•	**Mod System**: Basic live-coding with example mods.

⸻

21) Stretch Goals
	•	Doors with locks/switches, teleporter traps, bounce pads.
	•	Dash/Slide tech, wall-bonk knockback.
	•	Replay system, spectate with timeline scrub.
	•	Workshop maps (user UGC), anti-camp director.
	•	**Server-side mod API** for AI-generated gameplay tweaks.

⸻

22) Example Configs (Drop-in)

config/weapons.json

{
  "rifle": { "damage": 30, "rpm": 300, "mag": 20, "reload_s": 1.7, "bloom_deg": 0.8, "headshot_mult": 1.5 },
  "shotgun": { "pellets": 10, "pellet_dmg": 8, "spread_deg": 7, "mag": 6, "pump_s": 1.1, "range_m": 8.0 },
  "rocket": { "direct_dmg": 80, "splash_max": 100, "radius_m": 2.0, "mag": 4, "rof_rps": 0.8, "self_dmg": 40 }
}

config/match_rules.json

{
  "mode": "ffa",
  "frag_limit": 20,
  "time_limit_s": 480,
  "respawn_delay_s": 1.5,
  "powerups": ["quad", "haste", "shield"]
}


⸻

23) Input Mapping (ini-style for quick tweaks)

[kbm]
move_up=W
move_down=S
move_left=A
move_right=D
shoot=Mouse1
alt_fire=Mouse2
reload=R
interact=E
swap=Q
dash=LeftShift
mod_editor=Backtick

[controller]
shoot=RT
alt_fire=LT
reload=X
interact=A
swap=Y
dash=B


⸻

24) Minimal ECS Pseudo-Code (Server Loop)

while (running) {
  const float dt = 1.0f / 60.0f;

  // 1) ingest inputs
  for (auto& c : clients) IngestInput(c);

  // 2) simulate
  InputSystem(dt);
  MovementSystem(dt);
  WeaponSystem(dt);     // fires, spawns projectiles
  ProjectileSystem(dt); // moves projectiles, checks collisions
  DamageSystem(dt);     // applies damage, death, scoring
  PickupSystem(dt);     // spawn/consume/respawn
  RespawnSystem(dt);    // place players safely

  // 3) bundle deltas & send
  NetworkSyncSystem(dt);
}


⸻

25) Test Plan (MVP)
	•	Hit-reg sanity: Offline determinism vs. 0/50/100 ms simulated latency.
	•	Spawn safety: Bot pressure tests around spawn clusters.
	•	Item timing: Ensure cycles are learnable (same offsets every round).
	•	Performance: 8 players, 60 Hz server on modest VM; 144 FPS client target on mid GPU.
	•	UX: New player tutorial: move, aim, shoot, pick up, power-up risk.
	•	**Mod System**: Verify hot-reload works across browsers, no memory leaks.

⸻

26) Risks & Mitigations
	•	Spawn trapping: Weighted spawns + short invuln + map LOS reducers.
	•	Desync complaints: Aggressive reconciliation; shorter rewind window for hitscan; projectile favoring server truth.
	•	Balance drift: Data-driven tuning, A/B queues, telemetry on item control and weapon kill shares.
	•	**Mod abuse**: Client-side only mods in MVP; server validation for future multiplayer mods.

⸻

27) What Makes It "Us"?
	•	Hotline-tight controls with Doom-ish item control.
	•	Short, violent loops; low downtime; high clarity.
	•	No loadout grind—skill + map timing wins.
	•	**Hackable gameplay**: AI-powered live coding turns every match into creative chaos.

⸻

Appendix: Quick To-Dos
	•	Implement server authoritative ECS skeleton.
	•	KBM/controller input unification + mild controller aim assist.
	•	Four weapons + core pickups + two arenas.
	•	Basic UI/HUD + killfeed + scoreboard.
	•	Dedicated server deploy script + NAT traversal or relay.
	•	Telemetry: weapon K%, item pickup %, heatmaps.
	•	**Mod system**: Hot-reload architecture, example mods, AI integration guide.

If you want, I can spin up a barebones repo layout (server/client/shared) with the ECS scaffolding, JSON configs above, and a tiny reference arena so you can jump right into playtesting.
