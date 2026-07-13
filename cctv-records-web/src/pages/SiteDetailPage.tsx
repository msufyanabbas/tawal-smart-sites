import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import {
  useAcceptSiteMutation,
  useAssignSiteMutation,
  useDeleteSiteMutation,
  useReviewSiteMutation,
  useUpdateSiteMutation,
  useSaveSiteDraftMutation,
  useSiteQuery,
  useSubmitSiteMutation,
} from '@/hooks/useSites';
import { useUsersQuery } from '@/hooks/useUsers';
import { FullPageSpinner } from '@/components/Spinner';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { ImageUploadField } from '@/components/ImageUploadField';
import {
  type ImagedSerialTag,
  Role,
  RmsScope,
  type SimSwapSiteType,
  type SiteUnitsPayload,
  type Site,
} from '@/types';
import {
  STATUS_STEPS,
  apiErrorMessage,
  formatDateTime,
  roleLabel,
  rmsScopeLabel,
} from '@/utils/helpers';

// ── Helpers ─────────────────────────────────────────────────────────────────

const emptyUnits = (count: number): ImagedSerialTag[] =>
  Array.from({ length: Math.max(count, 0) }, () => ({}));

type UnitGroupKey =
  | 'rmsUnits'
  | 'expanderUnits'
  | 'simCards'
  | 'fenceLockUnits'
  | 'oduUnits'
  | 'smartMeterUnits'
  | 'ctSplitUnits'
  | 'silboGatewayUnits';

interface UnitGroup {
  key: UnitGroupKey;
  label: string;
  count: number;
  needs: { serial: boolean; tag: boolean };
}

// Which unit arrays are relevant given the site scope + smart lock/meter flags.
const relevantUnitGroups = (site: Site): UnitGroup[] => {
  const out: UnitGroup[] = [];
  if (site.rmsScope === RmsScope.RMS) {
    out.push({ key: 'rmsUnits', label: 'RMS Units', count: site.numberOfRms, needs: { serial: true, tag: true } });
    out.push({ key: 'expanderUnits', label: 'Expanders', count: site.numberOfExpanders, needs: { serial: true, tag: true } });
    out.push({ key: 'simCards', label: 'SIM Cards', count: site.numberOfSims, needs: { serial: true, tag: false } });
    if (site.hasSmartLock) {
      out.push({ key: 'fenceLockUnits', label: 'Fence Locks', count: site.numberOfFenceLocks, needs: { serial: true, tag: true } });
      out.push({ key: 'oduUnits', label: 'ODUs', count: site.numberOfOdus, needs: { serial: true, tag: false } });
    }
    if (site.hasSmartMeter) {
      out.push({ key: 'smartMeterUnits', label: 'Smart Meters', count: site.numberOfSmartMeters, needs: { serial: true, tag: true } });
      out.push({ key: 'ctSplitUnits', label: 'CT Splits', count: site.numberOfCtSplits, needs: { serial: true, tag: true } });
    }
  } else if (site.rmsScope === RmsScope.SMART_LOCK) {
    out.push({ key: 'fenceLockUnits', label: 'Fence Locks', count: site.numberOfFenceLocks, needs: { serial: true, tag: true } });
    out.push({ key: 'oduUnits', label: 'ODUs', count: site.numberOfOdus, needs: { serial: true, tag: false } });
  } else if (site.rmsScope === RmsScope.SMART_METER) {
    out.push({ key: 'smartMeterUnits', label: 'Smart Meters', count: site.numberOfSmartMeters, needs: { serial: true, tag: true } });
    out.push({ key: 'ctSplitUnits', label: 'CT Splits', count: site.numberOfCtSplits, needs: { serial: true, tag: true } });
    out.push({ key: 'silboGatewayUnits', label: 'Silbo Gateways', count: site.numberOfSilboGateways, needs: { serial: true, tag: true } });
    // Smart-meter sites always ship with one SIM card for the Silbo gateway.
    out.push({ key: 'simCards', label: 'SIM Cards', count: site.numberOfSims, needs: { serial: true, tag: false } });
  } else if (site.rmsScope === RmsScope.SIM_SWAP) {
    out.push({ key: 'simCards', label: 'SIM Cards', count: site.numberOfSims, needs: { serial: true, tag: false } });
      if (site.hasSmartLock) {
      out.push({ key: 'fenceLockUnits', label: 'Fence Locks', count: site.numberOfFenceLocks, needs: { serial: true, tag: true } });
      out.push({ key: 'oduUnits', label: 'ODUs', count: site.numberOfOdus, needs: { serial: true, tag: false } });
    }
    if (site.hasSmartMeter) {
      out.push({ key: 'smartMeterUnits', label: 'Smart Meters', count: site.numberOfSmartMeters, needs: { serial: true, tag: true } });
      out.push({ key: 'ctSplitUnits', label: 'CT Splits', count: site.numberOfCtSplits, needs: { serial: true, tag: true } });
      out.push({ key: 'silboGatewayUnits', label: 'Silbo Gateways', count: site.numberOfSilboGateways, needs: { serial: true, tag: true } });
  }
}
  return out;
};

// All unit arrays surfaced in the admin/manager read-only view. Order matches
// the field-entry form so the two views feel familiar.
const SUBMITTED_GROUPS: Array<{
  key: keyof SiteUnitsPayload;
  label: string;
}> = [
    { key: 'rmsUnits', label: 'RMS Units' },
    { key: 'expanderUnits', label: 'Expanders' },
    { key: 'simCards', label: 'SIM Cards' },
    { key: 'fenceLockUnits', label: 'Fence Locks' },
    { key: 'oduUnits', label: 'ODUs' },
    { key: 'smartMeterUnits', label: 'Smart Meters' },
    { key: 'ctSplitUnits', label: 'CT Splits' },
    { key: 'silboGatewayUnits', label: 'Silbo Gateways' },
  ];

// ── Status timeline ─────────────────────────────────────────────────────────

const StatusTimeline: React.FC<{ site: Site }> = ({ site }) => (
  <ol className="flex flex-wrap items-center gap-3">
    {STATUS_STEPS.map((step, i) => {
      const flag = site.status?.[step.key];
      const done = !!flag?.done;
      return (
        <li key={step.key} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={
                done
                  ? 'grid h-8 w-8 place-items-center rounded-full bg-green-500 text-white font-bold'
                  : 'grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-400 font-semibold'
              }
            >
              {i + 1}
            </span>
            <div>
              <p className={done ? 'text-sm font-semibold text-slate-800' : 'text-sm font-medium text-slate-500'}>
                {step.label}
              </p>
              {flag?.at && (
                <p className="text-xs text-slate-500">{formatDateTime(flag.at)}</p>
              )}
            </div>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <span className={done ? 'h-px w-6 bg-green-400' : 'h-px w-6 bg-slate-200'} />
          )}
        </li>
      );
    })}
  </ol>
);

// ── Read-only summary cards ─────────────────────────────────────────────────

const SiteInfoCard: React.FC<{ site: Site }> = ({ site }) => (
  <div className="card">
    <div className="card-body grid gap-3 md:grid-cols-3">
      <div><p className="text-xs uppercase text-slate-500">Tawal ID</p><p className="font-medium text-slate-800">{site.tawalId}</p></div>
      <div><p className="text-xs uppercase text-slate-500">Region</p><p className="font-medium text-slate-800">{site.region}</p></div>
      <div><p className="text-xs uppercase text-slate-500">City</p><p className="font-medium text-slate-800">{site.siteCity}</p></div>
      <div><p className="text-xs uppercase text-slate-500">TCN</p><p className="font-medium text-slate-800">{site.tcnNumber}</p></div>
      <div><p className="text-xs uppercase text-slate-500">Scope</p><p className="font-medium text-slate-800">{rmsScopeLabel(site.rmsScope)}</p></div>
      <div><p className="text-xs uppercase text-slate-500">Created</p><p className="font-medium text-slate-800">{formatDateTime(site.createdAt)}</p></div>
    </div>
  </div>
);

const CountsCard: React.FC<{ site: Site }> = ({ site }) => {
  const counts: Array<[string, number]> = [];
  const push = (label: string, val: number) => { if (val > 0) counts.push([label, val]); };
  push('RMS units', site.numberOfRms);
  push('Expanders', site.numberOfExpanders);
  push('SIMs', site.numberOfSims);
  push('Fence Locks', site.numberOfFenceLocks);
  push('ODUs', site.numberOfOdus);
  push('Tenants', site.numberOfTenants);
  push('Smart Meters', site.numberOfSmartMeters);
  push('CT Splits', site.numberOfCtSplits);
  push('Silbo Gateways', site.numberOfSilboGateways);

  if (counts.length === 0) return null;
  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title">Equipment counts</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {counts.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">{k}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Manager assignment ──────────────────────────────────────────────────────

const AssignPanel: React.FC<{ site: Site }> = ({ site }) => {
  const { data: techs = [], isLoading } = useUsersQuery(Role.TECHNICIAN);
  const assign = useAssignSiteMutation();
  const [techId, setTechId] = useState<string>(site.status?.assigned?.assignedTo ?? '');

  useEffect(() => {
    setTechId(site.status?.assigned?.assignedTo ?? '');
  }, [site._id, site.status?.assigned?.assignedTo]);

  const onAssign = async () => {
    if (!techId) return toast.error('Pick a technician');
    try {
      await assign.mutateAsync({ id: site._id, technicianId: techId });
      toast.success('Site assigned');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to assign'));
    }
  };

  return (
    <div className="card">
      <div className="card-body space-y-3">
        <h3 className="card-title">Assign to technician</h3>
        <SelectField
          label="Technician"
          placeholder={isLoading ? 'Loading…' : 'Pick a technician'}
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
          options={techs.map((t) => ({ value: t.id, label: `${t.name || t.email} (${t.email})` }))}
        />
        <Button onClick={onAssign} loading={assign.isPending}>
          {site.status?.assigned?.done ? 'Reassign' : 'Assign'}
        </Button>
      </div>
    </div>
  );
};

 

// ── Submitted data (admin/manager read-only) ────────────────────────────────

// Lightboxable image thumbnail — click toggles a fullscreen overlay.
const ZoomableImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block overflow-hidden rounded-lg border border-slate-200 transition hover:border-brand-500"
      >
        <img src={src} alt={alt} className="h-24 w-24 object-cover" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
        >
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

const SubmittedDataView: React.FC<{ site: Site }> = ({ site }) => {
  const groups = SUBMITTED_GROUPS
    .map((g) => ({ ...g, units: ((site as any)[g.key] as ImagedSerialTag[] | undefined) ?? [] }))
    .filter((g) => g.units.length > 0);

  if (groups.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">
          The technician has not submitted any field data for this site.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const singular = g.label.endsWith('s') ? g.label.slice(0, -1) : g.label;
        return (
          <div key={g.key} className="card">
            <div className="card-body space-y-3">
              <h3 className="card-title">{g.label} ({g.units.length})</h3>
              <div className="space-y-4">
                {g.units.map((u, idx) => {
                  const hasAny =
                    !!u.serialNumber || !!u.serialImage || !!u.tagNumber || !!u.tagImage;
                  return (
                    <div key={idx} className="rounded-lg border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        {singular} #{idx + 1}
                      </p>
                      {!hasAny ? (
                        <p className="text-sm italic text-slate-500">No data submitted.</p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {u.serialNumber && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Serial number</p>
                              <p className="mt-0.5 font-medium text-slate-800 break-all">{u.serialNumber}</p>
                            </div>
                          )}
                          {u.tagNumber && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Tag number</p>
                              <p className="mt-0.5 font-medium text-slate-800 break-all">{u.tagNumber}</p>
                            </div>
                          )}
                          {u.serialImage && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Serial image</p>
                              <ZoomableImage src={u.serialImage} alt={`${singular} #${idx + 1} serial`} />
                            </div>
                          )}
                          {u.tagImage && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tag image</p>
                              <ZoomableImage src={u.tagImage} alt={`${singular} #${idx + 1} tag`} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Technician field entry ──────────────────────────────────────────────────

const FieldEntryForm: React.FC<{ site: Site }> = ({ site }) => {
  const saveDraft = useSaveSiteDraftMutation();
  const submit = useSubmitSiteMutation();
  const readOnly = site.status?.completed?.done;

  const groups = useMemo(() => {
    let all = relevantUnitGroups(site);
    // Exclude simCards for SIM_SWAP scope since they use the dedicated SIM swap pairs form instead
    if (site.rmsScope === RmsScope.SIM_SWAP) {
      all = all.filter((g) => g.key !== 'simCards');
    }
    return all;
  }, [site]);

  const initial = useMemo<SiteUnitsPayload>(() => {
    const out: SiteUnitsPayload = {};
    for (const g of groups) {
      const existing = (site as any)[g.key] as ImagedSerialTag[] | undefined;
      const blanks = emptyUnits(g.count);
      const seeded = blanks.map((blank, i) => existing?.[i] ?? blank);
      (out as Record<UnitGroupKey, ImagedSerialTag[]>)[g.key] = seeded;
    }
    // carry over any existing SIM swap specific details
    (out as any).simSwapComments = (site as any).simSwapComments ?? '';
    (out as any).simSwapPairs = (site as any).simSwapPairs ?? [];
    (out as any).simSwapSiteType = (site as any).simSwapSiteType ?? '';
    (out as any).simSwapLatitude = (site as any).simSwapLatitude ?? null;
    (out as any).simSwapLongitude = (site as any).simSwapLongitude ?? null;
    return out;
  }, [site, groups]);

  const [values, setValues] = useState<SiteUnitsPayload>(initial);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState('');
  useEffect(() => { setValues(initial); }, [initial]);

  const updateUnit = (
    groupKey: UnitGroupKey,
    idx: number,
    patch: Partial<ImagedSerialTag>,
  ) => {
    setValues((prev) => {
      const arr = [...((prev[groupKey] as ImagedSerialTag[] | undefined) ?? [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [groupKey]: arr };
    });
  };

  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync({ id: site._id, payload: values as SiteUnitsPayload });
      toast.success('Draft saved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save draft'));
    }
  };

  const onGetLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }

    setLocationBusy(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValues((prev) => ({
          ...(prev ?? {}),
          simSwapLatitude: position.coords.latitude,
          simSwapLongitude: position.coords.longitude,
        }));
        setLocationBusy(false);
      },
      (error) => {
        setLocationBusy(false);
        setLocationError(error.message || 'Unable to fetch your current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const onSubmit = async () => {
    // Validate required SIM swap fields
    if (site.rmsScope === RmsScope.SIM_SWAP) {
      if (!(values as any).simSwapSiteType) {
        toast.error('Site type is required');
        return;
      }
    }
    if (!window.confirm('Submit field data? You will not be able to edit afterward.')) return;
    try {
      await submit.mutateAsync({ id: site._id, payload: values as SiteUnitsPayload });
      toast.success('Site submitted for review');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to submit'));
    }
  };

  if (groups.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">
          No field unit data is required for this scope.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="card-body">
          <label className="label" htmlFor="sim-swap-comments">
            Comments (optional)
          </label>
          <textarea
            id="sim-swap-comments"
            className="input min-h-[88px] resize-y"
            placeholder="Add any notes, comments or SIM swap details..."
            value={(values as any).simSwapComments ?? ''}
            onChange={(e) => setValues((prev) => ({ ...(prev ?? {}), simSwapComments: e.target.value }))}
            maxLength={2000}
            disabled={readOnly}
          />
        </div>
      </div>
      {site.rmsScope === RmsScope.SIM_SWAP && (
        <div className="card">
          <div className="card-body space-y-4">
            <h3 className="card-title">SIM swap details</h3>
            
            {/* SIM Pairs - repeat for each SIM */}
            {Array.from({ length: site.numberOfSims }, (_, i) => {
              const pairs = (values as any).simSwapPairs ?? [];
              const pair = pairs[i] ?? {};
              
              const updatePair = (idx: number, patch: Partial<typeof pair>) => {
                setValues((prev) => {
                  const newPairs = [...((prev as any).simSwapPairs ?? [])];
                  newPairs[idx] = { ...newPairs[idx], ...patch };
                  return { ...(prev ?? {}), simSwapPairs: newPairs };
                });
              };
              
              return (
                <div key={i} className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">SIM #{i + 1}</p>
                  
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="New SIM serial number"
                        value={pair.newSerialNumber ?? ''}
                        disabled={readOnly}
                        onChange={(e) => updatePair(i, { newSerialNumber: e.target.value })}
                      />
                      {!readOnly ? (
                        <ImageUploadField
                          label="New SIM image"
                          value={pair.newSerialImage}
                          onChange={(v) => updatePair(i, { newSerialImage: v })}
                        />
                      ) : pair.newSerialImage ? (
                        <div>
                          <p className="label">New SIM image</p>
                          <img src={pair.newSerialImage} alt="New SIM" className="h-24 w-24 rounded-lg object-cover" />
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField
                        label="Old SIM serial number"
                        value={pair.oldSerialNumber ?? ''}
                        disabled={readOnly}
                        onChange={(e) => updatePair(i, { oldSerialNumber: e.target.value })}
                      />
                      {!readOnly ? (
                        <ImageUploadField
                          label="Old SIM image"
                          value={pair.oldSerialImage}
                          onChange={(v) => updatePair(i, { oldSerialImage: v })}
                        />
                      ) : pair.oldSerialImage ? (
                        <div>
                          <p className="label">Old SIM image</p>
                          <img src={pair.oldSerialImage} alt="Old SIM" className="h-24 w-24 rounded-lg object-cover" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Site Type and Location - shown once */}
            <SelectField
              label="Site type *"
              placeholder="Select site type"
              value={(values as any).simSwapSiteType ?? ''}
              disabled={readOnly}
              onChange={(e) => setValues((prev) => ({ ...(prev ?? {}), simSwapSiteType: e.target.value as SimSwapSiteType }))}
              options={[
                { label: 'Green field', value: 'green_field' },
                { label: 'Roof top', value: 'roof_top' },
              ]}
            />
            <div className="space-y-2">
              {!readOnly && (
                <Button type="button" variant="secondary" onClick={onGetLocation} loading={locationBusy}>
                  Get current location
                </Button>
              )}
              {locationError && <p className="text-sm text-red-600">{locationError}</p>}
              {typeof (values as any).simSwapLatitude === 'number' && typeof (values as any).simSwapLongitude === 'number' && (
                <p className="text-sm text-slate-700 px-2 py-1 rounded-lg bg-slate-200">
                  Latitude: {(values as any).simSwapLatitude} | Longitude: {(values as any).simSwapLongitude}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {groups.map((g) => {
        const arr = (values[g.key] as ImagedSerialTag[] | undefined) ?? [];
        const singular = g.label.endsWith('s') ? g.label.slice(0, -1) : g.label;
        return (
          <div key={g.key} className="card">
            <div className="card-body space-y-3">
              <h3 className="card-title">{g.label} ({g.count})</h3>
              <div className="space-y-4">
                {arr.map((u, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      {singular} #{idx + 1}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {g.needs.serial && (
                        <>
                          <TextField
                            label="Serial number"
                            value={u.serialNumber ?? ''}
                            disabled={readOnly}
                            onChange={(e) => updateUnit(g.key, idx, { serialNumber: e.target.value })}
                          />
                          {!readOnly ? (
                            <ImageUploadField
                              label="Serial image"
                              value={u.serialImage}
                              onChange={(v) => updateUnit(g.key, idx, { serialImage: v })}
                            />
                          ) : u.serialImage ? (
                            <div>
                              <p className="label">Serial image</p>
                              <img src={u.serialImage} alt="" className="h-24 w-24 rounded-lg object-cover" />
                            </div>
                          ) : null}
                        </>
                      )}
                      {g.needs.tag && (
                        <>
                          <TextField
                            label="Tag number"
                            value={u.tagNumber ?? ''}
                            disabled={readOnly}
                            onChange={(e) => updateUnit(g.key, idx, { tagNumber: e.target.value })}
                          />
                          {!readOnly ? (
                            <ImageUploadField
                              label="Tag image"
                              value={u.tagImage}
                              onChange={(v) => updateUnit(g.key, idx, { tagImage: v })}
                            />
                          ) : u.tagImage ? (
                            <div>
                              <p className="label">Tag image</p>
                              <img src={u.tagImage} alt="" className="h-24 w-24 rounded-lg object-cover" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {arr.length === 0 && (
                  <p className="text-sm text-slate-500">No units configured for this group.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onSaveDraft} loading={saveDraft.isPending}>
            Save draft
          </Button>
          <Button type="button" onClick={onSubmit} loading={submit.isPending}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Main page ───────────────────────────────────────────────────────────────

export const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: site, isLoading, error } = useSiteQuery(id);
  const accept = useAcceptSiteMutation();
  const review = useReviewSiteMutation();
  const del = useDeleteSiteMutation();
console.log('site', site)
  // Free-text notes the reviewer can attach when approving. State is local —
  // the panel only renders while the site is reviewable, so we don't need
  // it sticking around after approval.
  const [reviewRemarks, setReviewRemarks] = useState('');

  if (isLoading) return <FullPageSpinner />;
  if (error || !site) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="card-body text-sm text-red-700">
          {apiErrorMessage(error, 'Site not found')}
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === Role.ADMIN;
  const isManager = user?.role === Role.MANAGER;
  const isTech = user?.role === Role.TECHNICIAN;

  const canAssign = isManager || isAdmin;
  const canAccept = isTech && site.status?.assigned?.done && !site.status?.processing?.done;
  const canReview = (isManager || isAdmin) && site.status?.completed?.done && !site.status?.reviewed?.done;
  const showFieldEntry = isTech && site.status?.processing?.done;
  const showSubmittedView =
    (isAdmin || isManager) &&
    (site.status?.completed?.done || site.status?.reviewed?.done);

  const onAccept = async () => {
    try {
      await accept.mutateAsync(site._id);
      toast.success('Site accepted — you can now enter field data');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to accept'));
    }
  };

  const onReview = async () => {
    try {
      await review.mutateAsync({ id: site._id, remarks: reviewRemarks });
      setReviewRemarks('');
      toast.success('Site approved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to review'));
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this site? This cannot be undone.')) return;
    try {
      await del.mutateAsync(site._id);
      toast.success('Site deleted');
      navigate('/sites', { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete site'));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{site.siteName}</h1>
          <p className="text-sm text-slate-500">
            {site.tawalId} · {site.region} · {rmsScopeLabel(site.rmsScope)}
          </p>
        </div>
        <div className="flex gap-2">
          {canAccept && (
            <Button onClick={onAccept} loading={accept.isPending}>Accept site</Button>
          )}
          {isAdmin && (
            <Link to={`/sites/${site._id}/edit`} className="btn-secondary">
              Edit site
            </Link>
          )}
          {isAdmin && (
            <Button variant="danger" onClick={onDelete} loading={del.isPending}>Delete</Button>
          )}
        </div>
      </header>

      <div className="card">
        <div className="card-body space-y-3">
          <StatusTimeline site={site} />
          {site.status?.reviewed?.done && site.status.reviewed.remarks && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Reviewer remarks
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                {site.status.reviewed.remarks}
              </p>
            </div>
          )}
        </div>
      </div>

      {canReview && (
        <div className="card">
          <div className="card-body space-y-3">
            <h3 className="card-title">Review submitted work</h3>
            <label className="label" htmlFor="review-remarks">
              Remarks (optional)
            </label>
            <textarea
              id="review-remarks"
              className="input min-h-[88px] resize-y"
              placeholder="Add any review notes or remarks..."
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              maxLength={2000}
              disabled={review.isPending}
            />
            <div className="flex justify-end">
              <Button onClick={onReview} loading={review.isPending}>
                Approve Work
              </Button>
            </div>
          </div>
        </div>
      )}

      <SiteInfoCard site={site} />
      <CountsCard site={site} />


      {canAssign && <AssignPanel site={site} />}

      {(showFieldEntry || (isTech && site.status?.completed?.done)) && (
        <FieldEntryForm site={site} />
      )}

      {showSubmittedView && <SubmittedDataView site={site} />}

      {isTech && !site.status?.processing?.done && (
        <div className="card">
          <div className="card-body text-sm text-slate-500">
            Accept the site to start entering field data.
          </div>
        </div>
      )}

      {user && (
        <p className="text-right text-xs text-slate-400">
          Signed in as {user.email} ({roleLabel(user.role)})
        </p>
      )}
    </div>
  );
};
