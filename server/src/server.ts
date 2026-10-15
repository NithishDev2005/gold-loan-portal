import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { quoteSchema, leadSchema } from "./schemas/loan";
import { computeQuote } from "./services/math";
import { chatRouter } from "./routes/chat";

export const prisma = new PrismaClient();
export const app = express();

app.use(cors());
app.use(express.json());
app.use(chatRouter);

// 1. GET /api/v1/loan-schemes
app.get("/api/v1/loan-schemes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schemes = await prisma.loanScheme.findMany();
    res.json(schemes);
  } catch (err) { next(err); }
});

// 2. POST /api/v1/quotes
app.post("/api/v1/quotes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = quoteSchema.parse(req.body);
    const schemes = await prisma.loanScheme.findMany();

    const quotes = schemes.map(scheme => {
      const calc = computeQuote(parsed.netWeightGrams, parsed.karat, scheme.maxLtv);
      return {
        schemeId: scheme.id,
        schemeName: scheme.name,
        interestRatePa: scheme.interestRatePa,
        maxLtv: scheme.maxLtv,
        tenureMonths: scheme.tenureMonths,
        pureGoldGrams: calc.pureGoldGrams,
        goldValue: calc.goldValue,
        eligibleLoan: calc.eligibleLoan
      };
    });

    res.json({ quotes });
  } catch (err) { next(err); }
});

// 3. POST /api/v1/leads
app.post("/api/v1/leads", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = leadSchema.parse(req.body);

    const scheme = await prisma.loanScheme.findUnique({ where: { id: parsed.schemeId } });
    if (!scheme) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Loan scheme not found", fields: [] }
      });
    }

    // 7-day duplicate check
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existing = await prisma.lead.findFirst({
      where: {
        mobileNumber: parsed.mobileNumber,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: "desc" }
    });

    if (existing) {
      const dateStr = existing.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return res.status(409).json({
        error: {
          code: "DUPLICATE_APPLICATION",
          message: `You already applied on ${dateStr}, application ${existing.id}`,
          existingApplicationId: existing.id
        }
      });
    }

    // Server-side recalculation
    const calc = computeQuote(parsed.netWeightGrams, parsed.karat, scheme.maxLtv);
    const appId = `GL-${Math.floor(1000 + Math.random() * 9000)}`;

    const newLead = await prisma.lead.create({
      data: {
        id: appId,
        fullName: parsed.fullName,
        mobileNumber: parsed.mobileNumber,
        grossWeightGrams: parsed.grossWeightGrams,
        netWeightGrams: parsed.netWeightGrams,
        karat: parsed.karat,
        schemeId: parsed.schemeId,
        goldValue: calc.goldValue,
        eligibleLoan: calc.eligibleLoan,
        status: "SUBMITTED"
      }
    });

    res.status(201).json({ applicationId: newLead.id, status: newLead.status });
  } catch (err) { next(err); }
});

// 4. GET /api/v1/leads (Masked mobile)
app.get("/api/v1/leads", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
    const masked = leads.map(l => ({
      ...l,
      mobileNumber: l.mobileNumber.replace(/^(\d{4})\d{4}(\d{2})$/, "$1XXXX$2")
    }));
    res.json(masked);
  } catch (err) { next(err); }
});

// Uniform error contract
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const issues = err.issues || err.errors;
  if (err.name === "ZodError" || issues) {
    const fields = (issues || []).map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
      message: e.message
    }));
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        fields: fields.length > 0 ? fields : [{ field: "general", message: err.message }]
      }
    });
  }

  res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", fields: [] }
  });
});
