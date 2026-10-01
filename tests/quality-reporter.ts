import { writeFileSync } from "node:fs";
import path from "node:path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

interface Row {
  project: string;
  status: TestResult["status"];
  paths: string[];
  axeViolations: number;
}

/** Writes a summary the site reads to show "tested in" badges. */
export default class QualityReporter implements Reporter {
  private rows: Row[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name ?? "unknown";
    const paths =
      test.title === "home page" ? ["/"]
      : test.title === "components index" ? ["/components"]
      : test.title === "agent logs" ? ["/logs"]
      : test.annotations.filter((a) => a.type === "component").map((a) => a.description ?? "");
    const axeViolations = test.annotations
      .filter((a) => a.type === "axe-violations")
      .reduce((sum, a) => sum + Number(a.description ?? 0), 0);
    this.rows.push({ project, status: result.status, paths, axeViolations });
  }

  onEnd(result: FullResult) {
    const byPath: Record<string, { passed: string[]; failed: string[] }> = {};
    for (const row of this.rows) {
      for (const p of row.paths) {
        byPath[p] ??= { passed: [], failed: [] };
        (row.status === "passed" ? byPath[p].passed : byPath[p].failed).push(row.project);
      }
    }
    const summary = {
      generatedAt: new Date().toISOString(),
      generatedOn: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }),
      status: result.status,
      projects: [...new Set(this.rows.map((r) => r.project))].sort(),
      axeViolations: this.rows.reduce((sum, r) => sum + r.axeViolations, 0),
      pages: byPath,
    };
    writeFileSync(
      path.join(process.cwd(), "src", "registry", "quality.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
  }
}
