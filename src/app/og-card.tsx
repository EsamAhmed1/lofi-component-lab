import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

interface OgCardProps {
  eyebrow: string;
  title: string;
  description: string;
  chips?: string[];
}

/** Shared 1200×630 social card (Discord, X, LinkedIn previews). Satori needs flex on every multi-child div. */
// The built-in font has no glyph for some symbols, and fetching one fails at build time.
const plain = (text: string) => text.replace(/⌘/g, "Cmd ");

export function ogCard({ eyebrow, title, description, chips = [] }: OgCardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f4f4f5",
          background:
            "radial-gradient(circle at 15% 10%, #6d28d9 0%, transparent 45%), radial-gradient(circle at 90% 90%, #db2777 0%, transparent 40%), #09090b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#c4b5fd" }}>
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#a78bfa",
              color: "#0b0613",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            L
          </div>
          {eyebrow}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{plain(title)}</div>
          <div style={{ fontSize: 32, lineHeight: 1.35, color: "#d4d4d8", maxWidth: 1000 }}>{plain(description)}</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {chips.map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                fontSize: 26,
                padding: "8px 20px",
                borderRadius: 999,
                border: "2px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    ogSize,
  );
}
