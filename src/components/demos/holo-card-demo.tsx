"use client";

import { useState, type ReactNode } from "react";
import { HoloCard, type HoloCardProps } from "@/components/ui/holo-card";

function NovaArt() {
  return (
    <svg viewBox="0 0 120 90" className="h-[80%] w-auto">
      <ellipse cx={60} cy={45} rx={46} ry={13} fill="none" stroke="#c4b5fd" strokeOpacity={0.55} strokeWidth={1.5} transform="rotate(-16 60 45)" />
      <circle cx={60} cy={45} r={27} fill="none" stroke="#a5b4fc" strokeOpacity={0.45} strokeDasharray="2 4" />
      <circle cx={60} cy={45} r={15} fill="#6366f1" />
      <circle cx={60} cy={45} r={15} fill="none" stroke="#e0e7ff" strokeOpacity={0.7} />
      <path d="M60 34 L62.6 42.4 L71 45 L62.6 47.6 L60 56 L57.4 47.6 L49 45 L57.4 42.4 Z" fill="#eef2ff" />
      <circle cx={18} cy={20} r={1.6} fill="#e0e7ff" />
      <circle cx={100} cy={16} r={2.2} fill="#c4b5fd" />
      <circle cx={104} cy={70} r={1.4} fill="#e0e7ff" />
      <circle cx={24} cy={72} r={2} fill="#a5b4fc" />
      <circle cx={104} cy={35} r={3} fill="#f0abfc" />
    </svg>
  );
}

function AtlasArt() {
  return (
    <svg viewBox="0 0 120 90" className="h-[80%] w-auto" fill="none">
      <circle cx={60} cy={45} r={30} fill="#3a2608" stroke="#fcd34d" strokeWidth={2} />
      <ellipse cx={60} cy={45} rx={13} ry={30} stroke="#fcd34d" strokeOpacity={0.7} strokeWidth={1.5} />
      <path d="M30 45 H90 M34 30 H86 M34 60 H86" stroke="#fcd34d" strokeOpacity={0.55} strokeWidth={1.5} />
      <path d="M60 15 V75" stroke="#fde68a" strokeWidth={1.5} />
      <path d="M84 18 L88 26 L96 28 L88 30 L84 38 L80 30 L72 28 L80 26 Z" fill="#fef3c7" />
      <circle cx={47} cy={36} r={3} fill="#f59e0b" />
      <circle cx={70} cy={56} r={3} fill="#f59e0b" />
      <path d="M47 36 Q62 38 70 56" stroke="#fef3c7" strokeWidth={1.4} strokeDasharray="2 3" />
    </svg>
  );
}

function EchoArt() {
  const bars = [14, 26, 40, 58, 44, 66, 50, 34, 52, 28, 18];
  return (
    <svg viewBox="0 0 120 90" className="h-[78%] w-auto">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={9 + i * 9.6}
          y={45 - h / 2}
          width={5.6}
          height={h}
          rx={2.8}
          fill={i % 3 === 0 ? "#6366f1" : i % 3 === 1 ? "#8b5cf6" : "#ec4899"}
        />
      ))}
    </svg>
  );
}

function Footer({ left, right }: { left: string; right: string }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span>{left}</span>
      <span>{right}</span>
    </span>
  );
}

interface Agent extends Omit<HoloCardProps, "art" | "onClick"> {
  art: ReactNode;
}

const agents: Agent[] = [
  {
    variant: "holo",
    title: "Nova",
    subtitle: "Research agent",
    rarity: "Mythic",
    art: <NovaArt />,
    stats: [
      { label: "Tasks", value: "1,284" },
      { label: "Accuracy", value: "98%" },
      { label: "Avg time", value: "1.4s" },
    ],
    footer: <Footer left="#001 · Agent Series" right="Holo foil" />,
  },
  {
    variant: "gold",
    title: "Atlas",
    subtitle: "Travel planning agent",
    rarity: "Legendary",
    art: <AtlasArt />,
    stats: [
      { label: "Trips", value: "312" },
      { label: "Countries", value: "46" },
      { label: "Rating", value: "4.9" },
    ],
    footer: <Footer left="#014 · Agent Series" right="Gold foil" />,
  },
  {
    variant: "glass",
    title: "Echo",
    subtitle: "Voice support agent",
    rarity: "Rare",
    art: <EchoArt />,
    stats: [
      { label: "Calls", value: "8.6k" },
      { label: "Languages", value: "12" },
      { label: "Uptime", value: "99.9%" },
    ],
    footer: <Footer left="#027 · Agent Series" right="Glass" />,
  },
];

export default function HoloCardDemo() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="@container flex w-full flex-col items-center gap-6 py-6">
      <div className="grid w-full grid-cols-1 justify-items-center gap-10 px-4 @2xl:grid-cols-3 @2xl:gap-6">
        {agents.map(({ title, ...agent }) => (
          <HoloCard key={title} title={title} {...agent} onClick={() => setPicked(title)} />
        ))}
      </div>
      <p aria-live="polite" className="px-4 text-center text-sm text-muted">
        {picked
          ? `You picked ${picked}. Tab through the cards to see the focus tilt.`
          : "Move your pointer over a card, tap it on touch, or press Tab."}
      </p>
    </div>
  );
}
