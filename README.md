# Gold Loan Intake Portal with AI Agent

A production-minded gold-loan intake portal featuring exact financial calculations, schema validation, 7-day lead de-duplication, and an AI Loan Assistant that invokes backend tools rather than guessing calculations.

## Quickstart

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup Database & Seed Loan Schemes
```bash
npm run seed --prefix server
```

### 3. Run Automated Tests (Math, API & 5 Agent Conversations)
```bash
npm test
```

### 4. Run Development Server (Both Frontend & Backend)
```bash
npm run dev
```

- **Frontend Portal**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## Architectural Highlights
- **Exact Money Math**: All values stored in whole rupees with zero floating-point inaccuracies; eligible loan enforces `floor(goldValue * min(maxLtv, 0.75))`.
- **API Discipline**: Strict Zod schema validation returning uniform JSON errors `{ error: { code, message, fields } }`.
- **Duplicate Prevention**: Rejects duplicate applications from the same mobile number within 7 days with `409 Conflict` and the existing application ID.
- **Data Privacy**: All mobile numbers in lead queries are masked as `9876XXXX10`.
- **AI Agent Guardrails**: AI chat calls backend tools (`get_loan_schemes`, `calculate_quote`, `submit_application`) and declines off-topic investment or crypto queries.

## What I would Do With More Time
- Implement Redis distributed locking for concurrent duplicate submissions.
- Live gold rate API integration with a cached fallback.
- Streamed SSE responses for the AI assistant with status chips.
