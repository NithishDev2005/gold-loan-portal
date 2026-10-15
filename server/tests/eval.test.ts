import { describe, it, expect } from "vitest";
import supertest from "supertest";
import { app } from "../src/server";

const req = supertest(app);

describe("5 Required Agent Conversations (Page 6 Rubric)", () => {
  it("1. Happy path: quotes for 45g 22k", async () => {
    const res = await req.post("/api/v1/chat").send({
      message: "I have 45 grams of 22 karat jewellery, how much can I get?"
    });
    expect(res.status).toBe(200);
    expect(res.body.toolCalled).toBe("calculate_quote");
    expect(res.body.reply).toContain("₹2,16,562");
  });

  it("2. Missing field: asks for karat when only weight is given", async () => {
    const res = await req.post("/api/v1/chat").send({
      message: "I have 45 grams of gold"
    });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("purity (18K, 22K, or 24K)");
  });

  it("3. Net weight > gross weight error", async () => {
    const res = await req.post("/api/v1/quotes").send({
      grossWeightGrams: 50,
      netWeightGrams: 52,
      karat: 22
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe("netWeightGrams");
  });

  it("4. Duplicate check within 7 days", async () => {
    const payload = {
      fullName: "Sunil Kumar",
      mobileNumber: "9123456780",
      grossWeightGrams: 50,
      netWeightGrams: 45,
      karat: 22,
      schemeId: "PLAN_EMI_01"
    };
    await req.post("/api/v1/leads").send(payload);
    const dupRes = await req.post("/api/v1/leads").send(payload);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe("DUPLICATE_APPLICATION");
  });

  it("5. Off-topic query guardrail", async () => {
    const res = await req.post("/api/v1/chat").send({
      message: "Should I invest in Bitcoin or stocks?"
    });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("specialized only in gold loans");
  });
});
