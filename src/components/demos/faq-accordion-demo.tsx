"use client";

import { useState } from "react";
import { FaqAccordion, type FaqItem } from "@/components/ui/faq-accordion";

const ITEMS: FaqItem[] = [
  {
    id: "faq-free-trial",
    category: "Billing",
    question: "How long is the free trial?",
    answer: "Every plan starts with a 14-day free trial. You don't need a card to start, and we email you three days before it ends.",
  },
  {
    id: "faq-change-plan",
    category: "Billing",
    question: "Can I switch plans later?",
    answer: "Yes. Upgrades apply right away and we charge the difference for the rest of the month. Downgrades apply at the next renewal.",
  },
  {
    id: "faq-refunds",
    category: "Billing",
    question: "Do you offer refunds?",
    answerText: "Annual plans can be refunded in full within 30 days. Monthly plans are not refunded, but you can cancel any time. Billing settings",
    keywords: ["money back", "cancel"],
    answer: (
      <>
        <p>Annual plans can be refunded in full within 30 days of purchase. Monthly plans are not refunded, but you can cancel any time.</p>
        <p>
          Start a refund from <a href="#billing-settings">Billing settings</a>.
        </p>
      </>
    ),
  },
  {
    id: "faq-invoices",
    category: "Billing",
    question: "Where can I download my invoices?",
    answer: "Open Settings, then Billing, then Invoices. Each invoice is a PDF with your company name, address and VAT number.",
    keywords: ["receipt", "vat", "pdf"],
  },
  {
    id: "faq-reset-password",
    category: "Account",
    question: "How do I reset my password?",
    answer: "Click “Forgot password” on the sign-in page. The reset link is valid for 30 minutes. If you use Google or Microsoft sign-in, reset it there instead.",
  },
  {
    id: "faq-invite-team",
    category: "Account",
    question: "How do I invite my team?",
    answer: "Go to Settings, then Members, and add their email addresses. Owners and admins can invite people. Viewers are free on every plan.",
    keywords: ["seats", "members", "users"],
  },
  {
    id: "faq-delete-account",
    category: "Account",
    question: "What happens when I delete my account?",
    answer: "Your workspace is closed right away and all data is deleted after 30 days. Export anything you need first, from Settings, then Data.",
  },
  {
    id: "faq-integrations",
    category: "Product",
    question: "Which tools do you integrate with?",
    answer: "Slack, Google Calendar, HubSpot, Stripe, Zapier and 40 more. There is also a REST API and webhooks for custom work.",
    keywords: ["api", "zapier", "webhooks"],
  },
  {
    id: "faq-offline",
    category: "Product",
    question: "Does the app work offline?",
    answer: "The desktop and mobile apps keep your last 30 days of data offline. Changes sync as soon as you reconnect.",
  },
  {
    id: "faq-import",
    category: "Product",
    question: "Can I import data from a spreadsheet?",
    answer: "Yes. Upload a CSV or Excel file and map the columns. Imports of up to 50,000 rows usually finish in under a minute.",
    keywords: ["csv", "excel", "migrate"],
  },
  {
    id: "faq-data-location",
    category: "Security",
    question: "Where is my data stored?",
    answer: "On AWS in Frankfurt for EU workspaces and in Virginia for everyone else. Data is encrypted at rest and in transit.",
    keywords: ["gdpr", "region", "encryption"],
  },
  {
    id: "faq-sso",
    category: "Security",
    question: "Do you support SSO and two-factor sign-in?",
    answer: "Two-factor sign-in is free on every plan. SAML SSO with Okta, Azure AD and Google Workspace comes with the Business plan.",
    keywords: ["2fa", "saml", "okta"],
  },
];

export default function FaqAccordionDemo() {
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="w-full py-8">
      <div className="mx-auto w-full max-w-5xl">
        <FaqAccordion
          title="Questions, answered"
          description={
            <p>
              Everything about plans, your account and how Ledgerly works. Try searching “refund” or “csv”, or link to an
              answer with its URL hash.
            </p>
          }
          categories={["Billing", "Account", "Product", "Security"]}
          items={ITEMS}
          defaultOpen="faq-free-trial"
          contactHref="#contact-support"
          onFeedback={(id, helpful) => {
            const q = ITEMS.find((i) => i.id === id)?.question ?? id;
            setLast(`${helpful ? "👍" : "👎"} on “${q}”`);
          }}
        />
        <p className="mt-6 text-center text-sm text-muted">{last ? `Feedback sent: ${last}` : "onFeedback fires when someone votes."}</p>
      </div>
    </div>
  );
}
