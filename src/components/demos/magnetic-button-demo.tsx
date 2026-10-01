"use client";

import { useState } from "react";
import { MagneticButton } from "@/components/ui/magnetic-button";

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" />
    </svg>
  );
}

export default function MagneticButtonDemo() {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  const save = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setCount((c) => c + 1);
    }, 1600);
  };

  return (
    <div className="flex w-full flex-col items-center gap-10 py-6">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <MagneticButton size="lg" rightIcon={<Arrow />}>
          Get started
        </MagneticButton>
        <MagneticButton variant="outline" size="lg" leftIcon={<Spark />}>
          See what&apos;s new
        </MagneticButton>
        <MagneticButton variant="ghost" size="lg">
          Talk to sales
        </MagneticButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <MagneticButton size="sm">Small</MagneticButton>
        <MagneticButton size="md">Medium</MagneticButton>
        <MagneticButton size="lg">Large</MagneticButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <MagneticButton loading={loading} onClick={save} loadingLabel="Saving changes">
          {count === 0 ? "Save changes" : `Saved ${count}×`}
        </MagneticButton>
        <MagneticButton variant="outline" disabled>
          Disabled
        </MagneticButton>
        <MagneticButton variant="outline" strength={0}>
          No magnet
        </MagneticButton>
      </div>

      <div className="w-full max-w-sm">
        <MagneticButton fullWidth strength={6} rightIcon={<Arrow />}>
          Full width on mobile
        </MagneticButton>
      </div>
    </div>
  );
}
