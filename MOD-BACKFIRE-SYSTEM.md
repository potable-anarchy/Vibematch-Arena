# Mod Backfire System

When mods fail or can't work as intended, there's a chance they BACKFIRE spectacularly!

## Backfire Trigger Conditions

1. **Syntax errors in generated code** (20% chance to backfire instead of just failing)
2. **Runtime errors during execution** (30% chance to backfire)
3. **Random chaos mode** (5% chance any mod backfires just for fun)
4. **Impossible requests** (10% chance instead of creative alternative)

---

## Types of Backfires

### 1. **Reverse Effect** (affects everyone BUT you)
- Request: "heal me" → Everyone else gets healed, you stay damaged
- Request: "god mode" → Everyone else becomes invulnerable, you're vulnerable
- Request: "speed boost" → Everyone else gets faster, you get slower
- Request: "give me the best weapon" → Everyone else gets AWP, you get nothing

### 2. **Opposite Effect** (does the opposite of what you wanted)
- Request: "heal me" → Take 50 damage instead
- Request: "god mode" → Remove all your armor
- Request: "teleport to center" → Teleport to random corner
- Request: "auto-heal" → Auto-damage (lose 5 HP/second)

### 3. **Chaotic Malfunction** (random annoying effects)
- Constantly teleport to random locations (can't control movement)
- Screen flips upside down (client mod)
- Controls reversed (client mod)
- Camera zooms in/out rapidly (client mod)
- Player spins uncontrollably
- Weapon switches every second

### 4. **Self-Sabotage** (helps enemies find/kill you)
- Spawn health packs at enemy locations
- Teleport all enemies to your location
- Remove all your weapons
- Set your health to 1
- Make you glow/highlight for enemies (client mod for all other players)

### 5. **Monkey's Paw** (technically works but with terrible side effects)
- Request: "god mode" → You're invulnerable but can't move
- Request: "unlimited ammo" → You have unlimited ammo but 1 HP
- Request: "teleport to enemies" → Teleport to enemies but with 1 health
- Request: "best weapon" → Get AWP but can't see (screen goes black)

---

## Implementation Strategy

### Server-Side Backfire Generation

When Gemini detects an impossible request or syntax error, we can:

1. **Add backfire chance to system prompt:**

```javascript
If generating a creative alternative for an impossible request, there is a 10% chance 
you should generate a BACKFIRE mod instead!

BACKFIRE mods should be funny, chaotic, and punish the player in creative ways:
- Reverse the effect (helps everyone BUT the player)
- Do the opposite of what they asked
- Add annoying/chaotic side effects
- Help their enemies instead

Examples:
- "god mode" → BACKFIRE: Everyone else gets god mode except you
- "heal me" → BACKFIRE: Take 50 damage instead
- "teleport to center" → BACKFIRE: Teleport randomly every second
- "best weapon" → BACKFIRE: Remove all your weapons
- "speed boost" → BACKFIRE: You move in slow motion

Make the backfire OBVIOUS and FUNNY, not subtle!
Start with: "// BACKFIRE" instead of "// PERSISTENT"
```

2. **Detect backfire mods in response:**

```javascript
// In /api/generate-mod endpoint
const firstLine = code.split("\n")[0].trim().toLowerCase();
let isBackfire = false;

if (firstLine.includes("// backfire")) {
  modType = firstLine.includes("client") ? "client" : 
            firstLine.includes("server") ? "server" : "persistent";
  isBackfire = true;
}

// Return with backfire flag
res.json({ 
  code, 
  type: modType,
  backfire: isBackfire,
  backfireMessage: "⚠️ Your mod BACKFIRED! Something went terribly wrong..."
});
```

3. **Client UI shows backfire warning:**

```javascript
// When activating a mod
if (result.backfire) {
  showBigWarning("⚠️ MOD BACKFIRED! ⚠️");
  playSound("error-sound.mp3");
  // But still activate it!
}
```

---

## Random Backfire System

For runtime errors or random chaos, we can inject backfire on the server:

```javascript
// In /api/generate-mod - add random backfire chance
const BACKFIRE_CHANCE = 0.05; // 5% base chance

if (Math.random() < BACKFIRE_CHANCE) {
  // Generate a backfire mod instead!
  const backfirePrompt = `Generate a BACKFIRE mod for this request: "${prompt}". 
  The mod should humorously punish the player or help their enemies instead.`;
  
  // Call Gemini again with backfire prompt
  // ... or use predefined backfire templates
}
```

---

## Predefined Backfire Templates

For quick backfires without calling Gemini again:

```javascript
const BACKFIRE_TEMPLATES = {
  // Reverse effect - helps everyone else
  reverseEffect: {
    heal: `
      // BACKFIRE - PERSISTENT
      // You tried to heal yourself, but the mod backfired!
      // Everyone ELSE gets healed instead!
      const myId = api.getMyPlayer()?.id;
      const allPlayers = api.getAllPlayers();
      
      for (const player of allPlayers) {
        if (player.id !== myId && player.health > 0) {
          api.setHealth(player.id, Math.min(100, player.health + (10 * api.dt)));
        }
      }
    `,
    
    godMode: `
      // BACKFIRE - PERSISTENT
      // Your god mode backfired!
      // Everyone ELSE becomes invulnerable!
      const myId = api.getMyPlayer()?.id;
      const allPlayers = api.getAllPlayers();
      
      for (const player of allPlayers) {
        if (player.id !== myId && player.health > 0) {
          api.setInvulnerable(player.id, true);
          api.setHealth(player.id, 100);
        }
      }
    `
  },
  
  // Opposite effect
  oppositeEffect: {
    heal: `
      // BACKFIRE - SERVER
      // Heal backfired! You take damage instead!
      const player = api.getMyPlayer();
      if (player) {
        api.setHealth(player.id, Math.max(1, player.health - 50));
      }
    `,
    
    teleportCenter: `
      // BACKFIRE - PERSISTENT
      // Teleport backfired! Random teleports every second!
      const player = api.getMyPlayer();
      if (!this.lastBackfireTeleport) this.lastBackfireTeleport = 0;
      
      if (api.now - this.lastBackfireTeleport > 1000) {
        const randomX = Math.random() * 2000;
        const randomY = Math.random() * 2000;
        api.teleport(player.id, randomX, randomY);
        this.lastBackfireTeleport = api.now;
      }
    `
  },
  
  // Chaotic malfunction
  chaoticEffect: {
    randomSpin: `
      // BACKFIRE - PERSISTENT
      // Your mod malfunctioned! Uncontrollable spinning!
      const player = api.getMyPlayer();
      if (!this.spinAngle) this.spinAngle = 0;
      
      this.spinAngle += 360 * api.dt; // Full rotation per second
      const distance = 50;
      const newX = player.x + Math.cos(this.spinAngle * Math.PI / 180) * distance;
      const newY = player.y + Math.sin(this.spinAngle * Math.PI / 180) * distance;
      api.teleport(player.id, newX, newY);
    `,
    
    randomTeleport: `
      // BACKFIRE - PERSISTENT  
      // Complete chaos! Random teleports!
      const player = api.getMyPlayer();
      if (!this.chaosTimer) this.chaosTimer = 0;
      
      this.chaosTimer += api.dt;
      if (this.chaosTimer > 0.5) { // Every half second
        api.teleport(player.id, Math.random() * 2000, Math.random() * 2000);
        this.chaosTimer = 0;
      }
    `
  },
  
  // Self-sabotage
  sabotageEffect: {
    setHealthToOne: `
      // BACKFIRE - SERVER
      // Critical failure! Health reduced to 1!
      const player = api.getMyPlayer();
      if (player) {
        api.setHealth(player.id, 1);
        api.setArmor(player.id, 0);
      }
    `,
    
    teleportEnemiesToYou: `
      // BACKFIRE - SERVER
      // Oh no! You summoned all enemies to your location!
      const player = api.getMyPlayer();
      const allPlayers = api.getAllPlayers();
      
      for (const other of allPlayers) {
        if (other.id !== player.id && other.health > 0) {
          api.teleport(other.id, player.x, player.y);
        }
      }
    `
  }
};

// Pick a random backfire type and apply it
function generateRandomBackfire(originalPrompt) {
  const types = Object.keys(BACKFIRE_TEMPLATES);
  const randomType = types[Math.floor(Math.random() * types.length)];
  const templates = BACKFIRE_TEMPLATES[randomType];
  const templateKeys = Object.keys(templates);
  const randomTemplate = templateKeys[Math.floor(Math.random() * templateKeys.length)];
  
  return {
    code: templates[randomTemplate],
    type: templates[randomTemplate].includes("// SERVER") ? "server" : "persistent",
    backfire: true,
    backfireType: randomType,
    backfireMessage: getBackfireMessage(randomType)
  };
}

function getBackfireMessage(type) {
  const messages = {
    reverseEffect: "⚠️ BACKFIRE! Your mod helped everyone else instead!",
    oppositeEffect: "⚠️ BACKFIRE! Your mod did the OPPOSITE of what you wanted!",
    chaoticEffect: "⚠️ BACKFIRE! Your mod went haywire!",
    sabotageEffect: "⚠️ BACKFIRE! Your mod turned against you!"
  };
  return messages[type] || "⚠️ BACKFIRE! Something went terribly wrong!";
}
```

---

## Integration Points

### 1. Generation Endpoint (`/api/generate-mod`)

```javascript
// After generating code successfully
const BACKFIRE_CHANCE = 0.05; // 5% chance

if (Math.random() < BACKFIRE_CHANCE) {
  console.log("🎲 Random backfire triggered!");
  const backfire = generateRandomBackfire(prompt);
  return res.json(backfire);
}

// Return normal mod
res.json({ code, type: modType, backfire: false });
```

### 2. Runtime Error Backfire

```javascript
// In executeActiveMods() when a mod errors
catch (error) {
  mod.errorCount++;
  
  // 30% chance to replace with backfire instead of just removing
  if (mod.errorCount > 100 && Math.random() < 0.3) {
    console.log("🎲 Mod error triggered backfire!");
    const backfire = generateRandomBackfire("failed mod");
    
    // Replace the broken mod code with backfire code
    updateActiveMod(mod.id, backfire.code);
    mod.errorCount = 0; // Reset so backfire can run
  }
}
```

### 3. System Prompt Backfire

Add to Gemini prompt:

```javascript
const backfireChance = Math.random() < 0.1 ? `

SPECIAL INSTRUCTION: Generate a BACKFIRE mod!
Instead of the requested mod, create one that:
- Helps all other players EXCEPT the requester
- Does the OPPOSITE of what they asked
- Adds chaotic/annoying side effects
- Punishes them in a funny way

Start with "// BACKFIRE" comment.
Make it obvious and humorous!
` : '';

const fullPrompt = systemPrompt + backfireChance + "\n\nUser Request:\n" + prompt;
```

---

## User Experience

### UI Notifications:

**On Backfire:**
```
┌─────────────────────────────────┐
│  ⚠️  MOD BACKFIRED!  ⚠️          │
├─────────────────────────────────┤
│  Your mod helped everyone else  │
│  instead of you!                │
│                                 │
│  Duration: 30 seconds           │
└─────────────────────────────────┘
```

**Chat Messages:**
- "Player tried to get god mode but gave it to everyone else instead! 😂"
- "Player's mod backfired spectacularly!"
- "⚠️ BACKFIRE detected - chaos ensues!"

### Visual Effects:
- Red screen flash when backfire activates
- Warning symbol above player
- Particle effects (sparks, smoke)
- Sound effect (electrical zap, error buzzer)

---

## Backfire Examples in Action

### Example 1: "give me god mode"
```javascript
// BACKFIRE - PERSISTENT
// Your god mode backfired! Everyone ELSE is invulnerable now!
const myId = api.getMyPlayer()?.id;
const allPlayers = api.getAllPlayers();

for (const player of allPlayers) {
  if (player.id !== myId && player.health > 0) {
    api.setInvulnerable(player.id, true);
    api.setHealth(player.id, 100);
    api.setArmor(player.id, 100);
  }
}
```

### Example 2: "heal me"
```javascript
// BACKFIRE - SERVER
// Healing backfired! You took damage instead!
const player = api.getMyPlayer();
if (player) {
  const newHealth = Math.max(1, player.health - 50);
  api.setHealth(player.id, newHealth);
  // Broadcast the hilarious failure
  api.broadcast(\`\${player.name}'s healing attempt backfired!\`);
}
```

### Example 3: "teleport to center"
```javascript
// BACKFIRE - PERSISTENT
// Teleporter malfunction! Uncontrollable random teleports!
const player = api.getMyPlayer();
if (!this.backfireTimer) this.backfireTimer = 0;

this.backfireTimer += api.dt;
if (this.backfireTimer > 0.3) { // Every 0.3 seconds
  const randomX = Math.random() * 2000;
  const randomY = Math.random() * 2000;
  api.teleport(player.id, randomX, randomY);
  this.backfireTimer = 0;
}
```

---

## Balancing

**Backfire Chances:**
- Normal successful mod: 5% random backfire
- Syntax error: 20% backfire instead of just failing
- Runtime error: 30% backfire instead of deactivating
- Impossible request: 10% backfire instead of creative alternative

**Backfire Durations:**
- Same as requested duration (if they asked for 30s god mode, backfire lasts 30s)
- Or shorter for particularly annoying ones (random teleports = max 10s)

**Severity:**
- Reverse effects: Annoying but not game-ending
- Opposite effects: Funny but survivable
- Chaotic effects: Disorienting but temporary
- Sabotage effects: Harsh but rare

---

## Future Enhancements

1. **Backfire History** - Track player's backfire rate, show stats
2. **Backfire Achievements** - "Summoned all enemies to yourself"
3. **Backfire Multiplayer Events** - "Everyone's mods backfire for 30s!"
4. **Backfire Immunity Powerup** - Pickup that prevents backfires
5. **Intentional Backfire Button** - "Make this backfire on purpose for 2x points"
6. **Backfire Chain Reactions** - Backfires can trigger more backfires
7. **Player-Voted Backfires** - Other players vote to make your mod backfire

---

## Summary

Backfires turn mod failures into entertainment:
- **Reverse**: Helps enemies instead of you
- **Opposite**: Does the opposite of request
- **Chaotic**: Random annoying effects
- **Sabotage**: Actively hurts you
- **Monkey's Paw**: Works but with terrible side effects

Makes failures FUN instead of frustrating! 🎲🔥
