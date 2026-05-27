/**
 * Lazily-initialized Anthropic client.
 * Isolated into its own module so tests can mock the whole module cleanly
 * without fighting CJS/ESM interop on @anthropic-ai/sdk.
 */
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
    }
    _client = new Anthropic();
  }
  return _client;
}

/** Reset cached client — used in tests to force re-initialisation. */
export function resetAnthropicClient(): void {
  _client = null;
}
