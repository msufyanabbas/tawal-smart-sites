/* eslint-disable prettier/prettier */
import { ImagedSerialTag, RmsScope, Site } from '../../site/site.schema';

/**
 * One equipment type that belongs in the report, together with the units the
 * technician actually captured for it.
 *
 * This mirrors `relevantUnitGroups()` in the mobile app
 * (cctv-records-app-for-new/src/screens/SiteDetailScreen.tsx) so the deck
 * contains exactly the equipment types the field form asked for. If that
 * function changes, change this one too.
 */
export interface RfpUnitGroup {
  /** The Site key the units live under, e.g. `smartMeterUnits`. */
  key: keyof Site;
  /** Display name, e.g. "Smart Meters". */
  label: string;
  /** Singular form used on the per-unit slides, e.g. "Smart Meter". */
  singular: string;
  /** Count the admin planned for. May differ from `units.length`. */
  expected: number;
  /** Whether this equipment type carries a tag as well as a serial. */
  hasTag: boolean;
  /** Units the technician submitted. */
  units: ImagedSerialTag[];
}

interface GroupSpec {
  key: keyof Site;
  label: string;
  singular: string;
  expected: number;
  hasTag: boolean;
}

const readUnits = (site: Site, key: keyof Site): ImagedSerialTag[] => {
  const raw = site[key];
  return Array.isArray(raw) ? (raw as ImagedSerialTag[]) : [];
};

/**
 * True when a unit has anything worth putting on a slide. Units are
 * pre-allocated by count on the client, so a site expecting 9 CT splits can
 * easily carry 9 blank objects — those must not become 9 empty slides.
 */
export const unitHasContent = (u?: ImagedSerialTag): boolean =>
  !!u &&
  !!(
    (u.serialNumber && u.serialNumber.trim()) ||
    (u.tagNumber && u.tagNumber.trim()) ||
    (u.serialImage && u.serialImage.trim()) ||
    (u.tagImage && u.tagImage.trim())
  );

/**
 * Which equipment types apply to a site, keyed off its scope — the same
 * branching the field-entry form uses.
 */
const specsForScope = (site: Site): GroupSpec[] => {
  const out: GroupSpec[] = [];
  const scope = site.rmsScope;

  const rmsCore = () => {
    out.push({ key: 'rmsUnits', label: 'RMS Units', singular: 'RMS Unit', expected: site.numberOfRms, hasTag: true });
    out.push({ key: 'expanderUnits', label: 'Expanders', singular: 'Expander', expected: site.numberOfExpanders, hasTag: true });
    out.push({ key: 'simCards', label: 'SIM Cards', singular: 'SIM Card', expected: site.numberOfSims, hasTag: false });
  };
  const smartLock = () => {
    out.push({ key: 'fenceLockUnits', label: 'Fence Locks', singular: 'Fence Lock', expected: site.numberOfFenceLocks, hasTag: true });
    out.push({ key: 'oduUnits', label: 'ODUs', singular: 'ODU', expected: site.numberOfOdus, hasTag: false });
  };
  const smartMeter = (withGateway: boolean) => {
    out.push({ key: 'smartMeterUnits', label: 'Smart Meters', singular: 'Smart Meter', expected: site.numberOfSmartMeters, hasTag: true });
    out.push({ key: 'ctSplitUnits', label: 'CT Splits', singular: 'CT Split', expected: site.numberOfCtSplits, hasTag: true });
    if (withGateway) {
      out.push({ key: 'silboGatewayUnits', label: 'Silbo Gateways', singular: 'Silbo Gateway', expected: site.numberOfSilboGateways, hasTag: true });
    }
  };

  if (scope === RmsScope.RMS) {
    rmsCore();
    if (site.hasSmartLock) smartLock();
    if (site.hasSmartMeter) smartMeter(false);
  } else if (scope === RmsScope.SMART_LOCK) {
    smartLock();
  } else if (scope === RmsScope.SMART_METER) {
    smartMeter(true);
    out.push({ key: 'simCards', label: 'SIM Cards', singular: 'SIM Card', expected: site.numberOfSims, hasTag: false });
  } else if (scope === RmsScope.SIM_SWAP) {
    if (site.hasSmartLock) smartLock();
    if (site.hasSmartMeter) smartMeter(true);
  } else if (scope === RmsScope.CCTV) {
    out.push({ key: 'cctvCameraUnits', label: 'CCTV Cameras', singular: 'CCTV Camera', expected: site.numberOfCameras, hasTag: true });
    out.push({ key: 'hardDiskUnits', label: 'Hard Disks', singular: 'Hard Disk', expected: site.numberOfHardDisks, hasTag: true });
    out.push({ key: 'nvrUnits', label: 'NVRs', singular: 'NVR', expected: site.numberOfNvr, hasTag: true });
  }

  return out;
};

/**
 * Every unit array on the Site, used as a safety net so a technician's data
 * still reaches the report if it was captured under a scope the site has since
 * been switched away from. Nothing is silently dropped from a signed-off deck.
 */
const ALL_SPECS: Array<Omit<GroupSpec, 'expected'>> = [
  { key: 'rmsUnits', label: 'RMS Units', singular: 'RMS Unit', hasTag: true },
  { key: 'expanderUnits', label: 'Expanders', singular: 'Expander', hasTag: true },
  { key: 'simCards', label: 'SIM Cards', singular: 'SIM Card', hasTag: false },
  { key: 'fenceLockUnits', label: 'Fence Locks', singular: 'Fence Lock', hasTag: true },
  { key: 'oduUnits', label: 'ODUs', singular: 'ODU', hasTag: false },
  { key: 'smartMeterUnits', label: 'Smart Meters', singular: 'Smart Meter', hasTag: true },
  { key: 'ctSplitUnits', label: 'CT Splits', singular: 'CT Split', hasTag: true },
  { key: 'silboGatewayUnits', label: 'Silbo Gateways', singular: 'Silbo Gateway', hasTag: true },
  { key: 'cctvCameraUnits', label: 'CCTV Cameras', singular: 'CCTV Camera', hasTag: true },
  { key: 'hardDiskUnits', label: 'Hard Disks', singular: 'Hard Disk', hasTag: true },
  { key: 'nvrUnits', label: 'NVRs', singular: 'NVR', hasTag: true },
];

/**
 * Resolve the equipment sections for a site: scope-relevant types first, in
 * the order the field form presents them, then any other type that
 * unexpectedly holds data. Types with no captured units are dropped.
 */
export const resolveUnitGroups = (site: Site): RfpUnitGroup[] => {
  const groups: RfpUnitGroup[] = [];
  const seen = new Set<string>();

  const push = (spec: GroupSpec) => {
    if (seen.has(spec.key as string)) return;
    seen.add(spec.key as string);
    const units = readUnits(site, spec.key).filter(unitHasContent);
    if (!units.length) return;
    groups.push({ ...spec, units });
  };

  for (const spec of specsForScope(site)) push(spec);

  for (const spec of ALL_SPECS) {
    if (seen.has(spec.key as string)) continue;
    const units = readUnits(site, spec.key).filter(unitHasContent);
    if (!units.length) continue;
    groups.push({ ...spec, expected: units.length, units });
    seen.add(spec.key as string);
  }

  return groups;
};
