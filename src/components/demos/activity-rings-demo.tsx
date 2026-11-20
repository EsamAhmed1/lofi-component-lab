"use client";

import { useState } from "react";
import { ActivityRings, type ActivityDay, type ActivityRing } from "@/components/ui/activity-rings";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const rings: ActivityRing[] = [
  {
    id: "move",
    label: "Move",
    value: 420,
    goal: 500,
    unit: "kcal",
    colors: ["#e11d48", "#fb7185"],
    icon: (
      <svg {...iconProps}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    ),
  },
  {
    id: "exercise",
    label: "Exercise",
    value: 38,
    goal: 30,
    unit: "min",
    colors: ["#65a30d", "#bef264"],
    icon: (
      <svg {...iconProps}>
        <path d="M5 17l5-5 3 3 6-6M15 9h4v4" />
      </svg>
    ),
  },
  {
    id: "stand",
    label: "Stand",
    value: 9,
    goal: 12,
    unit: "hr",
    colors: ["#0891b2", "#67e8f9"],
    icon: (
      <svg {...iconProps}>
        <path d="M12 4v16M7 9l5-5 5 5" />
      </svg>
    ),
  },
];

const days: ActivityDay[] = [
  { label: "Mon", fullLabel: "Monday", values: { move: 512, exercise: 34, stand: 12 } },
  { label: "Tue", fullLabel: "Tuesday", values: { move: 288, exercise: 12, stand: 8 } },
  { label: "Wed", fullLabel: "Wednesday", values: { move: 640, exercise: 52, stand: 13 } },
  { label: "Thu", fullLabel: "Thursday", values: { move: 455, exercise: 27, stand: 10 } },
  { label: "Fri", fullLabel: "Friday", values: { move: 190, exercise: 6, stand: 5 } },
  { label: "Sat", fullLabel: "Saturday", values: { move: 760, exercise: 71, stand: 11 } },
  { label: "Sun", fullLabel: "Sunday (today)", values: { move: 420, exercise: 38, stand: 9 } },
];

export default function ActivityRingsDemo() {
  const [day, setDay] = useState(days.length - 1);

  return (
    <div className="@container flex w-full max-w-3xl flex-col gap-6 py-6">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.4)] sm:p-7">
        <ActivityRings
          title="This week"
          rings={rings}
          days={days}
          selectedDay={day}
          onSelectDay={setDay}
        />
      </div>

      <div className="grid gap-6 @xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <ActivityRings
            title="Compact, no legend"
            rings={rings}
            size={200}
            thickness={16}
            gap={4}
            showLegend={false}
          />
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5">
          <ActivityRings
            title="Static, two rings"
            rings={[
              { id: "focus", label: "Focus", value: 3.5, goal: 4, unit: "hr", colors: ["#7c3aed", "#c4b5fd"] },
              { id: "water", label: "Water", value: 2.6, goal: 2, unit: "L", colors: ["#2563eb", "#93c5fd"] },
            ]}
            size={180}
            thickness={22}
            gap={5}
            animate={false}
          />
        </div>
      </div>
    </div>
  );
}
