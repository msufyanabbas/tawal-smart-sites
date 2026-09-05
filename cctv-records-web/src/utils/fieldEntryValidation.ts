import { z } from "zod";
import { RmsScope, type Site } from "@/types";

// ── Primitives ─────────────────────────────────────────────────────────────

const requiredStr = z
  .string({ required_error: "This field is required" })
  .trim()
  .min(1, "This field is required");

// ── Reusable unit item schemas ─────────────────────────────────────────────

export const unitSerialAndTagSchema = z.object({
  serialNumber: requiredStr,
  tagNumber: requiredStr,
  serialImage: z.string().optional(),
  tagImage: z.string().optional(),
});

export const unitSerialOnlySchema = z.object({
  serialNumber: requiredStr,
  serialImage: z.string().optional(),
  tagNumber: z.string().optional(),
  tagImage: z.string().optional(),
});

export const simSwapPairSchema = z.object({
  newSerialNumber: requiredStr,
  oldSerialNumber: requiredStr,
  newSerialImage: z.string().optional(),
  oldSerialImage: z.string().optional(),
});

// ── Unit group type ────────────────────────────────────────────────────────

export interface UnitGroupMeta {
  key: string;
  label: string;
  count: number;
  needs: { serial: boolean; tag: boolean };
}

// ── Dynamic schema builder ─────────────────────────────────────────────────

/**
 * Builds a Zod schema tailored to the site's scope and active unit groups.
 * Ensures paths are [groupKey, index, fieldName] so inline field errors can be mapped.
 */
export function buildFieldEntrySchema(site: Site, groups: UnitGroupMeta[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape: Record<string, z.ZodTypeAny> = {};

  // ── SIM Swap fields ──────────────────────────────────────────────────────
  if (site.rmsScope === RmsScope.SIM_SWAP) {
    shape.simSwapSiteType = z.enum(["green_field", "roof_top"], {
      required_error: "Site type is required",
      invalid_type_error: "Site type is required",
    });

    shape.simSwapPairs = z.any().superRefine((val, ctx) => {
      const pairs = Array.isArray(val) ? val : [];
      for (let i = 0; i < site.numberOfSims; i++) {
        const pair = (pairs[i] ?? {}) as Record<string, unknown>;
        if (!String(pair.newSerialNumber ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, "newSerialNumber"],
            message: "New SIM serial number is required",
          });
        }
        if (!String(pair.oldSerialNumber ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, "oldSerialNumber"],
            message: "Old SIM serial number is required",
          });
        }
      }
    });
  }

  // ── Unit groups ──────────────────────────────────────────────────────────
  for (const g of groups) {
    shape[g.key] = z.any().superRefine((val, ctx) => {
      const arr = Array.isArray(val) ? val : [];
      for (let i = 0; i < g.count; i++) {
        const u = (arr[i] ?? {}) as Record<string, unknown>;
        if (g.needs.serial && !String(u.serialNumber ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, "serialNumber"],
            message: "Serial number is required",
          });
        }
        if (g.needs.tag && !String(u.tagNumber ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, "tagNumber"],
            message: "Tag number is required",
          });
        }
      }
    });
  }

  return z.object(shape).passthrough();
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Returns all validation errors keyed by dotted path, e.g. "rmsUnits.0.serialNumber" */
export function getZodFieldErrors(
  result: z.SafeParseReturnType<unknown, unknown>,
): Record<string, string> {
  if (result.success) return {};
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/** Returns the first Zod error message, or null if validation passed. */
export function getFirstZodError(
  result: z.SafeParseReturnType<unknown, unknown>,
): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Validation failed";
}
