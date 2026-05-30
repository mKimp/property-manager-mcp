/**
 * Tests for POST /api/chat — real Claude API route (Phase 2c).
 *
 * Strategy:
 *  - Mock `../chat/client.js` (our thin wrapper) so we never touch the CJS
 *    @anthropic-ai/sdk package at all. This sidesteps the CJS/ESM mock-interop
 *    issue in Vitest 4.x where factory arrow functions aren't valid constructors.
 *  - `streamMockFn` is hoisted so it exists before any module is imported.
 *  - `mockGetClient` returns a fake Anthropic instance whose only method is
 *    `messages.stream` — that's all the route handler calls.
 *  - vi.clearAllMocks() in beforeEach resets call history between tests.
 *  - The DB and executor are also mocked so no real I/O happens.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Hoisted fns — created before any module is loaded
// ---------------------------------------------------------------------------

const streamMockFn = vi.hoisted(() => vi.fn());
const mockGetClient = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../chat/client.js", () => ({
  getAnthropicClient: mockGetClient,
  resetAnthropicClient: vi.fn(),
}));

vi.mock("../services/db.js", () => ({
  getAllProperties: vi.fn(),
  getPropertyById: vi.fn(),
  saveProperty: vi.fn(),
  deleteProperty: vi.fn(),
}));

vi.mock("../chat/executor.js", () => ({
  executeTool: vi.fn().mockResolvedValue("tool result"),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { app } from "../server.js";
import { executeTool } from "../chat/executor.js";

// ---------------------------------------------------------------------------
// Stream config — mutated per test
// ---------------------------------------------------------------------------

const streamCfg = {
  textChunks: ["Hello", " world"] as string[],
  stopReason: "end_turn" as string,
  toolUseBlocks: [] as Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>,
};

function makeFakeStream() {
  const events: Array<{
    type: string;
    delta?: { type: string; text?: string };
  }> = streamCfg.textChunks.map((chunk) => ({
    type: "content_block_delta",
    delta: { type: "text_delta", text: chunk },
  }));

  const contentBlocks: Array<{
    type: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    text?: string;
  }> = [];

  if (streamCfg.textChunks.length > 0) {
    contentBlocks.push({ type: "text", text: streamCfg.textChunks.join("") });
  }
  for (const tu of streamCfg.toolUseBlocks) {
    contentBlocks.push({ type: "tool_use", id: tu.id, name: tu.name, input: tu.input });
  }

  return {
    [Symbol.asyncIterator]: async function* () {
      for (const e of events) yield e;
    },
    finalMessage: vi.fn().mockResolvedValue({
      stop_reason: streamCfg.stopReason,
      content: contentBlocks,
    }),
  };
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

function parseSseBody(raw: string): string[] {
  return raw
    .split("\n\n")
    .map((b) => b.trim())
    .filter((b) => b.startsWith("data: "))
    .map((b) => b.slice("data: ".length));
}

function assembleText(events: string[]): string {
  return events
    .filter((e) => e !== "[DONE]")
    .map((e) => (JSON.parse(e) as { t: string }).t)
    .join("");
}

const userMsg = (content: string) => ({ role: "user" as const, content });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Reset stream config
  streamCfg.textChunks = ["Hello", " world"];
  streamCfg.stopReason = "end_turn";
  streamCfg.toolUseBlocks = [];

  // Wire the fake client: getAnthropicClient() returns an object with messages.stream
  mockGetClient.mockReturnValue({ messages: { stream: streamMockFn } });

  // Wire the stream mock for this test
  streamMockFn.mockImplementation(() => makeFakeStream());

  // Restore executor default
  vi.mocked(executeTool).mockResolvedValue("tool result");

  // Ensure lazy client sees a valid key
  process.env.ANTHROPIC_API_KEY = "sk-test-fake";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/chat — Claude API SSE endpoint", () => {
  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when body is missing messages", async () => {
    const res = await request(app).post("/api/chat").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when messages is an empty array", async () => {
    const res = await request(app).post("/api/chat").send({ messages: [] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when a message has an invalid role", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "system", content: "hello" }] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when a message has an empty content string", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "" }] });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when body is not JSON", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send("not json at all");
    expect(res.status).toBe(400);
  });

  // ── Wire format ─────────────────────────────────────────────────────────────

  it("sets SSE headers", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(res.headers["cache-control"]).toBe("no-cache");
  });

  it("terminates every stream with data: [DONE]", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const events = parseSseBody(res.text);
    expect(events.at(-1)).toBe("[DONE]");
  });

  it("emits multiple data events before [DONE]", async () => {
    streamCfg.textChunks = ["chunk1", " chunk2", " chunk3"];

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const events = parseSseBody(res.text);
    expect(events.length).toBeGreaterThan(1);
  });

  it("each chunk event is valid JSON with a 't' field", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const events = parseSseBody(res.text);
    const chunks = events.filter((e) => e !== "[DONE]");

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const parsed = JSON.parse(chunk) as unknown;
      expect(parsed).toHaveProperty("t");
      expect(typeof (parsed as { t: unknown }).t).toBe("string");
    }
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("streams Claude text chunks and assembles them correctly", async () => {
    streamCfg.textChunks = ["Hi! ", "How can I help?"];

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text).toBe("Hi! How can I help?");
  });

  it("passes the full conversation history to Claude", async () => {
    await request(app)
      .post("/api/chat")
      .send({
        messages: [
          userMsg("first message"),
          { role: "assistant" as const, content: "first reply" },
          userMsg("second message"),
        ],
      });

    expect(streamMockFn).toHaveBeenCalled();
    const callArgs = streamMockFn.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    // 2 prepended (date context + assistant ack) + 3 conversation = 5
    expect(callArgs.messages).toHaveLength(5);
    expect(callArgs.messages[4].content).toBe("second message");
  });

  it("uses claude-haiku-4-5-20251001 as the model", async () => {
    await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const callArgs = streamMockFn.mock.calls[0][0] as { model: string };
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
  });

  it("sends the system prompt and tools array to Claude", async () => {
    await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const callArgs = streamMockFn.mock.calls[0][0] as {
      system: unknown;
      tools: unknown[];
    };
    expect(Array.isArray(callArgs.system)).toBe(true);
    expect(callArgs.tools.length).toBeGreaterThan(0);
  });

  // ── Tool call round-trip ────────────────────────────────────────────────────

  it("executes a tool_use block and loops back to Claude for the final answer", async () => {
    let callCount = 0;

    streamMockFn.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        // First turn: Claude requests a tool
        return {
          [Symbol.asyncIterator]: async function* () {
            /* no text on tool-use turn */
          },
          finalMessage: vi.fn().mockResolvedValue({
            stop_reason: "tool_use",
            content: [
              {
                type: "tool_use",
                id: "tu_001",
                name: "property_list_all",
                input: {},
              },
            ],
          }),
        };
      }

      // Second turn: Claude gives the final text answer
      return {
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "You have 4 properties." },
          };
        },
        finalMessage: vi.fn().mockResolvedValue({
          stop_reason: "end_turn",
          content: [{ type: "text", text: "You have 4 properties." }],
        }),
      };
    });

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("list all properties")] });

    expect(executeTool).toHaveBeenCalledWith("property_list_all", {});

    const text = assembleText(parseSseBody(res.text));
    expect(text).toContain("4 properties");

    // stream() called twice — once for tool turn, once for final answer
    expect(streamMockFn).toHaveBeenCalledTimes(2);
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it("still sends [DONE] even when Claude API throws", async () => {
    streamMockFn.mockImplementation(() => {
      throw new Error("API rate limit exceeded");
    });

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const events = parseSseBody(res.text);
    expect(events.at(-1)).toBe("[DONE]");

    const text = assembleText(events);
    expect(text).toContain("Error");
    expect(text).toContain("rate limit");
  });

  it("still sends [DONE] when the stream iterator throws mid-stream", async () => {
    streamMockFn.mockImplementation(() => ({
      [Symbol.asyncIterator]: async function* () {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Partial" },
        };
        throw new Error("Stream interrupted");
      },
      finalMessage: vi.fn(),
    }));

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const events = parseSseBody(res.text);
    expect(events.at(-1)).toBe("[DONE]");

    const text = assembleText(events);
    expect(text).toContain("Error");
  });
});
