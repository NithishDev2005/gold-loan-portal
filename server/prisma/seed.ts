import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.loanScheme.upsert({
    where: { id: "PLAN_BULLET_01" },
    update: {},
    create: {
      id: "PLAN_BULLET_01",
      name: "Bullet Repayment",
      interestRatePa: 12.0,
      maxLtv: 0.70,
      tenureMonths: 12,
      repaymentType: "interest + principal at maturity"
    }
  });

  await prisma.loanScheme.upsert({
    where: { id: "PLAN_EMI_01" },
    update: {},
    create: {
      id: "PLAN_EMI_01",
      name: "Monthly EMI",
      interestRatePa: 10.5,
      maxLtv: 0.75,
      tenureMonths: 12,
      repaymentType: "equal monthly instalments"
    }
  });
  console.log("Loan schemes seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
