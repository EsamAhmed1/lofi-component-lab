"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { LightboxGallery, type LightboxGalleryHandle, type LightboxItem } from "@/components/ui/lightbox-gallery";

/** Seeded pseudo-random numbers so stars and windows match on server and client. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Palette = [string, string, string, string, string];

/** A 400x400 canvas that crops to any aspect ratio, with a sky gradient. */
function Canvas({ sky, children }: { sky: [string, string, string]; children: (id: string) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.55" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="400" height="400" fill={`url(#${id}-sky)`} />
      {children(id)}
    </svg>
  );
}

function Peaks({ p }: { p: Palette }) {
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          <circle cx="270" cy="170" r="46" fill="#fff6dc" opacity="0.85" filter={`url(#${id}-blur)`} />
          <circle cx="270" cy="170" r="30" fill="#fff6dc" />
          <path d="M0 260 L70 170 L120 215 L190 120 L250 200 L300 160 L400 245 V400 H0Z" fill={p[3]} opacity="0.75" />
          <path d="M190 120 L172 146 L186 142 L196 152 L208 138Z" fill="#ffffff" opacity="0.7" />
          <path d="M0 300 L90 220 L160 270 L240 205 L320 265 L400 225 V400 H0Z" fill={p[4]} />
          <rect y="330" width="400" height="70" fill={p[4]} />
          <path d="M0 312 C80 300 140 322 220 308 S340 300 400 314" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" fill="none" />
        </>
      )}
    </Canvas>
  );
}

function Dunes({ p }: { p: Palette }) {
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          <circle cx="130" cy="150" r="70" fill={p[2]} opacity="0.9" filter={`url(#${id}-blur)`} />
          <circle cx="130" cy="150" r="44" fill="#fff1d0" />
          <path d="M0 250 C90 200 170 230 240 250 S360 230 400 215 V400 H0Z" fill={p[3]} />
          <path d="M0 300 C70 270 160 260 230 300 S350 330 400 290 V400 H0Z" fill={p[4]} />
          <path d="M60 290 C120 268 170 272 215 296" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="3" fill="none" />
          <path d="M0 350 C100 320 220 345 400 330 V400 H0Z" fill="#000000" opacity="0.18" />
        </>
      )}
    </Canvas>
  );
}

function NightSea({ p, seed }: { p: Palette; seed: number }) {
  const rand = seeded(seed);
  const stars = Array.from({ length: 40 }, () => [rand() * 400, rand() * 220, 0.5 + rand() * 1.2] as const);
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          {stars.map(([x, y, r], i) => (
            <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#ffffff" opacity="0.8" />
          ))}
          <circle cx="200" cy="170" r="52" fill={p[3]} opacity="0.6" filter={`url(#${id}-blur)`} />
          <circle cx="200" cy="170" r="34" fill="#f4f1ff" />
          <rect y="250" width="400" height="150" fill={p[4]} />
          {[262, 278, 296, 318, 344, 372].map((y, i) => (
            <rect key={y} x={200 - (30 + i * 14)} y={y} width={60 + i * 28} height="3" rx="1.5" fill="#f4f1ff" opacity={0.65 - i * 0.08} />
          ))}
        </>
      )}
    </Canvas>
  );
}

function Aurora({ p, seed }: { p: Palette; seed: number }) {
  const rand = seeded(seed);
  const stars = Array.from({ length: 50 }, () => [rand() * 400, rand() * 260, 0.4 + rand()] as const);
  const trees = Array.from({ length: 14 }, (_, i) => [i * 30 + rand() * 12, 40 + rand() * 50] as const);
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          {stars.map(([x, y, r], i) => (
            <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#ffffff" opacity="0.7" />
          ))}
          <g filter={`url(#${id}-blur)`} opacity="0.9">
            <path d="M-20 200 C60 120 120 220 200 140 S330 90 420 150 L420 190 C330 140 280 230 200 190 S60 220 -20 250Z" fill={p[3]} />
            <path d="M-20 150 C80 80 160 170 240 100 S360 70 420 100 L420 120 C350 110 300 160 230 140 S90 140 -20 190Z" fill={p[4]} opacity="0.8" />
          </g>
          <rect y="330" width="400" height="70" fill="#03060c" />
          {trees.map(([x, h], i) => (
            <path key={i} d={`M${x.toFixed(1)} 335 L${(x + 11).toFixed(1)} ${(335 - h).toFixed(1)} L${(x + 22).toFixed(1)} 335Z`} fill="#03060c" />
          ))}
        </>
      )}
    </Canvas>
  );
}

function City({ p, seed }: { p: Palette; seed: number }) {
  const rand = seeded(seed);
  let x = 0;
  const towers: { x: number; w: number; h: number }[] = [];
  while (x < 400) {
    const w = 26 + rand() * 34;
    towers.push({ x, w, h: 80 + rand() * 170 });
    x += w + 4;
  }
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          <circle cx="300" cy="120" r="60" fill={p[3]} opacity="0.7" filter={`url(#${id}-blur)`} />
          {towers.map((t, i) => (
            <g key={i}>
              <rect x={t.x.toFixed(1)} y={(400 - t.h).toFixed(1)} width={t.w.toFixed(1)} height={t.h.toFixed(1)} fill={i % 2 ? p[4] : "#0c0a1d"} />
              {Array.from({ length: Math.floor(t.h / 22) }, (_, row) =>
                [0, 1].map((col) =>
                  rand() > 0.45 ? (
                    <rect
                      key={`${row}-${col}`}
                      x={(t.x + 6 + col * (t.w / 2 - 2)).toFixed(1)}
                      y={(400 - t.h + 10 + row * 22).toFixed(1)}
                      width="6"
                      height="8"
                      fill={p[3]}
                      opacity="0.85"
                    />
                  ) : null,
                ),
              )}
            </g>
          ))}
        </>
      )}
    </Canvas>
  );
}

function Bloom({ p }: { p: Palette }) {
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          <g filter={`url(#${id}-blur)`}>
            <circle cx="120" cy="130" r="90" fill={p[3]} opacity="0.8" />
            <circle cx="290" cy="270" r="110" fill={p[4]} opacity="0.75" />
          </g>
          <g transform="translate(200 200)">
            {Array.from({ length: 10 }, (_, i) => (
              <ellipse key={i} rx="34" ry="96" fill={i % 2 ? p[3] : p[4]} opacity="0.55" transform={`rotate(${i * 36}) translate(0 -40)`} />
            ))}
            <circle r="30" fill="#fff4d6" />
            <circle r="16" fill={p[2]} />
          </g>
        </>
      )}
    </Canvas>
  );
}

function Planet({ p, seed }: { p: Palette; seed: number }) {
  const rand = seeded(seed);
  const stars = Array.from({ length: 60 }, () => [rand() * 400, rand() * 400, 0.4 + rand() * 1.1] as const);
  return (
    <Canvas sky={[p[0], p[1], p[2]]}>
      {(id) => (
        <>
          {stars.map(([x, y, r], i) => (
            <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#ffffff" opacity="0.75" />
          ))}
          <circle cx="200" cy="200" r="120" fill={p[3]} opacity="0.35" filter={`url(#${id}-blur)`} />
          <ellipse cx="200" cy="200" rx="160" ry="34" fill="none" stroke={p[4]} strokeWidth="10" opacity="0.5" transform="rotate(-18 200 200)" />
          <circle cx="200" cy="200" r="86" fill={p[3]} />
          <path d="M120 170 C170 160 230 185 285 172 M116 210 C170 200 240 225 284 212 M130 245 C180 238 220 255 270 246" stroke={p[4]} strokeWidth="9" strokeLinecap="round" opacity="0.6" fill="none" />
          <circle cx="170" cy="168" r="70" fill="#ffffff" opacity="0.12" />
          <path d="M46 248 A160 34 -18 0 0 354 152" fill="none" stroke={p[4]} strokeWidth="10" opacity="0.9" />
        </>
      )}
    </Canvas>
  );
}

const items: LightboxItem[] = [
  { id: "lofoten", alt: "Snowy peaks above a calm fjord at sunrise", caption: "Reine, Lofoten. First light at 4:12 am.", width: 4, height: 5, art: <Peaks p={["#16324f", "#e88d7a", "#ffd6a5", "#2c3e63", "#13213a"]} /> },
  { id: "sahara", alt: "Orange dunes under a low desert sun", caption: "Erg Chebbi, Morocco. The wind changes the ridges every night.", width: 3, height: 2, art: <Dunes p={["#7a2e1d", "#e76f51", "#f4a261", "#c4572e", "#8c3b20"]} /> },
  { id: "moonsea", alt: "A full moon over a dark sea with a long reflection", caption: "Moonrise over the Baltic, from the ferry deck.", width: 1, height: 1, art: <NightSea seed={3} p={["#050a1f", "#1b2559", "#3c4c8f", "#b9b4ff", "#0a1030"]} /> },
  { id: "aurora", alt: "Green and violet aurora above a pine forest", caption: "Abisko, Sweden. KP 6 at 11:40 pm.", width: 2, height: 3, art: <Aurora seed={11} p={["#020617", "#0b1d3a", "#123b4a", "#34d399", "#a78bfa"]} /> },
  { id: "tokyo", alt: "A city skyline at dusk with lit windows", caption: "Shinjuku from the 45th floor, blue hour.", width: 3, height: 4, art: <City seed={21} p={["#1e1b4b", "#7c3aed", "#f472b6", "#fde68a", "#312e81"]} /> },
  { id: "poppy", alt: "Close-up of soft pink and orange petals", caption: "Garden study no. 4, f/1.8.", width: 1, height: 1, art: <Bloom p={["#fde2e4", "#fbcfe8", "#fb923c", "#f472b6", "#fb7185"]} /> },
  { id: "saturn", alt: "A ringed planet in a field of stars", caption: "Telescope composite, 3 hours of exposure.", width: 4, height: 3, art: <Planet seed={8} p={["#020617", "#0f172a", "#1e293b", "#f59e0b", "#fcd34d"]} /> },
  { id: "patagonia", alt: "Blue jagged mountains under a pale morning sky", caption: "Torres del Paine, the day the clouds lifted.", width: 3, height: 2, art: <Peaks p={["#a5c8ff", "#dbe7ff", "#fff1e6", "#4a6fa5", "#1f3a5f"]} /> },
  { id: "namib", alt: "Red dunes in the late afternoon", caption: "Sossusvlei, Namibia. Climbed Dune 45 for this.", width: 4, height: 5, art: <Dunes p={["#3b0d2e", "#b5338a", "#ff9f68", "#a0342b", "#5a1a1e"]} /> },
  { id: "tromso", alt: "Teal aurora curling over dark trees", caption: "Tromsø, a quiet night at minus 18.", width: 16, height: 9, art: <Aurora seed={29} p={["#01030b", "#06263a", "#0b3d4f", "#22d3ee", "#4ade80"]} /> },
  { id: "lagoon", alt: "A warm moon rising over a lagoon", caption: "Low tide on the lagoon, just after sunset.", width: 2, height: 3, art: <NightSea seed={14} p={["#2a0b3d", "#7b2d6b", "#f08a5d", "#ffd3a5", "#24112e"]} /> },
  { id: "dahlia", alt: "Close-up of violet and blue petals", caption: "Garden study no. 9, after the rain.", width: 3, height: 4, art: <Bloom p={["#e0e7ff", "#c7d2fe", "#4f46e5", "#8b5cf6", "#38bdf8"]} /> },
];

export default function LightboxGalleryDemo() {
  const gallery = useRef<LightboxGalleryHandle>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <div className="w-full py-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Field notes, 2026</h2>
          <p className="text-sm text-muted" aria-live="polite">
            {viewing === null ? `${items.length} photos. Tap one to open it.` : `Viewing ${viewing + 1} of ${items.length}: ${items[viewing].caption}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => gallery.current?.open(0, { slideshow: true })}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-[opacity,scale] hover:opacity-90 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
            <path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" />
          </svg>
          Play slideshow
        </button>
      </div>
      <LightboxGallery ref={gallery} items={items} label="Field notes photos" onIndexChange={setViewing} />
    </div>
  );
}
