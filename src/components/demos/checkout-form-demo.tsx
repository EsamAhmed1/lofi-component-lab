"use client";

import { useRef } from "react";
import { CheckoutForm, type CheckoutItem, type CheckoutSubmitData } from "@/components/ui/checkout-form";

const items: CheckoutItem[] = [
  {
    id: "lamp",
    name: "Halo desk lamp",
    variant: "Warm white",
    price: 89,
    quantity: 1,
    swatch: "radial-gradient(circle at 35% 30%, #fef3c7, #f59e0b 45%, #78350f)",
  },
  {
    id: "mug",
    name: "Stoneware mug",
    variant: "Sage, 350 ml",
    price: 18,
    quantity: 2,
    swatch: "linear-gradient(135deg, #bbf7d0, #4d7c0f)",
  },
  {
    id: "vinyl",
    name: "Rainy Window LP",
    variant: "Lofi beats, 12 in",
    price: 32,
    quantity: 1,
    swatch: "conic-gradient(from 30deg, #1e1b4b, #7c3aed, #ec4899, #1e1b4b)",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CheckoutFormDemo() {
  const orders = useRef(0);

  // Fake payment: nothing leaves the page. One test card is always declined.
  const submit = async (data: CheckoutSubmitData) => {
    await wait(1400);
    if (data.payment.number === "4000000000000002") {
      throw new Error("Card declined (test card 4000 0000 0000 0002). Try 4242 4242 4242 4242.");
    }
    orders.current += 1;
    return { orderId: `LF-${10480 + orders.current}` };
  };

  return (
    <div className="w-full max-w-5xl space-y-4 py-4">
      <p className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
        <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor" aria-hidden>
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-.75 4h1.5v5h-1.5zm0 6.5h1.5V14h-1.5z" />
        </svg>
        <span>
          <strong className="font-semibold">Demo checkout.</strong> Nothing is charged and no data leaves this page. Try promo code{" "}
          <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/60">LOFI10</code>.
        </span>
      </p>
      <CheckoutForm
        items={items}
        currency="USD"
        taxRate={0.08}
        promoCodes={[{ code: "LOFI10", percentOff: 10 }]}
        shippingOptions={[
          { id: "standard", label: "Standard", description: "4 to 6 business days", price: 0 },
          { id: "express", label: "Express", description: "1 to 2 business days", price: 14 },
        ]}
        onSubmit={submit}
        labels={{
          paymentHint: "Test card: 4242 4242 4242 4242, any future date, any CVC. 4000 0000 0000 0002 is declined.",
        }}
      />
    </div>
  );
}
