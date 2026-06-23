// GraphContext - query-first codebase orientation contract.
// This is intentionally adapter-shaped: Graphify is the recommended producer, but any tool that
// writes GRAPH_REPORT.md + graph.json can satisfy the same receipt.
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export type GraphContextStatus = "ready" | "missing" | "stale";

export type GraphContextReceipt = {
  status: GraphContextStatus;
  projectRoot: string;
  graphDir: string;
  reportPath: string;
  graphPath: string;
  generatedAt?: string;
  nodeCount: number;
  edgeCount: number;
  communityCount?: number;
  staleReasons: string[];
  queryCommand: string;
  updateCommand: string;
  evidenceRefs: Array<{ type: "file" | "command"; ref: string; note?: string }>;
};

export type InspectGraphContextArgs = {
  projectRoot: string;
  graphDir?: string;
  maxAgeMs?: number;
  sourcePaths?: string[];
};

function inside(root: string, candidate: string) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!!rel && !rel.startsWith("..") && !isAbsolute(rel));
}

function readGraphCounts(graphPath: string) {
  try {
    const parsed = JSON.parse(readFileSync(graphPath, "utf8")) as {
      nodes?: Array<{ community?: string | number }>;
      edges?: unknown[];
      links?: unknown[];
    };
    const communities = new Set(
      (parsed.nodes ?? [])
        .map((node) => node.community)
        .filter((community): community is string | number => community !== undefined),
    );
    return {
      nodeCount: parsed.nodes?.length ?? 0,
      edgeCount: parsed.edges?.length ?? parsed.links?.length ?? 0,
      communityCount: communities.size || undefined,
    };
  } catch {
    return { nodeCount: 0, edgeCount: 0, communityCount: undefined };
  }
}

function shellQuote(value: string) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

export function inspectGraphContext(args: InspectGraphContextArgs): GraphContextReceipt {
  const projectRoot = resolve(args.projectRoot);
  const graphDir = resolve(args.graphDir ?? join(projectRoot, "graphify-out"));
  const reportPath = join(graphDir, "GRAPH_REPORT.md");
  const graphPath = join(graphDir, "graph.json");
  const staleReasons: string[] = [];

  if (!inside(projectRoot, graphDir)) {
    staleReasons.push("graph-dir-outside-project-root");
  }

  const reportExists = existsSync(reportPath);
  const graphExists = existsSync(graphPath);
  if (!reportExists) staleReasons.push("missing-GRAPH_REPORT.md");
  if (!graphExists) staleReasons.push("missing-graph.json");

  let generatedAt: string | undefined;
  let graphMtime = 0;
  if (reportExists && graphExists) {
    const reportStat = statSync(reportPath);
    const graphStat = statSync(graphPath);
    graphMtime = Math.min(reportStat.mtimeMs, graphStat.mtimeMs);
    generatedAt = new Date(graphMtime).toISOString();

    if (args.maxAgeMs && Date.now() - graphMtime > args.maxAgeMs) {
      staleReasons.push("graph-older-than-max-age");
    }

    for (const sourcePath of args.sourcePaths ?? []) {
      const resolvedSource = resolve(projectRoot, sourcePath);
      if (inside(projectRoot, resolvedSource) && existsSync(resolvedSource)) {
        const sourceMtime = statSync(resolvedSource).mtimeMs;
        if (sourceMtime > graphMtime) staleReasons.push(`source-newer-than-graph:${sourcePath}`);
      }
    }
  }

  const counts = graphExists ? readGraphCounts(graphPath) : { nodeCount: 0, edgeCount: 0, communityCount: undefined };
  const status: GraphContextStatus =
    staleReasons.some((reason) => reason.startsWith("missing") || reason === "graph-dir-outside-project-root")
      ? "missing"
      : staleReasons.length > 0
        ? "stale"
        : "ready";

  return {
    status,
    projectRoot,
    graphDir,
    reportPath,
    graphPath,
    generatedAt,
    ...counts,
    staleReasons,
    queryCommand: `graphify query ${shellQuote("<question>")}`,
    updateCommand: "graphify update .",
    evidenceRefs: [
      { type: "file", ref: reportPath, note: "architecture communities, god nodes, suggested questions" },
      { type: "file", ref: graphPath, note: "queryable graph backing targeted codebase questions" },
      { type: "command", ref: "graphify query <question>", note: "query first before raw grep/read for architecture questions" },
    ],
  };
}

export function requireGraphContext(receipt: GraphContextReceipt, phase: string) {
  if (receipt.status !== "ready") {
    throw new Error(
      `Graph context is ${receipt.status}; phase '${phase}' must not proceed without a ready graph (${receipt.staleReasons.join(", ") || "no receipt"}).`,
    );
  }
}

export function graphQueryPlan(question: string, receipt: GraphContextReceipt) {
  requireGraphContext(receipt, "graph-query");
  return {
    command: `graphify query ${shellQuote(question)}`,
    evidenceRefs: receipt.evidenceRefs,
    rule: "Use the graph answer to choose files/symbols, then read only the cited files needed for the edit.",
  };
}
