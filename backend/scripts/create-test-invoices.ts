import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("Missing or non-test STRIPE_SECRET_KEY. Set it in .env");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

interface PlanConfig {
  description: string;
  amount: number;
  seatAmount: number;
  seats: number;
}

const PLANS: PlanConfig[] = [
  {
    description: "Starter Plan (Monthly)",
    amount: 5000,
    seatAmount: 2500,
    seats: 2,
  },
  {
    description: "Starter Plan (Yearly)",
    amount: 50000,
    seatAmount: 25000,
    seats: 2,
  },
  {
    description: "Professional Plan (Monthly)",
    amount: 7500,
    seatAmount: 2500,
    seats: 3,
  },
  {
    description: "Professional Plan (Yearly)",
    amount: 75000,
    seatAmount: 25000,
    seats: 3,
  },
  {
    description: "Enterprise Plan (Monthly)",
    amount: 15000,
    seatAmount: 2500,
    seats: 5,
  },
  {
    description: "Enterprise Plan (Yearly)",
    amount: 150000,
    seatAmount: 25000,
    seats: 5,
  },
];

async function findOrCreateCustomer(): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ limit: 1 });

  if (existing.data.length > 0) {
    console.log(`Using existing customer: ${existing.data[0].id}`);
    return existing.data[0];
  }

  const customer = await stripe.customers.create({
    name: "Ortelius Test Organization",
    email: "test@ortelius.app",
    metadata: { source: "test-script" },
  });

  console.log(`Created customer: ${customer.id}`);
  return customer;
}

async function addLineItems(
  customerId: string,
  invoiceId: string,
  plan: PlanConfig,
  extraItems?: { description: string; amount: number }[],
): Promise<void> {
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoiceId,
    amount: plan.amount,
    currency: "eur",
    description: plan.description,
  });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoiceId,
    amount: plan.seatAmount,
    currency: "eur",
    description: `Additional seats (${plan.seats} members)`,
  });

  if (extraItems) {
    for (const item of extraItems) {
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoiceId,
        amount: item.amount,
        currency: "eur",
        description: item.description,
      });
    }
  }
}

async function createInvoice(
  customerId: string,
  plan: PlanConfig,
  status: "paid" | "open" | "draft",
  extraItems?: { description: string; amount: number }[],
): Promise<void> {
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: false,
    metadata: { source: "test-script" },
  });

  await addLineItems(customerId, invoice.id, plan, extraItems);

  if (status === "draft") {
    console.log(`  DRAFT  — ${plan.description}`);
    return;
  }

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

  if (status === "paid") {
    await stripe.invoices.pay(finalized.id, { paid_out_of_band: true });
    console.log(`  PAID   — ${finalized.number} — ${plan.description}`);
    return;
  }

  console.log(`  OPEN   — ${finalized.number} — ${plan.description}`);
}

async function main() {
  console.log("\nCreating test invoices in Stripe test mode...\n");

  const customer = await findOrCreateCustomer();

  // Starter Monthly — paid
  await createInvoice(customer.id, PLANS[0], "paid");

  // Starter Yearly — paid
  await createInvoice(customer.id, PLANS[1], "paid");

  // Professional Monthly — paid
  await createInvoice(customer.id, PLANS[2], "paid");

  // Professional Yearly — paid
  await createInvoice(customer.id, PLANS[3], "paid");

  // Enterprise Monthly — open
  await createInvoice(customer.id, PLANS[4], "open");

  // Enterprise Yearly — open
  await createInvoice(customer.id, PLANS[5], "open");

  // Enterprise Monthly — draft (with proration from plan upgrade)
  await createInvoice(customer.id, PLANS[4], "draft", [
    { description: "Proration (plan upgrade from Professional)", amount: 7500 },
  ]);

  console.log(
    "\n7 invoices created: 4 paid, 2 open, 1 draft",
  );
  console.log(`Customer: ${customer.id}`);
  console.log("View: https://dashboard.stripe.com/test/invoices\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
