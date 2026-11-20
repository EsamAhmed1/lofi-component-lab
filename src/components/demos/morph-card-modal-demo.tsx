"use client";

import { useState, type ReactNode } from "react";
import { MorphCardModal, type MorphCardItem } from "@/components/ui/morph-card-modal";

/** Seeded pseudo-random numbers so the star field is the same on server and client. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(7);
const STARS = Array.from({ length: 46 }, () => ({
  x: (rand() * 400).toFixed(1),
  y: (rand() * 170).toFixed(1),
  r: (0.4 + rand() * 1.1).toFixed(2),
}));

function Scene({ children, sky }: { children: ReactNode; sky: string }) {
  return (
    <span className="absolute inset-0 block" style={{ background: sky }}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        {children}
      </svg>
    </span>
  );
}

const lofoten = (
  <Scene sky="linear-gradient(180deg, #0f4c75 0%, #3d84a8 38%, #f6a5c0 72%, #ffd6a5 100%)">
    <circle cx="290" cy="150" r="34" fill="#fff4d6" opacity="0.9" />
    <path d="M0 200 L60 120 L100 165 L150 90 L210 170 L250 130 L310 185 L360 140 L400 175 V300 H0Z" fill="#1b3b5a" />
    <path d="M0 225 L70 170 L120 205 L190 150 L260 210 L330 175 L400 215 V300 H0Z" fill="#10263d" />
    <rect y="232" width="400" height="68" fill="#0b1b2c" />
    <path d="M0 240 H400 M40 252 H360 M90 264 H310" stroke="#f6a5c0" strokeOpacity="0.35" strokeWidth="2" />
  </Scene>
);

const kyoto = (
  <Scene sky="radial-gradient(120% 90% at 70% 20%, #ffd166 0%, #f77f00 40%, #9d0208 85%)">
    <circle cx="120" cy="110" r="46" fill="#ffe8a3" opacity="0.85" />
    <g fill="#370617">
      <rect x="230" y="120" width="120" height="12" rx="3" />
      <rect x="222" y="108" width="136" height="10" rx="5" />
      <rect x="244" y="132" width="10" height="120" />
      <rect x="326" y="132" width="10" height="120" />
      <rect x="240" y="150" width="100" height="8" />
    </g>
    <path d="M0 250 C80 225 150 262 230 240 S360 230 400 245 V300 H0Z" fill="#6a040f" />
    <g fill="#ffba08" opacity="0.85">
      <circle cx="60" cy="210" r="5" />
      <circle cx="150" cy="190" r="4" />
      <circle cx="190" cy="230" r="3.5" />
      <circle cx="380" cy="205" r="4.5" />
    </g>
  </Scene>
);

const atacama = (
  <Scene sky="linear-gradient(180deg, #0b0628 0%, #2a1458 55%, #7b2d8e 85%, #e07a5f 100%)">
    <g fill="#fff">
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity="0.85" />
      ))}
    </g>
    <path d="M30 40 C140 70 260 60 380 20" stroke="#c4b5fd" strokeOpacity="0.25" strokeWidth="26" fill="none" />
    <path d="M0 230 C90 200 160 215 230 200 S350 190 400 205 V300 H0Z" fill="#3d1e3f" />
    <path d="M0 255 C110 240 200 262 290 248 S380 245 400 250 V300 H0Z" fill="#e9d8c4" opacity="0.9" />
  </Scene>
);

const amalfi = (
  <Scene sky="linear-gradient(180deg, #8ecae6 0%, #cde9f4 55%, #fef3c7 100%)">
    <circle cx="80" cy="70" r="26" fill="#fde68a" />
    <rect y="200" width="400" height="100" fill="#1d6fa3" />
    <path d="M0 210 H400" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
    <path d="M220 300 L240 160 L300 120 L360 140 L400 120 V300Z" fill="#7c5c3b" />
    <g>
      <rect x="252" y="150" width="22" height="18" fill="#fca5a5" />
      <rect x="280" y="138" width="18" height="22" fill="#fde68a" />
      <rect x="304" y="150" width="24" height="16" fill="#fff7ed" />
      <rect x="262" y="176" width="20" height="18" fill="#fdba74" />
      <rect x="292" y="170" width="22" height="20" fill="#fef3c7" />
      <rect x="336" y="140" width="20" height="18" fill="#bae6fd" />
      <rect x="322" y="174" width="22" height="18" fill="#fecaca" />
    </g>
    <path d="M40 250 l20 -6 l20 6Z" fill="#fff" />
  </Scene>
);

interface Trip {
  id: string;
  title: string;
  subtitle: string;
  image: ReactNode;
  accent: string;
  stats: [string, string][];
  intro: string;
  days: string[];
}

const trips: Trip[] = [
  {
    id: "lofoten",
    title: "Lofoten, Norway",
    subtitle: "Arctic fjords under the midnight sun",
    image: lofoten,
    accent: "#38bdf8",
    stats: [["Best time", "Jun to Aug"], ["Trip length", "6 days"], ["From", "€1,480"]],
    intro:
      "Fishing villages on stilts, sharp granite peaks and white beaches that look tropical until you touch the water. In summer the sun never sets, so you can hike at midnight.",
    days: [
      "Fly into Bodø and take the ferry to Moskenes.",
      "Hike Reinebringen at sunset for the classic view over Reine.",
      "Kayak between the islands around Hamnøy.",
      "Drive to Haukland beach and stay in a rorbu cabin.",
    ],
  },
  {
    id: "kyoto",
    title: "Kyoto, Japan",
    subtitle: "Temples and maple leaves in November",
    image: kyoto,
    accent: "#f97316",
    stats: [["Best time", "Mid Nov"], ["Trip length", "5 days"], ["From", "€1,920"]],
    intro:
      "Autumn turns the temple gardens red and gold. Go early, before the tour buses, and the city feels quiet even at its busiest time of year.",
    days: [
      "Walk the Philosopher's Path from Ginkaku-ji to Nanzen-ji.",
      "See the 10,000 gates of Fushimi Inari before 7am.",
      "Spend an evening in Gion and a morning at Nishiki Market.",
      "Take the train to Arashiyama for the bamboo grove.",
    ],
  },
  {
    id: "atacama",
    title: "Atacama, Chile",
    subtitle: "Salt flats and the clearest night skies",
    image: atacama,
    accent: "#a78bfa",
    stats: [["Best time", "Sep to Nov"], ["Trip length", "7 days"], ["From", "€2,350"]],
    intro:
      "The driest desert on Earth sits at 2,400 metres. Thin, dry air makes it one of the best places in the world to see the Milky Way with your own eyes.",
    days: [
      "Base yourself in San Pedro de Atacama and rest a day for the altitude.",
      "Float in Laguna Cejar and watch sunset over the Valle de la Luna.",
      "Leave at 4am for the El Tatio geysers.",
      "Book a stargazing tour on a night with no moon.",
    ],
  },
  {
    id: "amalfi",
    title: "Amalfi Coast, Italy",
    subtitle: "Cliffside towns above a blue sea",
    image: amalfi,
    accent: "#facc15",
    stats: [["Best time", "May or Sep"], ["Trip length", "4 days"], ["From", "€1,150"]],
    intro:
      "Pastel houses stacked on cliffs, lemon groves and a road that hugs the sea. Skip the car and use the ferries; they are faster in summer and the view is better.",
    days: [
      "Take the ferry from Salerno to Amalfi town.",
      "Hike the Path of the Gods from Bomerano to Nocelle.",
      "Spend a slow afternoon in Ravello's gardens.",
      "Swim off the rocks at Fiordo di Furore.",
    ],
  },
];

function TripContent({ trip }: { trip: Trip }) {
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-3 gap-2">
        {trip.stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface-2 px-3 py-2.5">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-foreground">{trip.intro}</p>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Day by day</h3>
        <ol className="flex flex-col gap-2">
          {trip.days.map((day, i) => (
            <li key={day} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 text-muted">{day}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function MorphCardModalDemo() {
  const [saved, setSaved] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const items: MorphCardItem[] = trips.map((trip) => ({
    id: trip.id,
    title: trip.title,
    subtitle: trip.subtitle,
    image: trip.image,
    accent: trip.accent,
    content: <TripContent trip={trip} />,
    cta: {
      label: saved.includes(trip.id) ? "Saved to your trips" : "Save this trip",
      onClick: () => setSaved((list) => (list.includes(trip.id) ? list : [...list, trip.id])),
    },
  }));

  const savedNames = trips.filter((t) => saved.includes(t.id)).map((t) => t.title.split(",")[0]);

  return (
    <div className="w-full max-w-5xl py-4">
      <MorphCardModal items={items} columns={4} onOpenChange={setOpenId} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {openId ? `Viewing ${trips.find((t) => t.id === openId)?.title}` : "Pick a trip to see the plan."}
        </p>
        <p aria-live="polite" className="text-foreground">
          {savedNames.length ? `Saved: ${savedNames.join(", ")}` : "No trips saved yet."}
        </p>
      </div>
    </div>
  );
}
