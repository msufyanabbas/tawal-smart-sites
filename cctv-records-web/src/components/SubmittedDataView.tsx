import {
  type ImagedSerialTag,
  type Site,
  RmsScope,
  SiteUnitsPayload,
} from "@/types";
import { useState } from "react";
// All unit arrays surfaced in the admin/manager read-only view. Order matches
// the field-entry form so the two views feel familiar.
const SUBMITTED_GROUPS: Array<{
  key: keyof SiteUnitsPayload;
  label: string;
}> = [
  { key: "rmsUnits", label: "RMS Units" },
  { key: "expanderUnits", label: "Expanders" },
  { key: "simCards", label: "SIM Cards" },
  { key: "fenceLockUnits", label: "Fence Locks" },
  { key: "oduUnits", label: "ODUs" },
  { key: "smartMeterUnits", label: "Smart Meters" },
  { key: "ctSplitUnits", label: "CT Splits" },
  { key: "silboGatewayUnits", label: "Silbo Gateways" },
];

// ── Manager assignment ──────────────────────────────────────────────────────

const ZoomableImage: React.FC<{ src: string; alt: string }> = ({
  src,
  alt,
}) => {
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

export const SubmittedDataView: React.FC<{ site: Site }> = ({ site }) => {
  const groups = SUBMITTED_GROUPS.map((g) => ({
    ...g,
    units: ((site as any)[g.key] as ImagedSerialTag[] | undefined) ?? [],
  })).filter((g) => g.units.length > 0);

  const isSimSwap = site.rmsScope === RmsScope.SIM_SWAP;
  const hasSimSwapPairs = isSimSwap && (site.simSwapPairs?.length ?? 0) > 0;
  const hasSimSwapFields =
    isSimSwap &&
    (site.simSwapSiteType ||
      site.simSwapComments ||
      hasSimSwapPairs ||
      !!site.simSwapCtMainPhoto ||
      !!site.simSwapMeterPhoto);

  // Check if there are material details to show
  const m = site?.materials;
  const hasMaterialDetails =
    !!m &&
    ((m.numberOfRms ?? 0) > 0 ||
      (m.numberOfExpanders ?? 0) > 0 ||
      (m.numberOfSims ?? 0) > 0 ||
      (m.numberOfFenceLocks ?? 0) > 0 ||
      (m.numberOfShelterLocks ?? 0) > 0 ||
      (m.numberOfOdus ?? 0) > 0 ||
      (m.numberOfSmartMeters ?? 0) > 0 ||
      (m.numberOfCtSplits ?? 0) > 0 ||
      (m.numberOfSilboGateways ?? 0) > 0);

  if (groups.length === 0 && !hasSimSwapFields && !hasMaterialDetails) {
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
      {/* Material Details */}
      {hasMaterialDetails && (
        <div className="card">
          <div className="card-body space-y-3">
            <h3 className="card-title">Material Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {(m?.numberOfRms ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    RMS
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfRms}
                  </p>
                </div>
              )}
              {(m?.numberOfExpanders ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Expanders
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfExpanders}
                  </p>
                </div>
              )}
              {(m?.numberOfSims ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    SIMs
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfSims}
                  </p>
                </div>
              )}
              {(m?.numberOfFenceLocks ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Fence Locks
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfFenceLocks}
                  </p>
                </div>
              )}
              {(m?.numberOfShelterLocks ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Shelter Locks
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfShelterLocks}
                  </p>
                </div>
              )}
              {(m?.numberOfOdus ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    ODUs
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfOdus}
                  </p>
                </div>
              )}
              {(m?.numberOfSmartMeters ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Smart Meters
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfSmartMeters}
                  </p>
                </div>
              )}
              {(m?.numberOfCtSplits ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    CT Splits
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfCtSplits}
                  </p>
                </div>
              )}
              {(m?.numberOfSilboGateways ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Silbo Gateways
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {m?.numberOfSilboGateways}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIM Swap Fields */}
      {hasSimSwapFields && (
        <div className="card">
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b pb-3">
              {/* CT Main Photo */}
              {site.simSwapCtMainPhoto && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                    CT Main Photo
                  </p>
                  <ZoomableImage
                    src={site.simSwapCtMainPhoto}
                    alt="CT Main Photo"
                  />
                </div>
              )}

              {/* Meter Photo */}
              {site.simSwapMeterPhoto && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                    Meter Photo
                  </p>
                  <ZoomableImage
                    src={site.simSwapMeterPhoto}
                    alt="Meter Photo"
                  />
                </div>
              )}
            </div>
            <h3 className="card-title">SIM Swap Details</h3>

            {site.simSwapComments && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Comments
                </p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {site.simSwapComments}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {site.simSwapSiteType && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Site Type
                  </p>
                  <p className="mt-0.5 font-medium text-slate-800">
                    {site.simSwapSiteType === "green_field"
                      ? "Green Field"
                      : "Roof Top"}
                  </p>
                </div>
              )}

              {typeof site.simSwapLatitude === "number" &&
                typeof site.simSwapLongitude === "number" && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Location
                    </p>
                    <p className="mt-0.5 font-medium text-slate-800">
                      {site.simSwapLatitude}, {site.simSwapLongitude}
                    </p>
                  </div>
                )}
            </div>

            {site.simSwapTenants && site.simSwapTenants.length > 0 && (
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-700">
                  Tenant Details
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {site.simSwapTenants.map((t, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-3 bg-slate-50/50"
                    >
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Tenant #{idx + 1}
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Tenant Name
                          </p>
                          <p className="mt-0.5 font-medium text-slate-800">
                            {t.tenantName || (
                              <span className="italic text-slate-400">
                                Not specified
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                            Tenant CT Capacity
                          </p>
                          {(() => {
                            const capacities = t.tenantCtCapacities ?? [];
                            const phasePhotos = t.ctPhasePhotos ?? [];
                            return [1, 2, 3].map((phaseNum) => (
                              <div key={phaseNum} className="mb-3">
                                <p className="text-sm text-slate-700">
                                  Phase #{phaseNum}:{" "}
                                  <span className="font-semibold text-slate-800">
                                    {capacities[phaseNum - 1] || (
                                      <span className="italic text-slate-400">
                                        Not specified
                                      </span>
                                    )}
                                  </span>
                                </p>
                                {!!phasePhotos[phaseNum - 1] && (
                                  <div className="mt-1">
                                    <ZoomableImage
                                      src={phasePhotos[phaseNum - 1]}
                                      alt={`Phase #${phaseNum} photo`}
                                    />
                                  </div>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasSimSwapPairs && (
              <div className="space-y-4 mt-4">
                {site.simSwapPairs!.map((pair, idx) => {
                  const hasNew =
                    !!pair.newSerialNumber || !!pair.newSerialImage;
                  const hasOld =
                    !!pair.oldSerialNumber || !!pair.oldSerialImage;

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        SIM Pair #{idx + 1}
                      </p>

                      <div className="grid gap-6 md:grid-cols-2">
                        {/* New SIM */}
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-600 border-b pb-1">
                            New SIM
                          </p>
                          {!hasNew ? (
                            <p className="text-sm italic text-slate-500">
                              No data.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {pair.newSerialNumber && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500">
                                    Serial Number
                                  </p>
                                  <p className="mt-0.5 font-medium text-slate-800 break-all">
                                    {pair.newSerialNumber}
                                  </p>
                                </div>
                              )}
                              {pair.newSerialImage && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                    Image
                                  </p>
                                  <ZoomableImage
                                    src={pair.newSerialImage}
                                    alt={`New SIM #${idx + 1}`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Old SIM */}
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-600 border-b pb-1">
                            Old SIM
                          </p>
                          {!hasOld ? (
                            <p className="text-sm italic text-slate-500">
                              No data.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {pair.oldSerialNumber && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500">
                                    Serial Number
                                  </p>
                                  <p className="mt-0.5 font-medium text-slate-800 break-all">
                                    {pair.oldSerialNumber}
                                  </p>
                                </div>
                              )}
                              {pair.oldSerialImage && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                    Image
                                  </p>
                                  <ZoomableImage
                                    src={pair.oldSerialImage}
                                    alt={`Old SIM #${idx + 1}`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Units */}
      {groups.map((g) => {
        const singular = g.label.endsWith("s") ? g.label.slice(0, -1) : g.label;
        return (
          <div key={g.key} className="card">
            <div className="card-body space-y-3">
              <h3 className="card-title">
                {g.label} ({g.units.length})
              </h3>
              <div className="space-y-4">
                {g.units.map((u, idx) => {
                  const hasAny =
                    !!u.serialNumber ||
                    !!u.serialImage ||
                    !!u.tagNumber ||
                    !!u.tagImage;
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        {singular} #{idx + 1}
                      </p>
                      {!hasAny ? (
                        <p className="text-sm italic text-slate-500">
                          No data submitted.
                        </p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {u.serialNumber && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Serial number
                              </p>
                              <p className="mt-0.5 font-medium text-slate-800 break-all">
                                {u.serialNumber}
                              </p>
                            </div>
                          )}
                          {u.tagNumber && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                Tag number
                              </p>
                              <p className="mt-0.5 font-medium text-slate-800 break-all">
                                {u.tagNumber}
                              </p>
                            </div>
                          )}
                          {u.serialImage && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                Serial image
                              </p>
                              <ZoomableImage
                                src={u.serialImage}
                                alt={`${singular} #${idx + 1} serial`}
                              />
                            </div>
                          )}
                          {u.tagImage && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                Tag image
                              </p>
                              <ZoomableImage
                                src={u.tagImage}
                                alt={`${singular} #${idx + 1} tag`}
                              />
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
