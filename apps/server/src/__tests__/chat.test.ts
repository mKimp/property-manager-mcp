import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../server.js";

// ---------------------------------------------------------------------------
// The mock chat route does NOT touch the DB, but server.ts imports db.ts at
// the top level. We mock it here so the Prisma client is never initialized.
// ---------------------------------------------------------------------------

vi.mock("../services/db.js", () => ({
  getAllProperties: vi.fn(),
  getPropertyById: vi.fn(),
  saveProperty: vi.fn(),
  deleteProperty: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the raw SSE body into an array of data values.
 * Each `data: <payload>\n\n` block becomes one entry.
 */
function parseSseBody(raw: string): string[] {
  return raw
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.startsWith("data: "))
    .map((block) => block.slice("data: ".length));
}

/**
 * Reassemble the streamed text from all JSON chunk events
 * (ignores the final [DONE] sentinel).
 */
function assembleText(events: string[]): string {
  return events
    .filter((e) => e !== "[DONE]")
    .map((e) => (JSON.parse(e) as { t: string }).t)
    .join("");
}

const userMsg = (content: string) => ({ role: "user" as const, content });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/chat — mock SSE endpoint", () => {
  // --- Wire format -----------------------------------------------------------

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
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("hello")] });

    const events = parseSseBody(res.text);
    // There should be text chunks plus the [DONE] sentinel
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

  it("assembled text is non-empty", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("show me all properties")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text.length).toBeGreaterThan(0);
  });

  // --- Keyword matching ------------------------------------------------------

  it("mentions Kent House when asked about kent", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("what about kent")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text.toLowerCase()).toContain("kent house");
  });

  it("mentions Portland House when asked about portland", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("tell me about portland")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text.toLowerCase()).toContain("portland house");
  });

  it("mentions repairs when asked about expenses", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("show repair expenses")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text.toLowerCase()).toContain("repair");
  });

  it("mentions utilities when asked", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("show utilities")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text.toLowerCase()).toContain("utilit");
  });

  it("shows portfolio table when asked to list all properties", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [userMsg("list all properties")] });

    const text = assembleText(parseSseBody(res.text));
    expect(text).toContain("4 properties");
    expect(text).toContain("$9,670");
  });

  it("uses only the last user message for keyword matching", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [
          userMsg("tell me about kent"),
          { role: "assistant", content: "Here is Kent House info..." },
          userMsg("now show portland"),
        ],
      });

    const text = assembleText(parseSseBody(res.text));
    // Last user message is about portland — should respond about Portland
    expect(text.toLowerCase()).toContain("portland house");
    expect(text.toLowerCase()).not.toContain("kent house");
  });

  // --- Validation ------------------------------------------------------------

  it("returns 400 when body is missing messages", async () => {
    const res = await request(app).post("/api/chat").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when messages is an empty array", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [] });
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
});
