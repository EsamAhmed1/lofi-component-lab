"use client";

import { useState } from "react";
import { TagInput, type TagItem } from "@/components/ui/tag-input";

const SKILLS: TagItem[] = [
  { id: "react", label: "React", color: "#38bdf8" },
  { id: "typescript", label: "TypeScript", color: "#3178c6" },
  { id: "javascript", label: "JavaScript", color: "#eab308" },
  { id: "nextjs", label: "Next.js", color: "#71717a" },
  { id: "tailwind", label: "Tailwind CSS", color: "#06b6d4" },
  { id: "node", label: "Node.js", color: "#22c55e" },
  { id: "vue", label: "Vue", color: "#10b981" },
  { id: "svelte", label: "Svelte", color: "#f97316" },
  { id: "angular", label: "Angular", color: "#dc2626" },
  { id: "solid", label: "SolidJS", color: "#4f72c0" },
  { id: "astro", label: "Astro", color: "#a855f7" },
  { id: "remix", label: "Remix" },
  { id: "graphql", label: "GraphQL", color: "#e535ab" },
  { id: "rest", label: "REST APIs" },
  { id: "postgres", label: "PostgreSQL", color: "#336791" },
  { id: "mysql", label: "MySQL" },
  { id: "mongodb", label: "MongoDB", color: "#16a34a" },
  { id: "redis", label: "Redis", color: "#dc382d" },
  { id: "prisma", label: "Prisma" },
  { id: "drizzle", label: "Drizzle ORM" },
  { id: "python", label: "Python", color: "#3776ab" },
  { id: "django", label: "Django" },
  { id: "fastapi", label: "FastAPI", color: "#059669" },
  { id: "go", label: "Go", color: "#00add8" },
  { id: "rust", label: "Rust", color: "#ce422b" },
  { id: "swift", label: "Swift", color: "#f05138" },
  { id: "kotlin", label: "Kotlin", color: "#7f52ff" },
  { id: "docker", label: "Docker", color: "#2496ed" },
  { id: "kubernetes", label: "Kubernetes", color: "#326ce5" },
  { id: "aws", label: "AWS", color: "#f59e0b" },
  { id: "gcp", label: "Google Cloud" },
  { id: "vercel", label: "Vercel" },
  { id: "terraform", label: "Terraform", color: "#7b42bc" },
  { id: "github-actions", label: "GitHub Actions" },
  { id: "playwright", label: "Playwright", color: "#2ead33" },
  { id: "vitest", label: "Vitest" },
  { id: "storybook", label: "Storybook", color: "#ff4785" },
  { id: "figma", label: "Figma", color: "#a259ff" },
  { id: "a11y", label: "Accessibility" },
  { id: "webgl", label: "WebGL" },
  { id: "three", label: "Three.js" },
];

const CONTACTS: TagItem[] = [
  { id: "maya@northwind.io", label: "maya@northwind.io", description: "Maya Chen" },
  { id: "omar@northwind.io", label: "omar@northwind.io", description: "Omar Haddad" },
  { id: "lena.fischer@acme.co", label: "lena.fischer@acme.co", description: "Lena Fischer" },
  { id: "dev@kiteworks.dev", label: "dev@kiteworks.dev", description: "Kiteworks team" },
  { id: "sam.ortiz@acme.co", label: "sam.ortiz@acme.co", description: "Sam Ortiz" },
  { id: "billing@northwind.io", label: "billing@northwind.io", description: "Billing" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function TagInputDemo() {
  const [skills, setSkills] = useState<TagItem[]>(SKILLS.filter((s) => ["react", "typescript", "tailwind"].includes(s.id)));
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="@container w-full py-6 pb-24">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setSaved(data.getAll("skills").join(", ") || "nothing");
          }}
        >
          <TagInput
            label="Skills"
            name="skills"
            suggestions={SKILLS}
            value={skills}
            onChange={(next) => {
              setSkills(next);
              setSaved(null);
            }}
            maxTags={8}
            placeholder="Search 40 skills or type your own…"
            description="Try “pgsql”, a duplicate, or paste “Go, Rust; Docker”."
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-transform hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring active:scale-95 motion-reduce:transition-none"
            >
              Save profile
            </button>
            <p className="min-w-0 text-sm text-muted" aria-live="polite">
              {saved ? (
                <>
                  Form sent <code className="font-mono text-foreground">skills={saved}</code>
                </>
              ) : (
                `${skills.length} selected`
              )}
            </p>
          </div>
        </form>

        <TagInput
          label="Email recipients"
          suggestions={CONTACTS}
          defaultValue={[CONTACTS[0]]}
          maxSuggestions={5}
          placeholder="name@company.com"
          description="Separate addresses with a comma. Invalid addresses are rejected."
          validate={(value) => (EMAIL.test(value) ? null : `“${value}” is not a valid email address.`)}
        />

        <TagInput
          label="Topics (locked by an admin)"
          defaultValue={["Design systems", "Motion", "Onboarding"]}
          disabled
          description="You can't change topics on a published post."
        />
      </div>
    </div>
  );
}
