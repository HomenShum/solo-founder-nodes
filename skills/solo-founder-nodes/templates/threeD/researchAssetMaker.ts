import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

export type ResearchAssetSourceKind = "first-principles-functional-spec" | "text-prompt" | "user-owned-reference";

export type ResearchAssetManifest = {
  schemaVersion: 1;
  assetId: string;
  projectId: string;
  goal: string;
  generatedAt: string;
  source: {
    kind: ResearchAssetSourceKind;
    functionalSpecHash: string;
    deconstructionReceiptPath?: string;
    rawReplicaUsed: false;
    exactReplicaSource: false;
  };
  output: {
    format: "obj";
    primaryAssetPath: string;
    files: Array<{
      kind: "obj" | "manifest";
      path: string;
      sha256: string;
      bytes: number;
    }>;
  };
  restrictions: {
    personalResearchOnly: true;
    notProductionReady: true;
    exactReplicaExport: false;
    humanUseApproved: false;
    commercialUseApproved: false;
    requiresReviewBeforeUse: string[];
  };
  proof: {
    generatedFromFilteredSpec: true;
    containsMeshFromReplica: false;
    watermark: string;
    componentCount: number;
    limitations: string[];
  };
};

export type ResearchAssetMakerVerdict = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function makeResearchOnlyAsset(input: {
  goal: string;
  projectId: string;
  outputDir: string;
  functionalSpec?: string;
  deconstructionReceiptPath?: string;
  generatedAt?: string;
}): ResearchAssetManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const outputDir = resolve(input.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const functionalSpec = input.functionalSpec?.trim() || `Goal: ${input.goal}\nMode: personal research only\n`;
  const components = deriveComponents(functionalSpec, input.goal);
  const assetId = `research-asset-${slug(input.projectId)}-${shortHash(`${input.goal}\n${functionalSpec}`)}`;
  const obj = makeObj(assetId, components);
  const objPath = join(outputDir, `${assetId}.obj`);
  writeFileSync(objPath, obj, "utf8");

  const objFile = fileEntry("obj", objPath, outputDir);
  const manifest: ResearchAssetManifest = {
    schemaVersion: 1,
    assetId,
    projectId: input.projectId,
    goal: input.goal,
    generatedAt,
    source: {
      kind: input.deconstructionReceiptPath || input.functionalSpec ? "first-principles-functional-spec" : "text-prompt",
      functionalSpecHash: sha256Text(functionalSpec),
      deconstructionReceiptPath: input.deconstructionReceiptPath,
      rawReplicaUsed: false,
      exactReplicaSource: false,
    },
    output: {
      format: "obj",
      primaryAssetPath: objFile.path,
      files: [objFile],
    },
    restrictions: {
      personalResearchOnly: true,
      notProductionReady: true,
      exactReplicaExport: false,
      humanUseApproved: false,
      commercialUseApproved: false,
      requiresReviewBeforeUse: [
        "rights provenance review",
        "originality delta review",
        "asset validity/reopen proof",
        "hazard review before any physical or human use",
      ],
    },
    proof: {
      generatedFromFilteredSpec: true,
      containsMeshFromReplica: false,
      watermark: "PERSONAL_RESEARCH_ONLY__NOT_PRODUCTION_READY__NO_HUMAN_USE_APPROVAL",
      componentCount: components.length,
      limitations: [
        "Procedural scaffold, not photoreal reconstruction.",
        "Generated from filtered functional/text spec only.",
        "No exact replica mesh, source texture, logo, or decorative contour is carried forward.",
        "Not approved for commercial distribution, physical fabrication, safety-critical use, or human use.",
      ],
    },
  };

  const manifestPath = join(outputDir, `${assetId}.manifest.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export function verifyResearchAssetManifest(
  manifest: ResearchAssetManifest,
  options: { baseDir?: string; requireFiles?: boolean } = {},
): ResearchAssetMakerVerdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baseDir = options.baseDir ? resolve(options.baseDir) : process.cwd();
  const requireFiles = options.requireFiles ?? true;

  if (manifest.schemaVersion !== 1) errors.push("research asset manifest schemaVersion must be 1");
  if (!manifest.assetId?.trim()) errors.push("research asset manifest requires assetId");
  if (!manifest.projectId?.trim()) errors.push("research asset manifest requires projectId");
  if (!manifest.goal?.trim()) errors.push("research asset manifest requires goal");
  if (manifest.source.rawReplicaUsed !== false) errors.push("research asset maker must not use a raw replica mesh");
  if (manifest.source.exactReplicaSource !== false) errors.push("research asset maker must not export an exact replica source");
  if (!manifest.source.functionalSpecHash?.startsWith("sha256:")) errors.push("functional spec hash must be sha256-prefixed");
  if (manifest.source.kind === "text-prompt") warnings.push("text-prompt asset has no deconstruction receipt; use only for personal research scaffolds");
  if (manifest.source.kind === "first-principles-functional-spec" && !manifest.source.deconstructionReceiptPath) {
    warnings.push("first-principles source has no receipt path; attach deconstruction receipt before proof claim");
  }

  if (manifest.output.format !== "obj") errors.push("research asset maker currently supports OBJ output only");
  if (!manifest.output.primaryAssetPath?.endsWith(".obj")) errors.push("primary asset path must be an OBJ file");
  if (!manifest.output.files.some((file) => file.kind === "obj")) errors.push("research asset manifest must include an OBJ file entry");

  if (manifest.restrictions.personalResearchOnly !== true) errors.push("research asset must be personalResearchOnly");
  if (manifest.restrictions.notProductionReady !== true) errors.push("research asset must be marked notProductionReady");
  if (manifest.restrictions.exactReplicaExport !== false) errors.push("research asset must not allow exactReplicaExport");
  if (manifest.restrictions.humanUseApproved !== false) errors.push("research asset must not approve human use");
  if (manifest.restrictions.commercialUseApproved !== false) errors.push("research asset must not approve commercial use");
  if ((manifest.restrictions.requiresReviewBeforeUse ?? []).length < 3) errors.push("research asset must list review gates before use");

  if (manifest.proof.generatedFromFilteredSpec !== true) errors.push("research asset must be generated from filtered spec");
  if (manifest.proof.containsMeshFromReplica !== false) errors.push("research asset must not contain mesh from replica");
  if (!manifest.proof.watermark.includes("PERSONAL_RESEARCH_ONLY")) errors.push("research asset watermark must include PERSONAL_RESEARCH_ONLY");
  if (manifest.proof.componentCount < 1) errors.push("research asset must include at least one component");

  if (requireFiles) {
    for (const file of manifest.output.files ?? []) {
      const abs = resolve(baseDir, file.path);
      if (!existsSync(abs)) {
        errors.push(`research asset file does not exist: ${file.path}`);
        continue;
      }
      const actual = statSync(abs).size;
      if (actual !== file.bytes) errors.push(`research asset file size mismatch for ${file.path}`);
      if (`sha256:${sha256File(abs)}` !== file.sha256) errors.push(`research asset file hash mismatch for ${file.path}`);
      if (file.kind === "obj" && extname(abs).toLowerCase() !== ".obj") errors.push("OBJ file entry must point to .obj");
      if (file.kind === "obj" && actual < 200) errors.push("OBJ file is too small to be useful");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function deriveComponents(functionalSpec: string, goal: string) {
  const lines = functionalSpec
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /[a-z0-9]/i.test(line))
    .slice(0, 6);
  const seed = lines.length > 0 ? lines : [goal, "primary structure", "support interface", "research marker"];
  return seed.slice(0, 4).map((line, index) => ({
    name: slug(line).slice(0, 24) || `component-${index + 1}`,
    width: 1 + (line.length % 5) * 0.2,
    height: 0.35 + (index % 3) * 0.2,
    depth: 0.7 + (line.length % 3) * 0.2,
    x: index * 1.6,
    y: index % 2 === 0 ? 0 : 0.35,
    z: 0,
  }));
}

function makeObj(assetId: string, components: ReturnType<typeof deriveComponents>) {
  const out: string[] = [
    `# ${assetId}`,
    "# Generated by Solo Founder research asset maker",
    "# PERSONAL_RESEARCH_ONLY__NOT_PRODUCTION_READY__NO_HUMAN_USE_APPROVAL",
    "# Procedural geometry from filtered functional spec; no raw replica mesh or source textures.",
    "mtllib research-materials.mtl",
    "",
  ];
  let vertexBase = 1;
  for (const component of components) {
    out.push(`o ${component.name}`);
    const vertices = cuboidVertices(component.x, component.y, component.z, component.width, component.height, component.depth);
    for (const v of vertices) out.push(`v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(3)}`);
    const faces = [
      [1, 2, 3, 4],
      [5, 8, 7, 6],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 8, 4],
      [4, 8, 5, 1],
    ];
    for (const f of faces) out.push(`f ${f.map((i) => i + vertexBase - 1).join(" ")}`);
    out.push("");
    vertexBase += vertices.length;
  }
  return `${out.join("\n")}\n`;
}

function cuboidVertices(x: number, y: number, z: number, width: number, height: number, depth: number) {
  const x2 = x + width;
  const y2 = y + height;
  const z2 = z + depth;
  return [
    [x, y, z],
    [x2, y, z],
    [x2, y2, z],
    [x, y2, z],
    [x, y, z2],
    [x2, y, z2],
    [x2, y2, z2],
    [x, y2, z2],
  ];
}

function fileEntry(kind: "obj" | "manifest", absPath: string, baseDir: string) {
  const bytes = statSync(absPath).size;
  return {
    kind,
    path: relativePath(baseDir, absPath),
    sha256: `sha256:${sha256File(absPath)}`,
    bytes,
  };
}

function relativePath(baseDir: string, absPath: string) {
  return absPath.startsWith(baseDir) ? absPath.slice(baseDir.length).replace(/^[/\\]/, "").replace(/\\/g, "/") : absPath.replace(/\\/g, "/");
}

function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset";
}
