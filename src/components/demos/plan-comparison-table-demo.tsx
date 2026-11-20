"use client";

import { useState } from "react";
import {
  PlanComparisonTable,
  type BillingCycle,
  type ComparisonGroup,
  type ComparisonPlan,
} from "@/components/ui/plan-comparison-table";

const plans: ComparisonPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For side projects and trying things out.",
    priceMonthly: 0,
    priceYearly: 0,
    cta: "Start free",
    priceNote: "Free forever",
  },
  {
    id: "starter",
    name: "Starter",
    description: "For small teams shipping their first product.",
    priceMonthly: 15,
    priceYearly: 12,
    cta: "Choose Starter",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need automation and insight.",
    priceMonthly: 49,
    priceYearly: 39,
    cta: "Choose Pro",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large companies with security and scale needs.",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    cta: "Contact sales",
    priceNote: "Volume pricing, billed yearly",
  },
];

const groups: ComparisonGroup[] = [
  {
    name: "Usage",
    features: [
      { name: "Projects", values: { free: "3", starter: "20", pro: "Unlimited", enterprise: "Unlimited" } },
      {
        name: "Team members",
        values: { free: { limit: 1 }, starter: { limit: 5 }, pro: { limit: 25 }, enterprise: { limit: "unlimited" } },
      },
      {
        name: "File storage",
        tooltip: "Shared across the workspace. Extra storage is $5 per 100 GB.",
        values: {
          free: { limit: 1, unit: "GB" },
          starter: { limit: 50, unit: "GB" },
          pro: { limit: 500, unit: "GB" },
          enterprise: { limit: "unlimited" },
        },
      },
      { name: "API requests", values: { free: "10k / mo", starter: "100k / mo", pro: "1M / mo", enterprise: "Custom" } },
    ],
  },
  {
    name: "Features",
    features: [
      { name: "Custom domains", values: { free: false, starter: true, pro: true, enterprise: true } },
      { name: "Analytics", values: { free: "Basic", starter: "Basic", pro: "Advanced", enterprise: "Advanced" } },
      {
        name: "Automations",
        tooltip: "Run workflows on a schedule or when data changes.",
        values: { free: false, starter: false, pro: true, enterprise: true },
      },
      { name: "Version history", values: { free: "7 days", starter: "30 days", pro: "1 year", enterprise: "Unlimited" } },
    ],
  },
  {
    name: "Security and support",
    features: [
      {
        name: "SSO / SAML",
        tooltip: "Sign in with Okta, Microsoft Entra ID or Google Workspace.",
        values: { free: false, starter: false, pro: false, enterprise: true },
      },
      { name: "Audit log", values: { free: false, starter: false, pro: true, enterprise: true } },
      { name: "Uptime SLA", values: { free: false, starter: false, pro: "99.9%", enterprise: "99.99%" } },
      { name: "Support", values: { free: "Community", starter: "Email", pro: "Priority email", enterprise: "Dedicated manager" } },
    ],
  },
];

export default function PlanComparisonTableDemo() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [selected, setSelected] = useState<string | null>(null);

  const chosen = plans.find((p) => p.id === selected);

  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <PlanComparisonTable
        plans={plans}
        groups={groups}
        defaultBilling="monthly"
        onBillingChange={setBilling}
        onSelectPlan={(id) => setSelected(id)}
        caption="Compare Flowbase plans"
        maxHeight="34rem"
      />
      <p className="text-sm text-muted" aria-live="polite">
        {chosen ? (
          <>
            Selected: <span className="font-medium text-foreground">{chosen.name}</span>, billed {billing}.
          </>
        ) : (
          `Billing: ${billing}. Pick a plan to see the callback.`
        )}
      </p>
    </div>
  );
}
