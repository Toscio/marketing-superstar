import type { AuditDepth } from "./types.js";

export type RulePack = "core" | "standard" | "deep";

export type DepthProfile = {
  id: AuditDepth;
  label: string;
  summary: string;
  maxPages: number;
  packs: RulePack[];
};

export const DEPTH_PROFILES: Record<AuditDepth, DepthProfile> = {
  scan: {
    id: "scan",
    label: "Scan",
    summary:
      "Quick look before a meeting: indexation, titles, headings, sitemap, llms.txt presence, obvious conversion breaks.",
    maxPages: 8,
    packs: ["core"],
  },
  standard: {
    id: "standard",
    label: "Standard",
    summary:
      "Typical engagement: on-page quality, schema, conversion, search intent, duplicates, internal links, security headers, article trust.",
    maxPages: 40,
    packs: ["core", "standard"],
  },
  deep: {
    id: "deep",
    label: "Deep",
    summary:
      "Full review: redirect chains, indexation conflicts, orphans, click depth, thin content, competitors, entity, measurement baseline, multi-engine AI search.",
    maxPages: 120,
    packs: ["core", "standard", "deep"],
  },
};

export function depthProfile(depth: AuditDepth): DepthProfile {
  return DEPTH_PROFILES[depth];
}
