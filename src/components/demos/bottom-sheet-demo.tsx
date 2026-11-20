"use client";

import { useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/cn";

interface Ride {
  id: string;
  name: string;
  seats: number;
  eta: number;
  dropoff: string;
  price: number;
  tag?: string;
  color: string;
  electric?: boolean;
  accessible?: boolean;
}

const RIDES: Ride[] = [
  { id: "saver", name: "Saver", seats: 4, eta: 9, dropoff: "6:58 PM", price: 17.2, tag: "Wait and save", color: "#64748b" },
  { id: "comfort", name: "Comfort", seats: 4, eta: 3, dropoff: "6:42 PM", price: 24.8, tag: "Faster", color: "#7c3aed" },
  { id: "green", name: "Green", seats: 4, eta: 5, dropoff: "6:46 PM", price: 25.6, tag: "Electric", color: "#059669", electric: true },
  { id: "xl", name: "XL", seats: 6, eta: 6, dropoff: "6:47 PM", price: 36.1, color: "#0284c7" },
  { id: "access", name: "Access", seats: 4, eta: 11, dropoff: "7:01 PM", price: 24.8, tag: "Wheelchair", color: "#d97706", accessible: true },
  { id: "black", name: "Black", seats: 4, eta: 7, dropoff: "6:49 PM", price: 58.4, tag: "Premium", color: "#18181b" },
];

const POINTS = [0.35, 0.65, 1];
const money = (n: number) => `$${n.toFixed(2)}`;

function CarIcon({ color }: { color: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 36" className="h-9 w-16 shrink-0">
      <ellipse cx="32" cy="32" rx="26" ry="3" fill="currentColor" opacity="0.12" />
      <path d="M8 24c0-4 2-6 6-7l7-7c2-2 4-3 7-3h10c3 0 5 1 7 3l6 7c5 1 7 3 7 7v3H8z" fill={color} />
      <path d="M24 10h7v7H18zM35 10h4c2 0 3 1 4 2l5 5H35z" fill="#fff" opacity="0.75" />
      <circle cx="19" cy="27" r="5" fill="#27272a" />
      <circle cx="45" cy="27" r="5" fill="#27272a" />
      <circle cx="19" cy="27" r="2" fill="#d4d4d8" />
      <circle cx="45" cy="27" r="2" fill="#d4d4d8" />
    </svg>
  );
}

function MapArt() {
  return (
    <svg aria-hidden viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      <rect width="400" height="260" className="fill-surface-2" />
      <path d="M-10 70h420M-10 170h420M90-10v280M250-10v280M330-10v280" className="stroke-border" strokeWidth="14" />
      <path d="M-10 120 410 40M30 270 200-10" className="stroke-border" strokeWidth="9" />
      <rect x="110" y="88" width="60" height="62" rx="8" fill="#10b981" opacity="0.18" />
      <rect x="270" y="190" width="44" height="50" rx="8" fill="#10b981" opacity="0.18" />
      <path
        d="M60 214C90 214 90 170 130 170h120c30 0 30-60 80-60"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <path d="M60 214C90 214 90 170 130 170h120c30 0 30-60 80-60" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <circle cx="60" cy="214" r="9" fill="var(--accent)" />
      <circle cx="60" cy="214" r="4" fill="#fff" />
      <rect x="320" y="100" width="20" height="20" rx="4" fill="var(--foreground)" />
      <rect x="326" y="106" width="8" height="8" rx="1" fill="var(--background)" />
    </svg>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full bg-border transition-colors motion-reduce:transition-none",
          "peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-ring",
          "after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 motion-reduce:after:transition-none",
        )}
      />
    </label>
  );
}

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring";

export default function BottomSheetDemo() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [ridesOpen, setRidesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [snap, setSnap] = useState(0);
  const [ride, setRide] = useState("comfort");
  const [booked, setBooked] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(60);
  const [electric, setElectric] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [quiet, setQuiet] = useState(true);

  const visible = RIDES.filter((r) => r.price <= maxPrice && (!electric || r.electric) && (!accessible || r.accessible));
  const selected = RIDES.find((r) => r.id === ride) ?? RIDES[1];
  const activeFilters = Number(maxPrice < 60) + Number(electric) + Number(accessible) + Number(quiet);

  const resetFilters = () => {
    setMaxPrice(60);
    setElectric(false);
    setAccessible(false);
    setQuiet(false);
  };

  return (
    <div className="w-full max-w-2xl py-4">
      <div ref={pageRef} className="relative isolate min-h-80 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <MapArt />
        <div className="relative m-3 mt-28 rounded-2xl border border-border bg-surface p-4 shadow-lg">
          <h2 className="text-base font-semibold">Where to?</h2>
          <p className="mt-1 text-sm text-muted">Mission &amp; 16th St to SFO Terminal 2</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setBooked(null);
                setRidesOpen(true);
              }}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-[opacity,scale] hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none",
                ring,
              )}
            >
              Choose a ride
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setFiltersOpen(true)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium transition-[background-color,scale] hover:bg-surface-2 active:scale-[0.98] motion-reduce:transition-none",
                ring,
              )}
            >
              Filters
              {activeFilters ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                  {activeFilters}
                </span>
              ) : null}
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <dt className="text-muted">Ride sheet</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{ridesOpen ? `${Math.round(POINTS[snap] * 100)}% height` : "Closed"}</dd>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <dt className="text-muted">Selected</dt>
              <dd className="mt-0.5 font-semibold">{booked ?? `${selected.name}, ${money(selected.price)}`}</dd>
            </div>
          </dl>
        </div>
      </div>

      <BottomSheet
        open={ridesOpen}
        onOpenChange={setRidesOpen}
        snapPoints={POINTS}
        activeSnap={snap}
        onSnapChange={setSnap}
        backgroundRef={pageRef}
        title="Choose a ride"
        description={`${visible.length} options to SFO Terminal 2. Drag the handle to see more.`}
        footer={
          <button
            type="button"
            onClick={() => {
              setBooked(`${selected.name} requested`);
              setRidesOpen(false);
              setSnap(0);
            }}
            className={cn(
              "flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background transition-[opacity,scale] hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none",
              ring,
            )}
          >
            Choose {selected.name} for {money(selected.price)}
          </button>
        }
      >
        <fieldset>
          <legend className="sr-only">Ride type</legend>
          {visible.length ? (
            <ul className="flex flex-col gap-2">
              {visible.map((r) => (
                <li key={r.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:bg-surface-2 motion-reduce:transition-none",
                      "has-checked:border-accent has-checked:bg-accent/8",
                      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-solid has-focus-visible:outline-ring",
                    )}
                  >
                    <input type="radio" name="ride" value={r.id} checked={ride === r.id} onChange={() => setRide(r.id)} className="sr-only" />
                    <CarIcon color={r.color} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold">{r.name}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <svg aria-hidden viewBox="0 0 16 16" className="size-3" fill="currentColor">
                            <circle cx="8" cy="5" r="3" />
                            <path d="M2 15c0-3.3 2.7-5 6-5s6 1.7 6 5z" />
                          </svg>
                          {r.seats} seats
                        </span>
                        {r.tag ? (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-foreground">{r.tag}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {r.eta} min away. Drop-off {r.dropoff}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(r.price)}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">No rides match your filters. Raise the max price or turn a filter off.</p>
          )}
        </fieldset>
        <div className="mt-4 rounded-2xl border border-border p-4 text-sm">
          <p className="font-medium">Payment</p>
          <p className="mt-1 text-muted">Personal card ending 4821. Receipts go to your work email.</p>
        </div>
        <p className="mt-4 text-xs text-muted">Prices include fees and an estimated $3.10 airport surcharge. Tolls may apply.</p>
      </BottomSheet>

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        side="right"
        snapPoints={[0.75, 1]}
        defaultSnap={1}
        maxSize={420}
        backgroundRef={pageRef}
        title="Filters"
        description="Narrow down the rides you see."
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className={cn("h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-2", ring)}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className={cn("h-11 flex-1 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground hover:opacity-90", ring)}
            >
              Show {visible.length} rides
            </button>
          </div>
        }
      >
        <div className="flex flex-col divide-y divide-border">
          <label className="block pb-4">
            <span className="flex items-center justify-between text-sm font-medium">
              Max price
              <span className="tabular-nums text-muted">{maxPrice >= 60 ? "Any" : money(maxPrice)}</span>
            </span>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className={cn("mt-3 w-full accent-(--accent)", ring)}
            />
          </label>
          <Switch label="Electric only" hint="Zero-emission cars" checked={electric} onChange={setElectric} />
          <Switch label="Wheelchair access" hint="Ramp or lift equipped" checked={accessible} onChange={setAccessible} />
          <Switch label="Quiet ride" hint="Driver keeps chat to a minimum" checked={quiet} onChange={setQuiet} />
        </div>
      </BottomSheet>
    </div>
  );
}
