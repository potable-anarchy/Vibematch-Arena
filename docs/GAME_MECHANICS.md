# Game Mechanics

Complete guide to Vibematch Arena's combat, weapons, pickups, and gameplay systems.

## Table of Contents

- [Core Systems](#core-systems)
- [Weapons](#weapons)
- [Pickups](#pickups)
- [Combat System](#combat-system)
- [Health & Armor](#health--armor)
- [Movement](#movement)
- [Spawn System](#spawn-system)
- [Scoring](#scoring)
- [AI Bots](#ai-bots)
- [Game Constants](#game-constants)

## Core Systems

### Server-Authoritative Architecture

Vibematch Arena uses a server-authoritative architecture where:

- **Server** is the source of truth for all game state
- **Clients** send inputs and render predicted state
- **Server validates** all actions (shooting, movement, pickups)
- **Lag compensation** ensures fair hit detection

**Benefits:**
- Prevents cheating
- Consistent game state across all players
- Fair combat regardless of latency

### Tick Rate

- **Server Tick Rate:** 60 Hz (16.67ms per tick)
- **State Broadcast:** 30 Hz (every 33.33ms)
- **Client Render:** Variable (~60 FPS target)

### Network Architecture

```
Client Input → Server Validation → Game Loop → State Broadcast → Client Render
     ↑                                                                  ↓
     └──────────────────── Prediction & Interpolation ────────────────┘
```

## Weapons

All weapons use projectile-based ballistics (not hitscan). Projectiles travel at finite speeds and can be dodged.

### Pistol

The starter weapon with infinite ammo.

**Stats:**
- **Damage:** 20 per hit
- **Fire Rate:** 6 rounds per second
- **Magazine:** 12 rounds
- **Reload Time:** 1.2 seconds
- **Range:** 800 pixels
- **Bloom:** 0.02 (very accurate)
- **Projectile Speed:** 1200 px/s

**Characteristics:**
- Most accurate weapon
- Good for medium-range duels
- Infinite ammo (never runs out)
- Moderate damage
- Reliable fallback weapon

**Tactical Use:**
- Mid-range engagements (100-300px optimal)
- Finishing low-health enemies
- Safe weapon when out of ammo for others
- Good for headshots (if implemented)

---

### SMG (Submachine Gun)

Close-range spray weapon with high fire rate.

**Stats:**
- **Damage:** 12 per hit
- **Fire Rate:** 12 rounds per second (fastest)
- **Magazine:** 30 rounds
- **Reload Time:** 1.8 seconds
- **Range:** 600 pixels
- **Bloom:** 0.05 (moderate spread)
- **Projectile Speed:** 1000 px/s
- **Pickup:** weapon_smg (respawns in 15s)

**Characteristics:**
- Highest fire rate
- Lower damage per bullet
- Significant bloom (spray pattern)
- Excellent close-quarters weapon
- Burns through ammo quickly

**Tactical Use:**
- Close range combat (80-250px optimal)
- Aggressive pushes
- Room clearing
- Suppressive fire
- Hipfire effectiveness

---

### Shotgun

Devastating close-range burst damage.

**Stats:**
- **Damage:** 8 per pellet × 10 pellets = **80 total** (point blank)
- **Fire Rate:** 1.8 rounds per second (slowest)
- **Magazine:** 6 shells
- **Reload Time:** 2.5 seconds (longest)
- **Range:** 550 pixels
- **Spread:** 0.08 (wide cone)
- **Projectile Speed:** 800 px/s (slowest)
- **Pickup:** weapon_shotgun (respawns in 20s)

**Characteristics:**
- Fires 10 pellets per shot
- Massive damage potential at close range
- Damage falls off with distance (fewer pellets hit)
- Slow fire rate (pump action)
- Long reload
- Devastating ambush weapon

**Tactical Use:**
- Extreme close range (50-250px optimal)
- Corner camping
- Doorway defense
- One-shot potential on low-health enemies
- High risk, high reward

---

### Rifle

Precision long-range weapon with wall penetration.

**Stats:**
- **Damage:** 35 per hit (highest single-shot damage)
- **Fire Rate:** 3 rounds per second
- **Magazine:** 20 rounds
- **Reload Time:** 1.7 seconds
- **Range:** 1200 pixels (longest)
- **Bloom:** 0.008 (most accurate)
- **Projectile Speed:** 1500 px/s (fastest)
- **Wall Penetration:** 30% chance to penetrate walls
- **Pickup:** weapon_rifle (respawns in 25s)

**Characteristics:**
- Highest single-shot damage
- Excellent accuracy
- Longest range
- Can penetrate walls (30% chance)
- Moderate fire rate
- Dominant at medium-long range

**Tactical Use:**
- Long-range engagements (200-450px optimal)
- Holding sightlines
- Wallbangs through cover
- Two-shot kills on full health enemies
- Requires good aim

---

### Weapon Comparison Table

| Weapon  | Damage | Fire Rate | DPS  | Magazine | Reload | Range | Speed  | Bloom |
|---------|--------|-----------|------|----------|--------|-------|--------|-------|
| Pistol  | 20     | 6/s       | 120  | 12       | 1.2s   | 800px | 1200   | 0.02  |
| SMG     | 12     | 12/s      | 144  | 30       | 1.8s   | 600px | 1000   | 0.05  |
| Shotgun | 8×10   | 1.8/s     | 144* | 6        | 2.5s   | 550px | 800    | 0.08  |
| Rifle   | 35     | 3/s       | 105  | 20       | 1.7s   | 1200px| 1500   | 0.008 |

*Shotgun DPS assumes all pellets hit (rare except point-blank)

### Time-to-Kill (TTK)

Against 100 HP target (no armor):

| Weapon  | Shots to Kill | TTK (seconds) | Notes |
|---------|---------------|---------------|-------|
| Pistol  | 5             | 0.67s         | Consistent |
| SMG     | 9             | 0.67s         | If all hit |
| Shotgun | 2             | 0.56s         | Point-blank only |
| Rifle   | 3             | 0.67s         | Reliable |

Against 100 HP + 50 Armor (150 EHP):

| Weapon  | Shots to Kill | TTK (seconds) | Notes |
|---------|---------------|---------------|-------|
| Pistol  | 8             | 1.17s         | |
| SMG     | 13            | 1.00s         | High fire rate helps |
| Shotgun | 2-3           | 0.56-1.11s    | Distance dependent |
| Rifle   | 5             | 1.33s         | |

## Pickups

Pickups spawn at fixed locations on the map and respawn after being collected.

### Health Pickups

#### Health Small

- **Healing:** +25 HP
- **Respawn Time:** 15 seconds
- **Type:** `health_small`
- **Appearance:** Small health icon

Common pickup for sustaining health during fights.

#### Health Big

- **Healing:** +50 HP
- **Respawn Time:** 25 seconds
- **Type:** `health_big`
- **Appearance:** Large health icon

Strategic pickups at key map locations.

### Armor Pickups

Armor provides damage reduction (see Health & Armor section).

#### Armor Light

- **Armor:** +50 armor
- **Respawn Time:** 30 seconds
- **Type:** `armor_light`
- **Appearance:** Light armor vest

Standard armor pickup.

#### Armor Heavy

- **Armor:** +100 armor (full armor)
- **Respawn Time:** 45 seconds
- **Type:** `armor_heavy`
- **Appearance:** Heavy armor vest

Most valuable defensive pickup. Often contested.

### Ammo Pickup

- **Ammo:** +40% of max ammo for current weapon
- **Respawn Time:** 20 seconds
- **Type:** `ammo`
- **Note:** Does not affect pistol (infinite ammo)

### Weapon Pickups

Weapon pickups switch your current weapon and provide ammo.

#### SMG Pickup

- **Weapon:** Switches to SMG
- **Ammo:** Full magazine (30 rounds)
- **Respawn Time:** 15 seconds
- **Type:** `weapon_smg`

#### Shotgun Pickup

- **Weapon:** Switches to Shotgun
- **Ammo:** Full magazine (6 shells)
- **Respawn Time:** 20 seconds
- **Type:** `weapon_shotgun`

#### Rifle Pickup

- **Weapon:** Switches to Rifle
- **Ammo:** Full magazine (20 rounds)
- **Respawn Time:** 25 seconds
- **Type:** `weapon_rifle`

**Note:** Weapon pickups override your current weapon. You cannot carry multiple weapons (except pistol, which is always available).

### Pickup Respawn Summary

| Pickup Type   | Respawn Time | Strategic Value |
|---------------|--------------|-----------------|
| Health Small  | 15s          | Low - Common |
| Health Big    | 25s          | Medium - Contested |
| Armor Light   | 30s          | Medium - Important |
| Armor Heavy   | 45s          | High - Critical |
| Ammo          | 20s          | Medium - Depends on weapon |
| Weapon SMG    | 15s          | Low - Situational |
| Weapon Shotgun| 20s          | Medium - Strong close range |
| Weapon Rifle  | 25s          | High - Dominant weapon |

## Combat System

### Damage Calculation

1. **Base Damage:** Determined by weapon
2. **Armor Reduction:** If target has armor, damage is reduced
3. **Health Damage:** Remaining damage applied to health
4. **Kill Check:** If health ≤ 0, player dies

### Projectile System

All weapons fire projectiles (not hitscan):

**Projectile Behavior:**
- Travel at weapon-specific speeds
- Can be dodged if you see them coming
- Hit detection via collision with player hitboxes
- Disappear after traveling max range
- Can hit walls (rifle has 30% penetration chance)

**Bloom (Accuracy):**
- Each weapon has a bloom value (inaccuracy cone)
- Projectiles deviate randomly within the cone
- Lower bloom = more accurate
- Rifle (0.008) is most accurate
- Shotgun (0.08) has widest spread

### Hit Detection

Server-side hit detection with lag compensation:

1. Client sends shoot input with timestamp
2. Server rewinds world state to client's timestamp
3. Server traces projectile path
4. Server checks collisions in rewound state
5. Server applies damage and notifies clients

This ensures fair hits even with network latency.

### Sound System

Combat creates sound events that AI bots can hear:

- **Gunshots:** Bots hear shots and investigate
- **Footsteps:** Movement creates noise
- **Impact Sounds:** Bullets hitting walls

Sound radius varies by weapon type.

## Health & Armor

### Health System

- **Max Health:** 100
- **Starting Health:** 100
- **Death:** Health ≤ 0
- **Healing:** Only via health pickups
- **No Regeneration:** Health does not regenerate over time

### Armor System

Armor provides damage reduction following this formula:

```
Armor Absorption = 33% of incoming damage
```

**Damage Application Order:**
1. 33% of damage is absorbed by armor (armor depletes)
2. Remaining 67% damages health

**Example:**
- Rifle shot: 35 damage
- You have 50 armor, 100 health
- Armor absorbs: 35 × 0.33 = 11.55 ≈ 12 damage
- Armor depletes: 50 → 38
- Health damage: 35 × 0.67 = 23.45 ≈ 23 damage
- Health: 100 → 77

**Armor Properties:**
- **Max Armor:** 100
- **Starting Armor:** 0 (no armor on spawn)
- **Armor Types:** 50 (light) or 100 (heavy) from pickups
- **No Regeneration:** Armor does not regenerate

### Effective Health Pool (EHP)

With armor, your effective HP is higher:

```
EHP = Health + (Armor / 0.33)
EHP = Health + (Armor × 3.03)
```

**Examples:**
- 100 HP + 0 Armor = 100 EHP
- 100 HP + 50 Armor = 251.5 EHP
- 100 HP + 100 Armor = 403 EHP

This makes armor extremely valuable!

### Damage Mitigation

Armor reduces TTK significantly:

| Health | Armor | EHP   | Pistol Shots | Rifle Shots | SMG Shots |
|--------|-------|-------|--------------|-------------|-----------|
| 100    | 0     | 100   | 5            | 3           | 9         |
| 100    | 50    | 252   | 8            | 5           | 13        |
| 100    | 100   | 403   | 11           | 7           | 17        |

## Movement

### Movement Speed

- **Base Speed:** 250 pixels per second
- **Acceleration:** Instant (no ramp-up)
- **Deceleration:** Instant (no slide)
- **Diagonal Movement:** Same speed as cardinal directions

### Collision

- **Player Radius:** 20 pixels
- **Wall Collision:** Players cannot pass through walls
- **Wall Sliding:** Players slide along walls when moving at angles
- **Player Collision:** Players can overlap (no player blocking)

### Movement Mechanics

- **WASD:** 8-directional movement
- **No Sprint:** Constant movement speed
- **No Crouch:** No crouch mechanics
- **No Jump:** Top-down perspective

## Spawn System

### Spawn Protection

- **Duration:** 600 milliseconds (0.6 seconds)
- **Effect:** Invulnerable to all damage
- **Visual Indicator:** Player may have invulnerability effect
- **Purpose:** Prevent spawn camping

### Spawn Selection

Server selects spawn points based on:

1. **Distance from enemies:** Prefers spawns far from other players
2. **Line of Sight:** Avoids spawns with direct LOS to enemies
3. **Recent deaths:** Avoids spawns where players recently died
4. **Randomization:** Some randomness to prevent patterns

### Respawn

- **Respawn Time:** Instant (no delay)
- **Loadout:** Pistol with full ammo
- **Health:** Full health (100 HP)
- **Armor:** No armor (0)
- **Position:** Random safe spawn point

## Scoring

### Kill/Death Tracking

- **Kill:** +1 when you kill another player or bot
- **Death:** +1 when you die
- **Suicide:** Counts as death, no kill credit
- **K/D Ratio:** Kills ÷ Deaths

### Credit System

Players earn credits for actions:

- **Kill:** +10 credits
- **Hit:** +1 credit per hit
- **Pickup:** +0 credits

**Credit Uses:**
- Purchase mods from AI-generated mod shop
- Used by bots to purchase mods automatically
- Persists across respawns (not reset on death)

### Scoreboard

Live scoreboard shows:
- Player name
- Kills
- Deaths
- K/D ratio

Sorted by kills (descending).

## AI Bots

### Bot Behavior

Bots are server-controlled AI players with sophisticated behavior:

#### Combat AI

- **Target Selection:** Choose nearest visible enemy
- **Range Awareness:** Engage at weapon-optimal ranges
- **Cover Usage:** Move to cover when low health
- **Weapon Switching:** Attempt to pick up better weapons

#### Movement AI

- **Pathfinding:** Navigate around walls to targets
- **Tactical Positioning:** Maintain optimal weapon range
- **Retreat Logic:** Fall back when health < 30%
- **Pickup Collection:** Navigate to health/armor when needed

#### Weapon Preferences

Each weapon has optimal ranges programmed for bots:

| Weapon  | Optimal Range | Min Range | Max Range |
|---------|---------------|-----------|-----------|
| Pistol  | 100-300px     | 50px      | 400px     |
| SMG     | 80-250px      | 40px      | 350px     |
| Shotgun | 50-250px      | 20px      | 350px     |
| Rifle   | 200-450px     | 100px     | 600px     |

Bots will try to maintain their weapon's optimal range.

#### Sound Awareness

Bots can hear:
- **Gunshots:** Within 300-500px radius
- **Footsteps:** Within 100px radius
- **Impacts:** Within 200px radius

Bots investigate sounds when not in combat.

#### Difficulty

Bots have tuned difficulty:
- **Aim:** Not perfect (bloom applied)
- **Reaction Time:** ~200-400ms delay
- **Decision Making:** Simple state machine
- **Tactics:** Basic cover and range awareness

### Bot Credits & Mods

Bots earn credits like players and can purchase mods:

- **Purchase Chance:** 30% when they have 10+ credits
- **Mod Cost:** 10 credits per mod
- **Mod Selection:** Random from available client mods
- **Mod Limit:** Can purchase multiple mods over time

## Game Constants

### World

- **World Width:** 2000 pixels
- **World Height:** 2000 pixels
- **Player Radius:** 20 pixels
- **Pickup Radius:** 30 pixels (collection range)

### Timing

- **Tick Rate:** 60 Hz (16.67ms)
- **State Broadcast:** 30 Hz (33.33ms)
- **Spawn Protection:** 600ms
- **Interpolation Time:** 100ms (client smoothing)

### Limits

- **Max Players:** Server configured (typically 10-20)
- **Max Bots:** Server configured (typically 3-5)
- **Max Projectiles:** No hard limit (naturally cleaned up)
- **Max Pickups:** Fixed map layout (~10-15)

### Network

- **Socket.io Protocol:** WebSocket
- **Input Rate:** 60 Hz (every 16ms)
- **State Sync:** 30 Hz (every 33ms)
- **Lag Compensation Window:** 200ms

### Performance

- **Server Tick Budget:** 16.67ms (60 FPS)
- **Physics Budget:** ~5ms per tick
- **AI Budget:** ~3ms per tick
- **Network Budget:** ~2ms per tick
- **Remaining:** ~6ms overhead/buffer

## Strategy Tips

### Map Control

- **Control Armor Heavy spawn** - Most valuable pickup
- **Learn pickup timings** - Be ready when they respawn
- **Hold rifle spawn** - Dominant weapon
- **Deny enemy pickups** - Control health/armor zones

### Combat

- **Use correct weapon for range** - Rifle at long, shotgun close
- **Dodge projectiles** - They're not hitscan, strafe to avoid
- **Reload behind cover** - Don't reload in the open
- **Manage ammo** - Pick up ammo before running dry

### Survival

- **Pick up armor first** - Doubles your effective HP
- **Don't overextend** - Stay near health pickups
- **Use spawn protection** - Escape bad spawns immediately
- **Learn spawn points** - Predict enemy spawns

### Advanced

- **Bait shots** - Make enemies waste ammo
- **Wallbangs with rifle** - Shoot through walls (30% chance)
- **Control sightlines** - Use walls to limit angles
- **Sound awareness** - Listen for gunshots to find fights

## See Also

- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup and installation
- [API_REFERENCE.md](API_REFERENCE.md) - Mod system API
- [design.md](../design.md) - Original game design document
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
