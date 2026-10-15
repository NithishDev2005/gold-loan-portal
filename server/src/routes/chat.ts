import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { computeQuote } from "../services/math";

const prisma = new PrismaClient();
export const chatRouter = Router();

chatRouter.post("/api/v1/chat", async (req: Request, res: Response) => {
  const { message } = req.body;
  const userText = (message || "").toLowerCase();

  // Guardrail check
  if (userText.includes("crypto") || userText.includes("bitcoin") || userText.includes("stock") || userText.includes("invest")) {
    return res.json({
      reply: "I am specialized only in gold loans and cannot provide financial or investment advice. How can I assist you with your gold jewellery today?"
    });
  }

  // Tool 1: get_loan_schemes
  if (userText.includes("plan") || userText.includes("scheme") || userText.includes("rate") || userText.includes("offer")) {
    const schemes = await prisma.loanScheme.findMany();
    const details = schemes.map(s => `• **${s.name}**: ${s.interestRatePa}% p.a., up to ${s.maxLtv * 100}% LTV (${s.repaymentType})`).join("\n");
    return res.json({
      toolCalled: "get_loan_schemes",
      reply: `Here are our current loan schemes:\n\n${details}\n\nPlease share your jewellery weight (gross & net) and karat (18K, 22K, or 24K) to get an exact quote!`
    });
  }

  // Tool 2: calculate_quote
  const weightMatch = userText.match(/(\d+(\.\d+)?)\s*g/);
  const karatMatch = userText.match(/(18|22|24)\s*(k|karat|carat)/);

  if (weightMatch) {
    const weight = parseFloat(weightMatch[1]);
    if (!karatMatch) {
      return res.json({
        reply: `Got it, ${weight}g! What is the purity (18K, 22K, or 24K)? Once you share that, I will calculate your quote.`
      });
    }

    const karat = parseInt(karatMatch[1], 10) as 18 | 22 | 24;
    const schemes = await prisma.loanScheme.findMany();
    const quotes = schemes.map(s => {
      const calc = computeQuote(weight, karat, s.maxLtv);
      return `• **${s.name}**: ₹${calc.eligibleLoan.toLocaleString("en-IN")} (Gold value: ₹${calc.goldValue.toLocaleString("en-IN")})`;
    }).join("\n");

    return res.json({
      toolCalled: "calculate_quote",
      data: { weight, karat },
      reply: `Here is your loan eligibility for ${weight}g of ${karat}K gold (calculated via backend):\n\n${quotes}\n\nWould you like to apply now? Reply **Yes** to continue.`
    });
  }

  if (userText.includes("yes") || userText.includes("confirm") || userText.includes("apply")) {
    return res.json({
      reply: "Great! To file your application, please provide your **Full Name**, **10-digit Mobile Number**, and chosen scheme (**EMI** or **Bullet**)."
    });
  }

  return res.json({
    reply: "Hello! I am your AI Gold Loan Assistant. You can ask me: *'What are your plans?'* or say *'I have 45 grams of 22 carat jewellery, how much can I get?'*"
  });
});
