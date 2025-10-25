// Gemini API Client for code generation
// All API calls go through the backend - API key is never exposed to client
export class GeminiClient {
  constructor() {
    // No API key needed on client - backend handles all Gemini API calls
  }

  async generateModCode(userPrompt) {
    // Always make request through backend
    try {
      const response = await fetch("/api/generate-mod", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.code;
    } catch (error) {
      console.error("Error generating code:", error);
      throw error;
    }
  }
}
