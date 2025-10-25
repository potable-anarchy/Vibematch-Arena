// Gemini API Client for code generation
export class GeminiClient {
  constructor(apiKey = null) {
    // If no API key provided, we'll use environment variable or config
    this.apiKey = apiKey || this.getApiKey();
    this.apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
  }

  getApiKey() {
    // Try to get API key from various sources
    // In production, this should come from a secure backend endpoint
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
    // For now, return null - will be provided by backend
    return null;
  }

  async generateModCode(userPrompt) {
    if (!this.apiKey) {
      // If no API key, make request through backend proxy
      return this.generateViaBackend(userPrompt);
    }

    const systemPrompt = this.buildSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nUser Request:\n${userPrompt}`;

    try {
      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      return this.extractCode(generatedText);

    } catch (error) {
      console.error('Error generating code with Gemini:', error);
      throw error;
    }
  }

  async generateViaBackend(userPrompt) {
    // Make request through backend proxy endpoint
    try {
      const response = await fetch('/api/generate-mod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: this.buildSystemPrompt()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();
      return data.code;

    } catch (error) {
      console.error('Error generating code via backend:', error);
      throw error;
    }
  }

  buildSystemPrompt() {
    return `You are an expert JavaScript game modding assistant. Your task is to generate safe, working mod code for a 2D browser-based game.

IMPORTANT CONTEXT:
- The game uses a mod system with specific hooks and APIs
- Mods are written in JavaScript and executed in a sandboxed environment
- All mod code MUST use the provided modContext and registerHook APIs

AVAILABLE HOOKS (use registerHook to subscribe):
- onPlayerDraw(player, ctx) - Called when drawing the player
- onHit(player, target) - Called when player hits an enemy
- onKill(player, target) - Called when player kills an enemy
- onPickup(player, item) - Called when player picks up an item
- onShoot(player, bullet) - Called when player shoots
- onUpdate(player, deltaTime) - Called every game frame
- onRender(ctx, player) - Called during render phase

MODCONTEXT API (available in all hooks):
- modContext.player - The player object with properties:
  - x, y - position
  - vx, vy - velocity
  - health, maxHealth
  - weapons - array of weapons
  - inventory - items
- modContext.enemies - array of all enemies
- modContext.bullets - array of all bullets
- modContext.items - array of all pickup items
- modContext.canvas - the game canvas
- modContext.ctx - the 2D rendering context

CODING RULES:
1. ALWAYS use registerHook() to register event handlers
2. DO NOT use eval(), Function constructor, or dynamic code execution
3. DO NOT use import/require statements
4. Keep code simple and focused on the requested feature
5. Include error handling where appropriate
6. Add helpful comments explaining what the code does
7. Only generate the mod code itself, no explanations outside code comments

EXAMPLE MOD STRUCTURE:
\`\`\`javascript
// Mod: [Description]
registerHook("onUpdate", (player, deltaTime) => {
  // Your code here
  console.log("Player position:", player.x, player.y);
});

registerHook("onHit", (player, target) => {
  // Your code here
  console.log("Hit target:", target);
});
\`\`\`

OUTPUT FORMAT:
- Generate ONLY valid JavaScript code
- Wrap code in a code block if needed
- Include a brief comment at the top describing what the mod does
- Make sure the code is complete and ready to run

Now generate the mod code based on the user's request.`;
  }

  extractCode(text) {
    // Extract code from markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, return the whole text trimmed
    return text.trim();
  }
}
