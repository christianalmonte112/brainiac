import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), upsert: vi.fn(), update: vi.fn(), ai: vi.fn(), limit: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { readingSession: { findFirst: m.find }, writtenCheck: { upsert: m.upsert, updateMany: m.update } } }));
vi.mock("@/lib/ai/client", () => ({ getAnthropic: () => ({ messages: { create: m.ai } }) }));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: m.limit }));
vi.mock("@/lib/written-check/schema", () => import("../../../lib/written-check/schema"));
import { POST } from "./route";
const answers = ["Main idea", "Evidence", "Inference"];
const result = { results: answers.map(() => ({ score: 80, needsClarification: false, feedback: "Supported." })) };
const request = () => new Request("http://localhost/api/written-check", { method: "POST", body: JSON.stringify({ sessionId: "s", answers }) });
beforeEach(() => {
 vi.resetAllMocks(); m.auth.mockResolvedValue({ userId: "u" }); m.find.mockResolvedValue({ sourceText: "Passage" });
 m.upsert.mockResolvedValue({ id: "c", status: "SAVED", answers, updatedAt: new Date(0) });
 m.update.mockResolvedValue({ count: 1 }); m.limit.mockResolvedValue(null);
 m.ai.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(result) }] });
});
it("rejects a session owned by someone else before saving or grading", async () => {
 m.find.mockResolvedValue(null); expect((await POST(request())).status).toBe(404); expect(m.upsert).not.toHaveBeenCalled(); expect(m.ai).not.toHaveBeenCalled();
});
it("saves answers before AI grading and persists the returned result", async () => {
 expect((await POST(request())).status).toBe(200);
 expect(m.update.mock.invocationCallOrder[0]).toBeLessThan(m.ai.mock.invocationCallOrder[0]);
 expect(m.update.mock.calls[0][0].data.answers).toEqual(answers);
 expect(m.update.mock.calls[1][0].data.result).toEqual(result);
});
it("reuses a saved result when the same request is retried", async () => {
 m.upsert.mockResolvedValue({ status: "GRADED", answers, result });
 expect((await (await POST(request())).json()).result).toEqual(result); expect(m.ai).not.toHaveBeenCalled();
});
it("retains saved answers without a fake grade when AI fails", async () => {
 m.ai.mockRejectedValue(new Error("offline")); const response = await POST(request());
 expect(response.status).toBe(503); expect((await response.json()).saved).toBe(true);
 expect(m.update.mock.calls[1][0].data).toEqual({ status: "SAVED" });
});
it("does not start a second grader while the first is running", async () => {
 m.upsert.mockResolvedValue({ status: "GRADING", updatedAt: new Date() });
 expect((await POST(request())).status).toBe(409); expect(m.ai).not.toHaveBeenCalled();
});
