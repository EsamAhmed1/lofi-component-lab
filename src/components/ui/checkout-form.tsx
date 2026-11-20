"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export interface CheckoutItem {
  id: string;
  name: string;
  /** Second line, e.g. size or colour. */
  variant?: string;
  /** Unit price. */
  price: number;
  quantity: number;
  /** CSS colour or gradient for the thumbnail swatch. */
  swatch?: string;
}

export interface ShippingOption {
  id: string;
  label: string;
  /** Delivery time or note, e.g. "2 to 3 business days". */
  description?: string;
  price: number;
}

export interface PromoCode {
  code: string;
  /** Percentage off the subtotal, e.g. 10. */
  percentOff?: number;
  /** Fixed amount off the subtotal. */
  amountOff?: number;
}

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export interface CheckoutSubmitData {
  email: string;
  shipping: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    optionId: string;
  };
  /** Raw card details. Hand them to your payment provider's tokenizer; never log them. */
  payment: { brand: CardBrand; number: string; name: string; expiry: string; cvc: string; last4: string };
  promoCode?: string;
  items: CheckoutItem[];
  totals: { subtotal: number; discount: number; shipping: number; tax: number; total: number; currency: string };
}

export type CheckoutSubmitResult = void | { orderId?: string };

export interface CheckoutLabels {
  form: string;
  stepShipping: string;
  stepPayment: string;
  stepReview: string;
  shippingTitle: string;
  paymentTitle: string;
  reviewTitle: string;
  email: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  delivery: string;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvc: string;
  /** Help text under the card number, e.g. a test card for demos. */
  paymentHint: string;
  toPayment: string;
  toReview: string;
  back: string;
  edit: string;
  placeOrder: string;
  placingOrder: string;
  summary: string;
  showSummary: string;
  hideSummary: string;
  emptyCart: string;
  subtotal: string;
  shipping: string;
  discount: string;
  tax: string;
  total: string;
  free: string;
  promo: string;
  promoApply: string;
  promoInvalid: string;
  promoRemove: string;
  cardHolder: string;
  expires: string;
  successTitle: string;
  /** "{email}" is replaced with the shopper's email. */
  successBody: string;
  successAction: string;
  submitError: string;
  errorRequired: string;
  errorEmail: string;
  errorCardNumber: string;
  errorExpiry: string;
  errorCvc: string;
}

export interface CheckoutFormProps {
  items: CheckoutItem[];
  /** ISO 4217 currency code. */
  currency?: string;
  /** Locale used to format money. */
  locale?: string;
  shippingOptions?: ShippingOption[];
  promoCodes?: PromoCode[];
  /** Tax as a fraction of the discounted subtotal, e.g. 0.08. */
  taxRate?: number;
  countries?: string[];
  /** Called with the order. Resolve to show the success screen, reject to show an error. */
  onSubmit?: (data: CheckoutSubmitData) => Promise<CheckoutSubmitResult>;
  labels?: Partial<CheckoutLabels>;
  /** Date used for the card expiry check. Defaults to the current date when the shopper continues. */
  today?: Date | string;
  /** Level of the step and summary headings. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_LABELS: CheckoutLabels = {
  form: "Checkout",
  stepShipping: "Shipping",
  stepPayment: "Payment",
  stepReview: "Review",
  shippingTitle: "Where should we send it?",
  paymentTitle: "Payment details",
  reviewTitle: "Review your order",
  email: "Email",
  name: "Full name",
  address: "Street address",
  city: "City",
  postalCode: "Postal code",
  country: "Country",
  delivery: "Delivery",
  cardNumber: "Card number",
  cardName: "Name on card",
  expiry: "Expiry (MM/YY)",
  cvc: "CVC",
  paymentHint: "",
  toPayment: "Continue to payment",
  toReview: "Review order",
  back: "Back",
  edit: "Edit",
  placeOrder: "Place order",
  placingOrder: "Placing order…",
  summary: "Order summary",
  showSummary: "Show order summary",
  hideSummary: "Hide order summary",
  emptyCart: "Your cart is empty.",
  subtotal: "Subtotal",
  shipping: "Shipping",
  discount: "Discount",
  tax: "Tax",
  total: "Total",
  free: "Free",
  promo: "Promo code",
  promoApply: "Apply",
  promoInvalid: "That code is not valid.",
  promoRemove: "Remove promo code",
  cardHolder: "Card holder",
  expires: "Expires",
  successTitle: "Order placed",
  successBody: "We sent a receipt to {email}.",
  successAction: "Start a new order",
  submitError: "The payment did not go through. Try again.",
  errorRequired: "This field is required.",
  errorEmail: "Enter an email like you@example.com.",
  errorCardNumber: "That card number is not valid. Check the digits.",
  errorExpiry: "Use MM/YY with a date in the future.",
  errorCvc: "Enter the security code from the back of the card.",
};

const DEFAULT_SHIPPING: ShippingOption[] = [
  { id: "standard", label: "Standard", description: "4 to 6 business days", price: 0 },
  { id: "express", label: "Express", description: "1 to 2 business days", price: 12 },
];

const DEFAULT_COUNTRIES = ["United States", "Canada", "United Kingdom", "Germany", "Australia"];

type Field =
  | "email"
  | "name"
  | "address"
  | "city"
  | "postalCode"
  | "country"
  | "cardNumber"
  | "cardName"
  | "expiry"
  | "cvc";

type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const STEP_FIELDS: Field[][] = [
  ["email", "name", "address", "city", "postalCode", "country"],
  ["cardNumber", "cardName", "expiry", "cvc"],
  [],
];

const EMPTY: Omit<Values, "country"> = {
  email: "",
  name: "",
  address: "",
  city: "",
  postalCode: "",
  cardNumber: "",
  cardName: "",
  expiry: "",
  cvc: "",
};

const BRAND_NAME: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  unknown: "Card",
};

const BRANDS: CardBrand[] = ["unknown", "visa", "mastercard", "amex"];

// Each brand has its own skin. All skins are stacked and cross-faded, since
// gradients themselves cannot transition. Text on the card is white on dark.
const SKIN: Record<CardBrand, string> = {
  unknown:
    "radial-gradient(120% 90% at 100% 0%, #52525b 0%, transparent 55%), linear-gradient(135deg, #3f3f46 0%, #18181b 60%, #27272a 100%)",
  visa: "radial-gradient(120% 90% at 100% 0%, #3b82f6 0%, transparent 55%), linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 58%, #312e81 100%)",
  mastercard:
    "radial-gradient(120% 90% at 100% 0%, #f97316 0%, transparent 52%), linear-gradient(135deg, #9a3412 0%, #1c1917 58%, #7f1d1d 100%)",
  amex: "radial-gradient(120% 90% at 100% 0%, #2dd4bf 0%, transparent 52%), linear-gradient(135deg, #0f766e 0%, #134e4a 55%, #164e63 100%)",
};

const GLOW: Record<CardBrand, string> = {
  unknown: "#71717a",
  visa: "#3b82f6",
  mastercard: "#f97316",
  amex: "#14b8a6",
};

/** Small deterministic pseudo-random number in [0, 1) (mulberry32 step). */
function rand(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const CONFETTI_COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#f43f5e"];
// Seeded, so the pieces are the same on the server and the client.
const CONFETTI = Array.from({ length: 42 }, (_, i) => {
  const angle = -Math.PI / 2 + (rand(i * 11 + 1) - 0.5) * Math.PI * 1.25;
  const dist = 120 + rand(i * 11 + 2) * 170;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist),
    spin: Math.round((rand(i * 11 + 3) - 0.5) * 900),
    w: Math.round(5 + rand(i * 11 + 4) * 5),
    h: Math.round(8 + rand(i * 11 + 5) * 7),
    delay: Math.round(rand(i * 11 + 6) * 160),
    round: rand(i * 11 + 7) > 0.72,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

export function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(5[1-5]|2(22[1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(digits)) return "mastercard";
  return "unknown";
}

const groupsFor = (brand: CardBrand) => (brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4]);
const lengthFor = (brand: CardBrand) => groupsFor(brand).reduce((a, b) => a + b, 0);
const cvcLengthFor = (brand: CardBrand) => (brand === "amex" ? 4 : 3);

function formatCardNumber(digits: string) {
  const groups = groupsFor(detectBrand(digits));
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
}

const formatExpiry = (digits: string) => (digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);

export function luhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function validateField(field: Field, values: Values, now: Date, l: CheckoutLabels): string | undefined {
  const value = values[field].trim();
  if (!value) return l.errorRequired;
  const digits = onlyDigits(value);
  switch (field) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? undefined : l.errorEmail;
    case "cardNumber": {
      const brand = detectBrand(digits);
      const okLength = brand === "unknown" ? digits.length >= 13 : digits.length === lengthFor(brand);
      return okLength && luhn(digits) ? undefined : l.errorCardNumber;
    }
    case "expiry": {
      const match = /^(\d{2})\/(\d{2})$/.exec(value);
      if (!match) return l.errorExpiry;
      const month = Number(match[1]);
      const year = 2000 + Number(match[2]);
      if (month < 1 || month > 12) return l.errorExpiry;
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth() + 1;
      return year > y || (year === y && month >= m) ? undefined : l.errorExpiry;
    }
    case "cvc":
      return digits.length === cvcLengthFor(detectBrand(onlyDigits(values.cardNumber))) ? undefined : l.errorCvc;
    default:
      return undefined;
  }
}

function validateStep(step: number, values: Values, now: Date, l: CheckoutLabels): Errors {
  const errors: Errors = {};
  for (const field of STEP_FIELDS[step] ?? []) {
    const message = validateField(field, values, now, l);
    if (message) errors[field] = message;
  }
  return errors;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function usePrefersReducedMotion() {
  const reduced = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reduced.current = query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Money that counts to its new value. Screen readers get the final value only. */
function AnimatedAmount({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const last = useRef(value);

  useEffect(() => {
    const from = last.current;
    if (from === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 650;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      const next = p >= 1 ? value : from + (value - from) * eased;
      last.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const moving = Math.abs(shown - value) > 0.004;
  return (
    <span className={cn("tabular-nums transition-colors duration-300", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-block transition-[color,transform] duration-300",
          moving && shown > value && "scale-105 text-emerald-700 dark:text-emerald-300",
        )}
      >
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

function BrandMark({ brand, size = "card" }: { brand: CardBrand; size?: "card" | "chip" }) {
  const card = size === "card";
  if (brand === "visa")
    return (
      <span className={cn("font-black italic leading-none tracking-tight", card ? "text-[8.5cqw]" : "text-[11px]")}>VISA</span>
    );
  if (brand === "mastercard")
    return (
      <svg viewBox="0 0 40 24" className={card ? "w-[14cqw]" : "w-7"} aria-hidden>
        <circle cx="14" cy="12" r="11" fill="#eb001b" />
        <circle cx="26" cy="12" r="11" fill="#f79e1b" fillOpacity="0.92" />
        <path d="M20 3.1a11 11 0 0 1 0 17.8a11 11 0 0 1 0-17.8z" fill="#ff5f00" />
      </svg>
    );
  if (brand === "amex")
    return (
      <span
        className={cn(
          "rounded-[0.25em] border border-current font-extrabold leading-none tracking-wider",
          card ? "px-[1.4cqw] py-[0.8cqw] text-[4.2cqw]" : "px-1 py-0.5 text-[9px]",
        )}
      >
        AMEX
      </span>
    );
  return (
    <span className={cn("font-semibold uppercase tracking-[0.2em] text-white/80", card ? "text-[3.4cqw]" : "text-[9px]")}>
      Card
    </span>
  );
}

function CardSkin({ brand }: { brand: CardBrand }) {
  return (
    <>
      {BRANDS.map((b) => (
        <div
          key={b}
          className="absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none"
          style={{ backgroundImage: SKIN[b], opacity: b === brand ? 1 : 0 }}
        />
      ))}
      {/* Fine guilloche rings and a glossy highlight. */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-radial-gradient(circle at 115% 120%, #fff 0 1px, transparent 1px 9px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgb(255 255 255 / 0.2) 0%, rgb(255 255 255 / 0.05) 32%, transparent 46%)",
        }}
      />
    </>
  );
}

interface CardPreviewProps {
  digits: string;
  name: string;
  expiry: string;
  cvc: string;
  flipped: boolean;
  labels: CheckoutLabels;
}

/** Decorative 3D card. Everything on it is also in the form fields, so it is aria-hidden. */
function CardPreview({ digits, name, expiry, cvc, flipped, labels }: CardPreviewProps) {
  const brand = detectBrand(digits);
  const groups = groupsFor(brand);
  const starts = groups.map((_, g) => groups.slice(0, g).reduce((a, b) => a + b, 0));

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[21rem] [perspective:1200px]">
      <div
        className="absolute inset-x-[10%] -bottom-3 h-1/2 rounded-full opacity-45 blur-2xl transition-[background-color] duration-500 dark:opacity-60"
        style={{ backgroundColor: GLOW[brand] }}
      />
      <div
        className={cn(
          "relative aspect-[1.586/1] w-full transition-transform duration-[800ms] ease-[cubic-bezier(0.34,1.45,0.5,1)] [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
          "motion-reduce:transition-none motion-reduce:[transform:none]",
        )}
      >
        {/* Front */}
        <div
          className={cn(
            "@container absolute inset-0 overflow-hidden rounded-[4.5%/7%] text-white shadow-[0_18px_40px_-14px_rgb(15_23_42/0.6),inset_0_0_0_1px_rgb(255_255_255/0.14)] backface-hidden",
            "motion-reduce:transition-opacity motion-reduce:duration-300",
            flipped && "motion-reduce:opacity-0",
          )}
        >
          <CardSkin brand={brand} />
          <div className="relative flex h-full flex-col justify-between p-[6.5cqw]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-[3cqw]">
                <div
                  className="relative aspect-[1.3/1] w-[13cqw] overflow-hidden rounded-[1.6cqw]"
                  style={{ backgroundImage: "linear-gradient(135deg, #fde68a 0%, #d4a72c 42%, #fef3c7 58%, #b7791f 100%)" }}
                >
                  <svg viewBox="0 0 26 20" className="absolute inset-0 size-full" fill="none" stroke="#7c5a17" strokeOpacity="0.55" strokeWidth="0.8">
                    <path d="M0 7h8M0 13h8M18 7h8M18 13h8M8 0v20M18 0v20M8 10h10" />
                  </svg>
                </div>
                <svg viewBox="0 0 24 24" className="w-[6cqw] text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
                </svg>
              </div>
              <BrandMark brand={brand} />
            </div>
            <div className="flex justify-between font-mono text-[6.4cqw] leading-none tracking-[0.04em] whitespace-nowrap [text-shadow:0_1px_1px_rgb(0_0_0/0.35)]">
              {groups.map((size, g) => (
                <span key={`${brand}-${g}`} className="flex">
                  {Array.from({ length: size }, (_, k) => {
                    const i = starts[g] + k;
                    const ch = digits[i];
                    return ch ? (
                      <span key={`${i}-${ch}`} className="checkout-form-digit inline-block w-[0.62em] text-center">
                        {ch}
                      </span>
                    ) : (
                      <span key={`${i}-dot`} className="inline-block w-[0.62em] text-center text-white/70">
                        •
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
            <div className="flex items-end justify-between gap-[4cqw]">
              <div className="min-w-0">
                <div className="text-[2.7cqw] uppercase tracking-[0.18em] text-white/75">{labels.cardHolder}</div>
                <div className="mt-[1cqw] truncate text-[4.2cqw] font-medium uppercase tracking-wide">{name || "Your name"}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[2.7cqw] uppercase tracking-[0.18em] text-white/75">{labels.expires}</div>
                <div className="mt-[1cqw] font-mono text-[4.2cqw]">{expiry || "MM/YY"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={cn(
            "@container absolute inset-0 overflow-hidden rounded-[4.5%/7%] text-white shadow-[0_18px_40px_-14px_rgb(15_23_42/0.6),inset_0_0_0_1px_rgb(255_255_255/0.14)] backface-hidden [transform:rotateY(180deg)]",
            "motion-reduce:[transform:none] motion-reduce:transition-opacity motion-reduce:duration-300",
            !flipped && "motion-reduce:opacity-0",
          )}
        >
          <CardSkin brand={brand} />
          <div className="relative mt-[9cqw] h-[15cqw] bg-zinc-950/90" />
          <div className="relative mx-[6.5cqw] mt-[6cqw] flex items-center gap-[2.5cqw]">
            <div
              className="h-[11cqw] flex-1 rounded-[1cqw]"
              style={{ backgroundImage: "repeating-linear-gradient(-45deg, #f4f4f5 0 4px, #e4e4e7 4px 8px)" }}
            />
            <div className="flex h-[11cqw] min-w-[15cqw] items-center justify-center rounded-[1cqw] bg-white px-[2cqw] font-mono text-[4.4cqw] italic text-zinc-900">
              {cvc || "•".repeat(cvcLengthFor(brand))}
            </div>
          </div>
          <div className="relative mx-[6.5cqw] mt-[2cqw] text-right text-[2.7cqw] uppercase tracking-[0.18em] text-white/75">{labels.cvc}</div>
          <div className="absolute bottom-[6cqw] right-[6.5cqw]">
            <BrandMark brand={brand} />
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  cn(
    "h-11 w-full min-w-0 rounded-xl border bg-surface px-3.5 text-[15px] text-foreground placeholder:text-muted transition-[border-color,box-shadow] motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid
      ? "border-red-500 shadow-[0_0_0_3px_rgb(239_68_68/0.12)] dark:border-red-400"
      : "border-border hover:border-zinc-400 focus:border-accent dark:hover:border-zinc-600",
  );

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-[0_10px_24px_-12px_var(--accent)] transition-[transform,filter] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100 motion-reduce:transition-none";

const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";

const linkButton =
  "rounded-md px-1.5 py-1 text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60";

const STYLES = `
@keyframes checkout-form-draw { to { stroke-dashoffset: 0; } }
@keyframes checkout-form-pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes checkout-form-digit { from { transform: translateY(-55%) scale(0.8); opacity: 0; filter: blur(3px); } to { transform: none; opacity: 1; filter: none; } }
.checkout-form-ring { stroke-dasharray: 1; stroke-dashoffset: 1; animation: checkout-form-draw 0.6s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
.checkout-form-tick { stroke-dasharray: 1; stroke-dashoffset: 1; animation: checkout-form-draw 0.4s 0.5s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
.checkout-form-badge { animation: checkout-form-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.checkout-form-digit { animation: checkout-form-digit 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .checkout-form-ring, .checkout-form-tick { animation: none; stroke-dashoffset: 0; }
  .checkout-form-badge, .checkout-form-digit { animation: none; }
}`;

type Status = "idle" | "submitting" | "error" | "success";

/**
 * Three-step checkout (shipping, payment, review) with an animated stepper,
 * sliding steps, a live 3D card preview, per-step validation, an order summary
 * with promo codes, and a success screen with confetti.
 */
export function CheckoutForm({
  items,
  currency = "USD",
  locale = "en-US",
  shippingOptions = DEFAULT_SHIPPING,
  promoCodes = [],
  taxRate = 0,
  countries = DEFAULT_COUNTRIES,
  onSubmit,
  labels: labelOverrides,
  today,
  headingLevel = 2,
  className,
  ref,
}: CheckoutFormProps) {
  const l = useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides }), [labelOverrides]);
  const H = `h${headingLevel}` as "h2";
  const uid = useId();
  const reducedMotion = usePrefersReducedMotion();

  const [values, setValues] = useState<Values>(() => ({ ...EMPTY, country: countries[0] ?? "" }));
  const [errors, setErrors] = useState<Errors>({});
  const [shippingId, setShippingId] = useState(shippingOptions[0]?.id ?? "");
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState("");
  const [orderId, setOrderId] = useState<string | undefined>();
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [cvcFocused, setCvcFocused] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const fieldRefs = useRef<Partial<Record<Field | "promo", HTMLInputElement | HTMLSelectElement | null>>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const transition = useRef<{ from: number; dir: 1 | -1 } | null>(null);
  const animations = useRef<Animation[]>([]);
  const pendingFocus = useRef<Field | "promo" | null>(null);
  const pendingCaret = useRef<{ field: Field; pos: number } | null>(null);
  const alive = useRef(true);

  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency }), [locale, currency]);
  const fmt = (n: number) => money.format(n);

  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const discount = promo
    ? Math.min(subtotal, round2((subtotal * (promo.percentOff ?? 0)) / 100 + (promo.amountOff ?? 0)))
    : 0;
  const option = shippingOptions.find((o) => o.id === shippingId);
  const shippingCost = option?.price ?? 0;
  const tax = round2((subtotal - discount) * taxRate);
  const total = round2(subtotal - discount + shippingCost + tax);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const cardDigits = onlyDigits(values.cardNumber);
  const brand = detectBrand(cardDigits);
  const stepNames = [l.stepShipping, l.stepPayment, l.stepReview];
  const submitting = status === "submitting";

  const now = () => (today ? new Date(today) : new Date());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      animations.current.forEach((a) => a.cancel());
    };
  }, []);

  // Slide the new step in and animate the height between steps.
  useLayoutEffect(() => {
    const t = transition.current;
    if (!t) return;
    transition.current = null;
    headingRef.current?.focus();
    const viewport = viewportRef.current;
    const panel = panelRef.current;
    animations.current.forEach((a) => a.cancel());
    animations.current = [];
    if (!viewport || !panel || reducedMotion.current || typeof viewport.animate !== "function") return;
    const to = viewport.offsetHeight;
    const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
    animations.current = [
      viewport.animate([{ height: `${t.from}px` }, { height: `${to}px` }], { duration: 420, easing }),
      panel.animate(
        [
          { transform: `translateX(${t.dir * 56}px)`, opacity: 0, filter: "blur(4px)" },
          { transform: "none", opacity: 1, filter: "none" },
        ],
        { duration: 460, easing },
      ),
    ];
  }, [step, reducedMotion]);

  // Keep the caret in place when the card number or expiry is reformatted.
  useLayoutEffect(() => {
    const c = pendingCaret.current;
    if (!c) return;
    pendingCaret.current = null;
    const el = fieldRefs.current[c.field];
    if (el instanceof HTMLInputElement && document.activeElement === el) el.setSelectionRange(c.pos, c.pos);
  });

  // Focus the first invalid field (or the promo input) after the render that shows the error.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    fieldRefs.current[target]?.focus();
  });

  // Success: focus the heading and throw confetti.
  useEffect(() => {
    if (status !== "success") return;
    successRef.current?.focus();
    const layer = confettiRef.current;
    if (!layer || reducedMotion.current) return;
    const pieces = Array.from(layer.children) as HTMLElement[];
    const running = pieces.map((el, i) => {
      const p = CONFETTI[i];
      return el.animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg) scale(0.6)", opacity: 1 },
          { transform: `translate(${p.dx}px, ${p.dy}px) rotate(${p.spin * 0.6}deg) scale(1)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${p.dx * 1.15}px, ${p.dy + 280}px) rotate(${p.spin}deg) scale(0.9)`, opacity: 0 },
        ],
        { duration: 1700, delay: 250 + p.delay, easing: "cubic-bezier(0.2, 0.6, 0.35, 1)", fill: "both" },
      );
    });
    return () => running.forEach((a) => a.cancel());
  }, [status, reducedMotion]);

  const go = (to: number) => {
    if (to === step) return;
    transition.current = { from: viewportRef.current?.offsetHeight ?? 0, dir: to > step ? 1 : -1 };
    setStep(to);
    setReached((r) => Math.max(r, to));
    setAnnouncement(`Step ${to + 1} of 3: ${stepNames[to]}`);
  };

  // Moves to `target`, validating every step on the way forward.
  const tryGo = (target: number) => {
    if (submitting) return;
    if (target <= step) return go(target);
    const date = now();
    for (let s = step; s < target; s++) {
      const found = validateStep(s, values, date, l);
      const fields = STEP_FIELDS[s];
      setErrors((prev) => {
        const next = { ...prev };
        for (const f of fields) delete next[f];
        return { ...next, ...found };
      });
      const first = fields.find((f) => found[f]);
      if (first) {
        pendingFocus.current = first;
        if (s !== step) go(s);
        const count = Object.keys(found).length;
        setAnnouncement(`${count} ${count === 1 ? "field needs" : "fields need"} attention.`);
        return;
      }
    }
    go(target);
  };

  const update = (field: Field, next: string) => {
    const nextValues = { ...values, [field]: next };
    setValues(nextValues);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validateField(field, nextValues, now(), l) }));
  };

  // Reformats digits-only fields and keeps the caret after the same digit.
  const updateFormatted = (field: Field, event: ChangeEvent<HTMLInputElement>, max: number, format: (d: string) => string) => {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const before = onlyDigits(raw.slice(0, caret)).length;
    const formatted = format(onlyDigits(raw).slice(0, max));
    let pos = 0;
    for (let seen = 0; pos < formatted.length && seen < before; pos++) if (/\d/.test(formatted[pos])) seen++;
    pendingCaret.current = { field, pos };
    update(field, formatted);
  };

  const bind = (field: Field, describedBy?: string) => {
    const errorId = `${uid}-${field}-error`;
    const ids = [describedBy, errors[field] ? errorId : undefined].filter(Boolean).join(" ");
    return {
      id: `${uid}-${field}`,
      name: field,
      value: values[field],
      disabled: submitting,
      ref: (el: HTMLInputElement | HTMLSelectElement | null) => {
        fieldRefs.current[field] = el;
      },
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": ids || undefined,
      className: inputClass(Boolean(errors[field])),
    };
  };

  const renderError = (field: Field) =>
    errors[field] ? (
      <p id={`${uid}-${field}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700 dark:text-red-300">
        <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0" fill="currentColor" aria-hidden>
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v4.5h-1.5zm0 6h1.5V12h-1.5z" />
        </svg>
        {errors[field]}
      </p>
    ) : null;

  const label = (field: Field, text: string) => (
    <label htmlFor={`${uid}-${field}`} className="mb-1.5 block text-sm font-medium text-foreground">
      {text}
    </label>
  );

  const applyPromo = (event: FormEvent) => {
    event.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const match = promoCodes.find((p) => p.code.toUpperCase() === code);
    if (match) {
      setPromo(match);
      setPromoInput("");
      const off = match.percentOff ? `${match.percentOff}% off` : `${fmt(match.amountOff ?? 0)} off`;
      setPromoMessage({ tone: "ok", text: `${match.code} applied: ${off}.` });
    } else {
      setPromoMessage({ tone: "error", text: l.promoInvalid });
    }
  };

  const removePromo = () => {
    setPromo(null);
    setPromoMessage({ tone: "ok", text: "Promo code removed." });
    pendingFocus.current = "promo";
  };

  const placeOrder = async () => {
    if (submitting || items.length === 0) return;
    const date = now();
    for (let s = 0; s < 2; s++) {
      const found = validateStep(s, values, date, l);
      const first = STEP_FIELDS[s].find((f) => found[f]);
      if (first) {
        setErrors((prev) => ({ ...prev, ...found }));
        pendingFocus.current = first;
        go(s);
        return;
      }
    }
    setStatus("submitting");
    setSubmitError("");
    setAnnouncement(l.placingOrder);
    const data: CheckoutSubmitData = {
      email: values.email.trim(),
      shipping: {
        name: values.name.trim(),
        address: values.address.trim(),
        city: values.city.trim(),
        postalCode: values.postalCode.trim(),
        country: values.country,
        optionId: shippingId,
      },
      payment: {
        brand,
        number: cardDigits,
        name: values.cardName.trim(),
        expiry: values.expiry,
        cvc: values.cvc,
        last4: cardDigits.slice(-4),
      },
      promoCode: promo?.code,
      items,
      totals: { subtotal, discount, shipping: shippingCost, tax, total, currency },
    };
    try {
      const result = await onSubmit?.(data);
      if (!alive.current) return;
      setOrderId(result && typeof result === "object" ? result.orderId : undefined);
      setStatus("success");
      setAnnouncement(l.successTitle);
    } catch (error) {
      if (!alive.current) return;
      setStatus("error");
      setSubmitError(error instanceof Error && error.message ? error.message : l.submitError);
    }
  };

  const restart = () => {
    setValues({ ...EMPTY, country: countries[0] ?? "" });
    setErrors({});
    setShippingId(shippingOptions[0]?.id ?? "");
    setStep(0);
    setReached(0);
    setStatus("idle");
    setSubmitError("");
    setOrderId(undefined);
    setPromo(null);
    setPromoInput("");
    setPromoMessage(null);
    setAnnouncement("");
    pendingFocus.current = "email";
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step < 2) tryGo(step + 1);
    else void placeOrder();
  };

  const summary = (
    <section aria-label={l.summary} className="order-first min-w-0 @3xl:sticky @3xl:top-4 @3xl:order-none">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface-2/70 backdrop-blur">
        <H className="@3xl:hidden">
          <button
            type="button"
            aria-expanded={summaryOpen}
            aria-controls={`${uid}-summary-panel`}
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0" />
              </svg>
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground">
              {summaryOpen ? l.hideSummary : l.showSummary}
              <span className="block text-xs font-normal text-muted">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </span>
            <AnimatedAmount value={total} format={fmt} className="text-base font-semibold text-foreground" />
            <svg
              viewBox="0 0 20 20"
              className={cn("size-4 text-muted transition-transform duration-300 motion-reduce:transition-none", summaryOpen && "rotate-180")}
              fill="currentColor"
              aria-hidden
            >
              <path d="M5.2 7.5a.75.75 0 0 1 1.06 0L10 11.24l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.56a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </H>
        <H className="hidden px-5 pt-5 text-base font-semibold text-foreground @3xl:block">{l.summary}</H>
        <div
          id={`${uid}-summary-panel`}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none @3xl:grid-rows-[1fr]",
            summaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div
            className={cn(
              "min-h-0 overflow-hidden transition-[visibility] duration-300 @3xl:visible",
              summaryOpen ? "visible" : "invisible",
            )}
          >
            <div className="space-y-4 border-t border-border p-4 @3xl:border-t-0 @3xl:p-5">
              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{l.emptyCart}</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item, i) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="relative shrink-0" aria-hidden>
                        <span
                          className="block size-12 rounded-xl shadow-[inset_0_0_0_1px_rgb(255_255_255/0.25)]"
                          style={{
                            background:
                              item.swatch ??
                              `linear-gradient(135deg, hsl(${(i * 67 + 260) % 360} 80% 70%), hsl(${(i * 67 + 300) % 360} 70% 50%))`,
                          }}
                        />
                        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                          {item.quantity}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {item.variant ? `${item.variant} · ` : ""}
                          Qty {item.quantity}
                        </span>
                      </span>
                      <span className="text-sm font-medium tabular-nums text-foreground">{fmt(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={applyPromo} className="space-y-1.5" noValidate>
                <label htmlFor={`${uid}-promo`} className="block text-sm font-medium text-foreground">
                  {l.promo}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${uid}-promo`}
                    ref={(el) => {
                      fieldRefs.current.promo = el;
                    }}
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      if (promoMessage?.tone === "error") setPromoMessage(null);
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    disabled={submitting}
                    aria-invalid={promoMessage?.tone === "error" || undefined}
                    aria-describedby={`${uid}-promo-msg`}
                    className={cn(inputClass(promoMessage?.tone === "error"), "h-10 uppercase placeholder:normal-case")}
                    placeholder="Enter a code"
                  />
                  <button type="submit" disabled={submitting || !promoInput.trim()} className={cn(secondaryButton, "h-10 shrink-0")}>
                    {l.promoApply}
                  </button>
                </div>
                <p
                  id={`${uid}-promo-msg`}
                  aria-live="polite"
                  className={cn(
                    "min-h-5 text-[13px]",
                    promoMessage?.tone === "error" ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  {promoMessage?.text}
                </p>
                {promo ? (
                  <div className="flex">
                    <span className="checkout-form-badge inline-flex items-center gap-1.5 rounded-full bg-emerald-100 py-1 pl-3 pr-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
                        <path d="M2 2h6l6 6-6 6-6-6V2zm3 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                      </svg>
                      {promo.code}
                      <button
                        type="button"
                        onClick={removePromo}
                        disabled={submitting}
                        aria-label={`${l.promoRemove} ${promo.code}`}
                        className="flex size-6 items-center justify-center rounded-full hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring dark:hover:bg-emerald-900"
                      >
                        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </span>
                  </div>
                ) : null}
              </form>

              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{l.subtotal}</span>
                  <span className="tabular-nums text-foreground">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">
                    {l.shipping}
                    {option ? ` (${option.label})` : ""}
                  </span>
                  <AnimatedAmount
                    value={shippingCost}
                    format={(n) => (n === 0 && shippingCost === 0 ? l.free : fmt(n))}
                    className="text-foreground"
                  />
                </div>
                <div
                  aria-hidden={!promo}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
                    promo ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                      <span>
                        {l.discount}
                        {promo ? ` (${promo.code})` : ""}
                      </span>
                      <span className="tabular-nums">−{fmt(discount)}</span>
                    </div>
                  </div>
                </div>
                {taxRate > 0 ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">{l.tax}</span>
                    <AnimatedAmount value={tax} format={fmt} className="text-foreground" />
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                  <span className="font-semibold text-foreground">{l.total}</span>
                  <span className="flex items-baseline gap-2">
                    {promo ? <s className="text-xs tabular-nums text-muted">{fmt(round2(total + discount))}</s> : null}
                    <AnimatedAmount value={total} format={fmt} className="text-xl font-semibold tracking-tight text-foreground" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const stepper = (
    <nav aria-label="Checkout steps" className="mb-6">
      <ol className="relative grid grid-cols-3">
        <span aria-hidden className="absolute left-[16.667%] right-[16.667%] top-[18px] h-0.5 rounded-full bg-border" />
        <span
          aria-hidden
          className="absolute left-[16.667%] right-[16.667%] top-[18px] h-0.5 origin-left rounded-full bg-linear-to-r from-accent to-fuchsia-500 transition-transform duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none"
          style={{ transform: `scaleX(${step / 2})` }}
        />
        {stepNames.map((name, i) => {
          const finished = i < step;
          const current = i === step;
          return (
            <li key={name} className="relative flex justify-center">
              <button
                type="button"
                onClick={() => tryGo(i)}
                disabled={submitting || i > reached || current}
                aria-current={current ? "step" : undefined}
                className="group flex flex-col items-center gap-1.5 rounded-xl px-2 py-0.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-default"
              >
                <span
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-300 motion-reduce:transition-none",
                    finished
                      ? "border-accent bg-accent text-accent-foreground group-hover:scale-110 group-enabled:group-active:scale-95"
                      : current
                        ? "border-accent bg-surface text-accent shadow-[0_0_0_5px_color-mix(in_oklab,var(--accent)_18%,transparent)]"
                        : "border-border bg-surface text-muted group-enabled:group-hover:border-accent",
                  )}
                >
                  {finished ? (
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="checkout-form-tick" />
                    </svg>
                  ) : (
                    <span aria-hidden>{i + 1}</span>
                  )}
                </span>
                <span className={cn("text-xs font-medium", current || finished ? "text-foreground" : "text-muted")}>
                  {name}
                  <span className="sr-only">
                    {finished ? ", completed" : ""}
                    {`, step ${i + 1} of 3`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  const headingClass = "text-lg font-semibold tracking-tight text-foreground focus:outline-none";

  const panel =
    step === 0 ? (
      <div className="space-y-4">
        <H ref={headingRef} tabIndex={-1} className={headingClass}>
          {l.shippingTitle}
        </H>
        <div className="grid gap-4 @lg:grid-cols-2">
          <div className="@lg:col-span-2">
            {label("email", l.email)}
            <input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" onChange={(e) => update("email", e.target.value)} {...bind("email")} />
            {renderError("email")}
          </div>
          <div className="@lg:col-span-2">
            {label("name", l.name)}
            <input type="text" autoComplete="name" onChange={(e) => update("name", e.target.value)} {...bind("name")} />
            {renderError("name")}
          </div>
          <div className="@lg:col-span-2">
            {label("address", l.address)}
            <input type="text" autoComplete="street-address" onChange={(e) => update("address", e.target.value)} {...bind("address")} />
            {renderError("address")}
          </div>
          <div>
            {label("city", l.city)}
            <input type="text" autoComplete="address-level2" onChange={(e) => update("city", e.target.value)} {...bind("city")} />
            {renderError("city")}
          </div>
          <div>
            {label("postalCode", l.postalCode)}
            <input type="text" autoComplete="postal-code" onChange={(e) => update("postalCode", e.target.value)} {...bind("postalCode")} />
            {renderError("postalCode")}
          </div>
          <div className="relative @lg:col-span-2">
            {label("country", l.country)}
            <div className="relative">
              <select autoComplete="country-name" onChange={(e) => update("country", e.target.value)} {...bind("country")} className={cn(inputClass(Boolean(errors.country)), "appearance-none pr-10")}>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden>
                <path d="M5.2 7.5a.75.75 0 0 1 1.06 0L10 11.24l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.56a.75.75 0 0 1 0-1.06z" />
              </svg>
            </div>
            {renderError("country")}
          </div>
        </div>
        {shippingOptions.length > 0 ? (
          <fieldset className="space-y-2" disabled={submitting}>
            <legend className="mb-1.5 text-sm font-medium text-foreground">{l.delivery}</legend>
            <div className="grid gap-2 @lg:grid-cols-2">
              {shippingOptions.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] motion-reduce:transition-none",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-ring",
                    shippingId === o.id
                      ? "border-accent bg-accent/5 shadow-[0_0_0_1px_var(--accent)]"
                      : "border-border bg-surface hover:border-zinc-400 dark:hover:border-zinc-600",
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-shipping`}
                    value={o.id}
                    checked={shippingId === o.id}
                    onChange={() => setShippingId(o.id)}
                    className="mt-0.5 size-4 accent-[var(--accent)] focus-visible:outline-none"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                    {o.description ? <span className="block text-xs text-muted">{o.description}</span> : null}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{o.price === 0 ? l.free : fmt(o.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="flex justify-end pt-1">
          <button type="submit" className={cn(primaryButton, "w-full @lg:w-auto")}>
            {l.toPayment}
            <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
              <path d="M7.2 4.7a.75.75 0 0 1 1.06 0l4.77 4.77a.75.75 0 0 1 0 1.06L8.26 15.3a.75.75 0 1 1-1.06-1.06L11.44 10 7.2 5.76a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    ) : step === 1 ? (
      <div className="space-y-5">
        <H ref={headingRef} tabIndex={-1} className={headingClass}>
          {l.paymentTitle}
        </H>
        <CardPreview
          digits={cardDigits}
          name={values.cardName.trim()}
          expiry={values.expiry}
          cvc={values.cvc}
          flipped={cvcFocused}
          labels={l}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            {label("cardNumber", l.cardNumber)}
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 1234 1234 1234"
                onChange={(e) => updateFormatted("cardNumber", e, lengthFor(detectBrand(onlyDigits(e.target.value))), formatCardNumber)}
                {...bind("cardNumber", [l.paymentHint ? `${uid}-hint` : "", `${uid}-brand`].filter(Boolean).join(" "))}
                className={cn(inputClass(Boolean(errors.cardNumber)), "pr-16 font-mono tracking-wide")}
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute right-2 top-1/2 flex h-6 min-w-11 -translate-y-1/2 items-center justify-center rounded-md px-1.5 text-white transition-[background-color,opacity,transform] duration-300 motion-reduce:transition-none",
                  brand === "unknown" ? "scale-90 opacity-0" : "scale-100 opacity-100",
                )}
                style={{ backgroundColor: brand === "amex" ? "#0f766e" : brand === "mastercard" ? "#1c1917" : "#1d4ed8" }}
              >
                <BrandMark brand={brand} size="chip" />
              </span>
              <span id={`${uid}-brand`} className="sr-only">
                {brand !== "unknown" ? `${BRAND_NAME[brand]} card` : ""}
              </span>
            </div>
            {l.paymentHint ? (
              <p id={`${uid}-hint`} className="mt-1.5 text-[13px] text-muted">
                {l.paymentHint}
              </p>
            ) : null}
            {renderError("cardNumber")}
          </div>
          <div className="col-span-2">
            {label("cardName", l.cardName)}
            <input type="text" autoComplete="cc-name" onChange={(e) => update("cardName", e.target.value)} {...bind("cardName")} />
            {renderError("cardName")}
          </div>
          <div className="col-span-2 @xs:col-span-1">
            {label("expiry", l.expiry)}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              onChange={(e) => updateFormatted("expiry", e, 4, formatExpiry)}
              {...bind("expiry")}
              className={cn(inputClass(Boolean(errors.expiry)), "font-mono")}
            />
            {renderError("expiry")}
          </div>
          <div className="col-span-2 @xs:col-span-1">
            {label("cvc", l.cvc)}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={brand === "amex" ? "1234" : "123"}
              onChange={(e) => update("cvc", onlyDigits(e.target.value).slice(0, cvcLengthFor(brand)))}
              onFocus={() => setCvcFocused(true)}
              onBlur={() => setCvcFocused(false)}
              {...bind("cvc")}
              className={cn(inputClass(Boolean(errors.cvc)), "font-mono")}
            />
            {renderError("cvc")}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 @lg:flex-row @lg:justify-between">
          <button type="button" onClick={() => go(0)} className={secondaryButton}>
            {l.back}
          </button>
          <button type="submit" className={primaryButton}>
            {l.toReview}
            <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
              <path d="M7.2 4.7a.75.75 0 0 1 1.06 0l4.77 4.77a.75.75 0 0 1 0 1.06L8.26 15.3a.75.75 0 1 1-1.06-1.06L11.44 10 7.2 5.76a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        <H ref={headingRef} tabIndex={-1} className={headingClass}>
          {l.reviewTitle}
        </H>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          <div className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-foreground">{l.stepShipping}</p>
              <p className="mt-1 text-muted">
                {values.name}
                <br />
                {values.address}
                <br />
                {values.city} {values.postalCode}, {values.country}
                <br />
                <span className="break-all">{values.email}</span>
              </p>
              <p className="mt-2 text-foreground">
                {option?.label}
                {option?.description ? <span className="text-muted"> · {option.description}</span> : null}
              </p>
            </div>
            <button type="button" onClick={() => go(0)} disabled={submitting} className={linkButton}>
              {l.edit}
              <span className="sr-only"> {l.stepShipping}</span>
            </button>
          </div>
          <div className="flex items-center gap-3 p-4">
            <span
              aria-hidden
              className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md text-white"
              style={{ backgroundImage: SKIN[brand] }}
            >
              <BrandMark brand={brand} size="chip" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-foreground">
                {BRAND_NAME[brand]} ending in {cardDigits.slice(-4)}
              </p>
              <p className="text-muted">
                {l.expires} {values.expiry}
              </p>
            </div>
            <button type="button" onClick={() => go(1)} disabled={submitting} className={linkButton}>
              {l.edit}
              <span className="sr-only"> {l.stepPayment}</span>
            </button>
          </div>
        </div>
        {status === "error" && submitError ? (
          <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
            <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="currentColor" aria-hidden>
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v4.5h-1.5zm0 6h1.5V12h-1.5z" />
            </svg>
            {submitError}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-2 pt-1 @lg:flex-row @lg:justify-between">
          <button type="button" onClick={() => go(1)} disabled={submitting} className={secondaryButton}>
            {l.back}
          </button>
          <button type="submit" disabled={submitting || items.length === 0} aria-busy={submitting || undefined} className={cn(primaryButton, submitting && "cursor-progress")}>
            {submitting ? (
              <>
                <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
                {l.placingOrder}
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
                  <path d="M10 1.5a4 4 0 0 0-4 4V8H5a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 5 18h10a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 15 8h-1V5.5a4 4 0 0 0-4-4zm2.5 6.5h-5V5.5a2.5 2.5 0 0 1 5 0V8z" />
                </svg>
                {l.placeOrder} · {fmt(total)}
              </>
            )}
          </button>
        </div>
      </div>
    );

  return (
    <div ref={ref} className={cn("@container w-full", className)}>
      <style>{STYLES}</style>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {status === "success" ? (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 py-12 text-center shadow-[0_24px_60px_-30px_rgb(15_23_42/0.35)]">
          <div ref={confettiRef} aria-hidden className="pointer-events-none absolute inset-0">
            {CONFETTI.map((p, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-[5.5rem] opacity-0"
                style={{ width: p.w, height: p.h, backgroundColor: p.color, borderRadius: p.round ? 999 : 2 }}
              />
            ))}
          </div>
          <div aria-hidden className="checkout-form-badge relative mx-auto size-20 text-emerald-600 dark:text-emerald-400">
            <span className="absolute inset-2 rounded-full bg-emerald-500/15 blur-md" />
            <svg viewBox="0 0 80 80" className="relative size-full" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="40" cy="40" r="34" pathLength={1} className="checkout-form-ring" transform="rotate(-90 40 40)" />
              <path d="M25 41.5l10 10L56 30" pathLength={1} className="checkout-form-tick" />
            </svg>
          </div>
          <H ref={successRef} tabIndex={-1} className="relative mt-5 text-2xl font-semibold tracking-tight text-foreground focus:outline-none">
            {l.successTitle}
          </H>
          <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted">
            {l.successBody.replace("{email}", values.email.trim())}
            {orderId ? ` Order ${orderId}.` : ""}
          </p>
          <p className="relative mt-4 text-sm text-foreground">
            {fmt(total)} · {BRAND_NAME[brand]} ending in {cardDigits.slice(-4)}
          </p>
          <button type="button" onClick={restart} className={cn(secondaryButton, "relative mt-6")}>
            {l.successAction}
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-5 @3xl:grid-cols-[minmax(0,1fr)_19rem] @5xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            noValidate
            aria-label={l.form}
            onSubmit={onFormSubmit}
            className="min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-[0_24px_60px_-30px_rgb(15_23_42/0.35)] @md:p-6"
          >
            {stepper}
            <div ref={viewportRef} className="-m-1 overflow-hidden p-1">
              <div ref={panelRef} key={step}>
                {panel}
              </div>
            </div>
          </form>
          {summary}
        </div>
      )}
    </div>
  );
}
