import { z } from 'zod';
import { RmsScope } from '@/types';

const nonNegInt = z.coerce.number().int().min(0);

// Single zod schema covering the create form. Scope-specific count fields
// stay optional in the schema and are validated/cleaned in the submit handler
// (which calls the backend, which authoritatively re-derives counts).
export const siteCreateSchema = z.object({
  siteName: z.string().trim().min(1, 'Site name is required'),
  tawalId: z
    .string()
    .trim()
    .min(1, 'Tawal ID is required')
    .regex(/^\d+$/, 'Tawal ID must be numeric'),
  region: z.string().trim().min(1, 'Region is required'),
  siteCity: z.string().trim().min(1, 'City is required'),
  tcnNumber: z.string().trim().min(1, 'TCN is required'),
  rmsScope: z.nativeEnum(RmsScope, { errorMap: () => ({ message: 'Scope is required' }) }),

  numberOfRms: nonNegInt.optional(),
  numberOfExpanders: nonNegInt.optional(),
  numberOfSims: nonNegInt.optional(),

  hasSmartLock: z.boolean().optional(),
  numberOfFenceLocks: nonNegInt.optional(),
  numberOfOdus: nonNegInt.optional(),

  hasSmartMeter: z.boolean().optional(),
  numberOfTenants: nonNegInt.optional(),
  comments: z.string().optional(),
});

export type SiteCreateValues = z.infer<typeof siteCreateSchema>;

// One smart meter serves up to three tenants — round up so partial groups
// still get a meter (e.g. 1 tenant still gets 1 meter, 4 tenants get 2).
export const smartMetersFor = (tenants: number): number => {
  if (tenants <= 0) return 0;
  return Math.ceil(tenants / 3);
};

// Compute the read-only derived counts client-side for live preview only.
// The backend is the source of truth.
export const deriveCounts = (
  scope: RmsScope | undefined,
  tenants?: number,
): { smartMeters: number; ctSplits: number; silboGateways: number; sims: number } => {
  const t = tenants ?? 0;
  const smartMeters = smartMetersFor(t);
  const ctSplits = t * 3;
  // Silbo gateway is a fixed appliance (one per site) and ships with one SIM.
  const silboGateways = scope === RmsScope.SMART_METER ? 1 : 0;
  const sims = scope === RmsScope.SMART_METER ? 1 : 0;
  return { smartMeters, ctSplits, silboGateways, sims };
};

// Unit field-entry validation: each unit's serial/tag/images are optional —
// the technician may submit partial data and the "Save Draft" path always
// passes through. "Submit" itself is gated client-side by emptiness checks
// only at the discretion of the page.
export const unitSchema = z.object({
  serialNumber: z.string().optional(),
  serialImage: z.string().optional(),
  tagNumber: z.string().optional(),
  tagImage: z.string().optional(),
});

export const unitsPayloadSchema = z.object({
  rmsUnits: z.array(unitSchema).optional(),
  expanderUnits: z.array(unitSchema).optional(),
  simCards: z.array(unitSchema).optional(),
  fenceLockUnits: z.array(unitSchema).optional(),
  oduUnits: z.array(unitSchema).optional(),
  smartMeterUnits: z.array(unitSchema).optional(),
  ctSplitUnits: z.array(unitSchema).optional(),
  silboGatewayUnits: z.array(unitSchema).optional(),
});

export type UnitsValues = z.infer<typeof unitsPayloadSchema>;
