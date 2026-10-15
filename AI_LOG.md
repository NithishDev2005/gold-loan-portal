# AI Log (TGlobal Full-Stack & AI Assignment)

### 1. AI Tools Used
- **GitHub Copilot & Claude Code**: Used for project scaffolding, Zod schema validation, exact math implementation, and conversation evaluation tests.

### 2. Two Exact Prompts Used
- **Prompt 1 (Validation Schemas):**
  > "Create a TypeScript Zod validation schema for an Indian gold loan intake portal. The schema must enforce: Full Name (2-60 letters & spaces only), Indian 10-digit mobile number starting with 6-9, weights where 0 < net <= gross <= 1000g, and karat strictly one of 18, 22, or 24. Ensure the error response body follows { error: { code, message, fields } }."

- **Prompt 2 (AI Agent Tools & Guardrails):**
  > "Design 3 typed function calling tools for an AI gold loan assistant: get_loan_schemes(), calculate_quote(net, gross, karat), and submit_application(payload). Enforce strict guardrails: the LLM must NEVER perform financial arithmetic in text, must always call calculate_quote, and must decline off-topic investment or crypto queries."

### 3. One Place the AI Got It Wrong, How It Was Caught, and the Test
- **The Mistake:**
  The AI originally wrote the eligible loan formula using standard rounding `Math.round(goldValue * maxLtv)`. For Test Case 1 (`45g net · 22K · EMI`), this returned `₹2,16,563` instead of the mandated integer floor `₹2,16,562`.
- **How It Was Caught:**
  The unit test for Case 1 in `server/tests/api.test.ts` failed when asserting `expect(result.eligibleLoan).toBe(216562)`.
- **The Catching Test & Fix:**
  ```typescript
  it("Case 1: 45 g net · 22K · EMI -> loan ₹2,16,562", () => {
    const result = computeQuote(45, 22, 0.75);
    expect(result.eligibleLoan).toBe(216562);
  });
  ```
  The code was corrected to use `Math.floor(goldValue * Math.min(plan.maxLtv, 0.75))` ensuring LTV is strictly enforced and rounded down to whole rupees.
