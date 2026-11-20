"use client";

import { useEffect, useRef, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type Status = "Paid" | "Pending" | "Overdue" | "Draft";

interface Invoice {
  id: string;
  client: string;
  contact: string;
  status: Status;
  owner: string;
  /** ISO date, so it sorts as text. */
  issued: string;
  amount: number;
}

/** Seeded pseudo-random numbers so the rows are the same on server and client. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CLIENTS = [
  "Northwind Labs", "Bluebird Dental", "Orbit Coffee Co.", "Fernhill Studio", "Kestrel Logistics",
  "Maple & Main", "Quartz Analytics", "Harbor Yoga", "Lumen Robotics", "Tidewater Books",
  "Cobalt Fitness", "Pinecrest Realty", "Saffron Kitchen", "Atlas Freight", "Velvet Audio",
  "Juniper Health", "Copperleaf Farms", "Brightline Legal", "Nimbus Cloudworks", "Willow Pediatrics",
];
const CONTACTS = [
  "Maya Ortiz", "Daniel Kim", "Grace Okafor", "Tom Haller", "Sofia Rossi", "Ethan Brooks", "Nora Lindqvist",
  "Omar Haddad", "Chloe Martin", "Ravi Mehta", "Hannah Weiss", "Lucas Silva",
];
const OWNERS = ["Ava Chen", "Marcus Bell", "Priya Nair", "Leo Park"];
const STATUSES: Status[] = ["Paid", "Paid", "Paid", "Pending", "Pending", "Overdue", "Draft"];
const MONTHS = ["Sep", "Oct", "Nov"];
const MONTH_DAYS = [30, 31, 30];

/** Day offset from 1 Sep 2026 to an ISO date, without touching Date. */
function isoFromOffset(offset: number) {
  let day = offset;
  let month = 0;
  while (day >= MONTH_DAYS[month]) {
    day -= MONTH_DAYS[month];
    month += 1;
  }
  return `2026-${String(month + 9).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 9]} ${Number(d)}, 2026`;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const rand = seeded(42);
const SEED: Invoice[] = Array.from({ length: 40 }, (_, i) => ({
  id: `INV-${1042 + i}`,
  client: CLIENTS[Math.floor(rand() * CLIENTS.length)],
  contact: CONTACTS[Math.floor(rand() * CONTACTS.length)],
  status: STATUSES[Math.floor(rand() * STATUSES.length)],
  owner: OWNERS[Math.floor(rand() * OWNERS.length)],
  issued: isoFromOffset(Math.floor(rand() * 80)),
  amount: Math.round((180 + rand() * rand() * 11800) / 5) * 5,
}));

const AVATAR = [
  "linear-gradient(135deg,#6d28d9,#db2777)",
  "linear-gradient(135deg,#0f766e,#1d4ed8)",
  "linear-gradient(135deg,#b45309,#be123c)",
  "linear-gradient(135deg,#1d4ed8,#7c3aed)",
  "linear-gradient(135deg,#be123c,#7e22ce)",
  "linear-gradient(135deg,#047857,#0e7490)",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      aria-hidden
      className={
        size === "sm"
          ? "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ring-2 ring-surface"
          : "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white shadow-sm ring-2 ring-surface"
      }
      style={{ background: AVATAR[hash(name) % AVATAR.length] }}
    >
      {initials}
    </span>
  );
}

const pill: Record<Status, string> = {
  Paid: "bg-emerald-500/12 text-emerald-800 ring-emerald-600/25 dark:text-emerald-300 dark:ring-emerald-400/25",
  Pending: "bg-amber-500/12 text-amber-800 ring-amber-600/25 dark:text-amber-300 dark:ring-amber-400/25",
  Overdue: "bg-rose-500/12 text-rose-800 ring-rose-600/25 dark:text-rose-300 dark:ring-rose-400/25",
  Draft: "bg-zinc-500/12 text-zinc-700 ring-zinc-500/25 dark:text-zinc-300 dark:ring-zinc-400/25",
};
const dot: Record<Status, string> = {
  Paid: "bg-emerald-500",
  Pending: "bg-amber-500",
  Overdue: "bg-rose-500 animate-pulse motion-reduce:animate-none",
  Draft: "bg-zinc-400",
};

const columns: DataTableColumn<Invoice>[] = [
  {
    key: "id",
    header: "Invoice",
    accessor: (r) => r.id,
    cell: (r, { highlight }) => <span className="font-mono text-[13px] text-muted">{highlight(r.id)}</span>,
    width: "8rem",
    hideable: false,
  },
  {
    key: "client",
    header: "Client",
    accessor: (r) => r.client,
    filter: "text",
    cell: (r, { highlight }) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={r.client} />
        <span className="flex flex-col leading-tight">
          <span className="font-medium text-foreground">{highlight(r.client)}</span>
          <span className="text-xs text-muted">{highlight(r.contact)}</span>
        </span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: (r) => r.status,
    filter: "select",
    filterOptions: ["Paid", "Pending", "Overdue", "Draft"],
    cell: (r, { highlight }) => (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill[r.status]}`}>
        <span aria-hidden className={`size-1.5 rounded-full ${dot[r.status]}`} />
        {highlight(r.status)}
      </span>
    ),
  },
  {
    key: "owner",
    header: "Owner",
    accessor: (r) => r.owner,
    filter: "select",
    hideBelow: "md",
    cell: (r, { highlight }) => (
      <span className="flex items-center gap-2">
        <Avatar name={r.owner} size="sm" />
        {highlight(r.owner)}
      </span>
    ),
  },
  {
    key: "issued",
    header: "Issued",
    accessor: (r) => r.issued,
    searchable: false,
    hideBelow: "sm",
    cell: (r) => <span className="tabular-nums text-muted">{formatDate(r.issued)}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    accessor: (r) => r.amount,
    align: "right",
    searchable: false,
    cell: (r) => <span className="font-medium tabular-nums">{money.format(r.amount)}</span>,
  },
];

export default function DataTableDemo() {
  const [rows, setRows] = useState<Invoice[]>(SEED);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("Tip: shift-click a second header to sort by two columns.");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const reload = () => {
    setLoading(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLoading(false), 1400);
  };

  const outstanding = rows.filter((r) => r.status !== "Paid" && r.status !== "Draft").reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="@container w-full py-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Invoices</h2>
          <p className="text-sm text-muted">
            {rows.length} invoices, <span className="font-medium text-foreground tabular-nums">{money.format(outstanding)}</span> outstanding
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {loading ? "Loading…" : "Reload"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRows(SEED);
              setLog("Data reset to the 40 sample invoices.");
            }}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reset data
          </button>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        caption="Invoices"
        loading={loading}
        defaultSort={[{ key: "issued", direction: "desc" }]}
        searchPlaceholder="Search invoices, clients, owners"
        bulkActions={[
          {
            id: "paid",
            label: "Mark paid",
            onAction: (ids) => {
              setRows((current) => current.map((r) => (ids.includes(r.id) ? { ...r, status: "Paid" } : r)));
              setLog(`Marked ${ids.length} ${ids.length === 1 ? "invoice" : "invoices"} as paid.`);
            },
          },
          {
            id: "remind",
            label: "Send reminder",
            onAction: (ids) => setLog(`Queued ${ids.length} payment ${ids.length === 1 ? "reminder" : "reminders"}.`),
          },
          {
            id: "delete",
            label: "Delete",
            tone: "danger",
            onAction: (ids) => {
              setRows((current) => current.filter((r) => !ids.includes(r.id)));
              setLog(`Deleted ${ids.join(", ")}.`);
            },
          },
        ]}
      />

      <p aria-live="polite" className="mt-3 text-sm text-muted">
        {log}
      </p>
    </div>
  );
}
