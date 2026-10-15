import { describe, it, expect, beforeAll } from "vitest";
import supertest from "supertest";
import { app, prisma } from "../src/server";
import { computeQuote } from "../src/services/math";

const req = supertest(app);

describe("PDF Test Cases 1 - 6", () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.lead.deleteMany();
  });

  it("Case 1: 45 g net · 22K · EMI -> pure 41.25g, value ₹2,88,750, loan ₹2,16,562", () => {
    const result = computeQuote(45, 22, 0.75);
    expect(result.pureGoldGrams).toBe(41.25);
    expect(result.goldValue).toBe(288750);
    expect(result.eligibleLoan).toBe(216562);
  });

  it("Case 2: 45 g net · 22K · Bullet -> value ₹2,88,750, loan ₹2,02,125", () => {
    const result = computeQuote(45, 22, 0.70);
    expect(result.goldValue).toBe(288750);
    expect(result.eligibleLoan).toBe(202125);
  });

  it("Case 3: 10 g net · 18K · EMI -> pure 7.5g, value ₹52,500, loan ₹39,375", () => {
    const result = computeQuote(10, 18, 0.75);
    expect(result.pureGoldGrams).toBe(7.5);
    expect(result.goldValue).toBe(52500);
    expect(result.eligibleLoan).toBe(39375);
  });

  it("Case 4: net 52g > gross 50g -> 400 with field error on netWeightGrams", async () => {
    const res = await req.post("/api/v1/quotes").send({
      grossWeightGrams: 50,
      netWeightGrams: 52,
      karat: 22
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe("netWeightGrams");
  });

  it("Case 5: mobile 5876543210 -> 400 with field error on mobileNumber", async () => {
    const res = await req.post("/api/v1/leads").send({
      fullName: "Vikram Rao",
      mobileNumber: "5876543210",
      grossWeightGrams: 50,
      netWeightGrams: 45,
      karat: 22,
      schemeId: "PLAN_EMI_01"
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe("mobileNumber");
  });

  it("Case 6: duplicate mobile within 7 days -> 409 Conflict", async () => {
    const payload = {
      fullName: "Anita Roy",
      mobileNumber: "9988776655",
      grossWeightGrams: 50,
      netWeightGrams: 45,
      karat: 22,
      schemeId: "PLAN_EMI_01"
    };

    const first = await req.post("/api/v1/leads").send(payload);
    expect(first.status).toBe(201);

    const second = await req.post("/api/v1/leads").send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("DUPLICATE_APPLICATION");
  });
});
