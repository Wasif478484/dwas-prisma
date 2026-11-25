// Spec §5.1: "Provider interface so the model can be swapped by environment
// variable." In this environment the provider is the z-ai SDK (server side
// only). If the SDK is unavailable the intake falls back to keyword rules —
// spec D01 requires the fallback path to always exist.

export interface LLMClient {
  call(system: string, user: string): Promise<string>;
}

export function getLLMClient(): LLMClient | null {
  return {
    async call(system: string, user: string): Promise<string> {
      const { default: ZAI } = await import("z-ai-web-dev-sdk");
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content || !content.trim()) throw new Error("llm_empty_response");
      return content;
    },
  };
}
