import { z } from "zod";

/** Priority tags matching the reference report style */
export const PrioritySchema = z.enum([
  "BLOCKER",
  "LAUNCH_DAY",
  "FIRST",
  "IMPORTANT",
  "NICE_TO_HAVE",
  "CONTEXT",
  "DECISION",
  "CHECK",
  "IN_GOOD_SHAPE",
  "NO_CONFLICT",
]);

export const PriorityLevelSchema = z.enum(["P0", "P1", "P2"]);

export const FindingCategorySchema = z.enum([
  "pre_launch",
  "technical",
  "content_keywords",
  "geo_ai",
  "entity_brand",
  "conversion",
  "cross_site",
  "ops_checklist",
]);

export const FindingSchema = z.object({
  id: z.string(),
  priority: PrioritySchema,
  level: PriorityLevelSchema,
  category: FindingCategorySchema,
  title: z.string(),
  effort: z.string().describe("Human estimate, e.g. '30 min', '2–3 h', 'ongoing'"),
  what: z.string(),
  why: z.string(),
  fix: z.string(),
  evidence: z.array(z.string()).default([]),
  relatedUrls: z.array(z.string()).default([]),
  artifacts: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(["redirect_map", "llms_txt", "schema_json", "checklist", "copy", "other"]),
        content: z.string(),
      }),
    )
    .default([]),
  /** Machine-readable action hint for implementing agents */
  agentAction: z
    .object({
      type: z.enum([
        "add_redirects",
        "add_file",
        "edit_html_meta",
        "edit_schema",
        "edit_copy",
        "configure_headers",
        "submit_gsc",
        "manual_check",
        "create_content",
        "other",
      ]),
      target: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const StatSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const SiteSectionSchema = z.object({
  siteId: z.string(),
  name: z.string(),
  primaryUrl: z.string(),
  stagingUrl: z.string().optional(),
  stats: z.array(StatSchema).default([]),
  alreadyDoneWell: z.array(z.string()).default([]),
  findings: z.array(FindingSchema).default([]),
});

export const TimelineRowSchema = z.object({
  when: z.string(),
  columns: z.record(z.string()),
});

export const AuditReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  title: z.string(),
  eyebrow: z.string(),
  lede: z.string(),
  meta: z.string(),
  generatedAt: z.string(),
  method: z.string(),
  summary: z.array(z.string()),
  sites: z.array(SiteSectionSchema),
  timeline: z.array(TimelineRowSchema).default([]),
  appendix: z
    .array(
      z.object({
        title: z.string(),
        kind: z.enum(["pre", "markdown", "json"]),
        content: z.string(),
      }),
    )
    .default([]),
  /** Flat list of actionable findings sorted for implementing agents */
  agentQueue: z.array(FindingSchema).default([]),
});

export const SiteConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  stagingUrl: z.string().url().optional(),
  language: z.string().default("en"),
  markets: z.array(z.string()).default(["US"]),
  brandNames: z.array(z.string()).default([]),
  legalName: z.string().optional(),
  competitors: z.array(z.string()).default([]),
  knownOldUrls: z.array(z.string()).default([]),
  focusKeywords: z.array(z.string()).default([]),
  geoQuestions: z.array(z.string()).default([]),
  relatedSiteIds: z.array(z.string()).default([]),
});

export const AuditConfigSchema = z.object({
  title: z.string(),
  client: z.string().optional(),
  sites: z.array(SiteConfigSchema).min(1),
  collectors: z
    .object({
      crawl: z.boolean().default(true),
      lighthouse: z.boolean().default(false),
      keywords: z.boolean().default(false),
      geoAi: z.boolean().default(false),
    })
    .default({}),
  notes: z.string().optional(),
});

export type Priority = z.infer<typeof PrioritySchema>;
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;
export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Stat = z.infer<typeof StatSchema>;
export type SiteSection = z.infer<typeof SiteSectionSchema>;
export type TimelineRow = z.infer<typeof TimelineRowSchema>;
export type AuditReport = z.infer<typeof AuditReportSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type AuditConfig = z.infer<typeof AuditConfigSchema>;

export const LEVEL_ORDER: Record<PriorityLevel, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};
