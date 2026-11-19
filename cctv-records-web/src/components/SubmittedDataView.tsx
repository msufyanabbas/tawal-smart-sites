import {
  type ImagedSerialTag,
  type MeterLineDetails,
  type AssignedTenantOnSiteDetails,
  type Site,
  RmsScope,
  SiteUnitsPayload,
} from "@/types";
import { ZoomableImage } from "@/components/ZoomableImage";

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
  { key: "cctvCameraUnits", label: "CCTV Cameras" },
  { key: "hardDiskUnits", label: "Hard Disks" },
  { key: "nvrUnits", label: "NVRs" },
];

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

  const hasOtherSitePhotos = (site.otherSitePhotos?.length ?? 0) > 0;
  const assignedTenants: AssignedTenantOnSiteDetails[] =
    site.assignedTenantsOnSIteDetails &&
    site.assignedTenantsOnSIteDetails.length > 0
      ? site.assignedTenantsOnSIteDetails
      : ((site.simSwapTenants ?? []) as any);
  const hasAssignedTenants = assignedTenants.length > 0;
  const hasTenants = (site.simSwapTenants?.length ?? 0) > 0 || hasAssignedTenants;
  const hasSmartMeterGroup = groups.some((g) => g.key === "smartMeterUnits");

  const hasMeterLineData = (d?: MeterLineDetails) =>
    !!d &&
    Boolean(
      d.redLineVoltage ||
        d.yellowLineVoltage ||
        d.blueLineVoltage ||
        d.redLineCurrent ||
        d.yellowLineCurrent ||
        d.blueLineCurrent ||
        d.redLineVoltageImage ||
        d.yellowLineVoltageImage ||
        d.blueLineVoltageImage ||
        d.redLineCurrentImage ||
        d.yellowLineCurrentImage ||
        d.blueLineCurrentImage,
    );

  const renderTenantDetailsSection = () => {
    if (!hasAssignedTenants) return null;
    const tenants = assignedTenants;
    const sections = [
      {
        key: "smartMeterDetails" as const,
        title: "Smart Meter Details",
        shortVoltage: "SM",
        shortCurrent: "SM",
      },
      {
        key: "multiMeterDetails" as const,
        title: "Multi Meter Details",
        shortVoltage: "Multi Meter",
        shortCurrent: "Clamp Meter",
      },
      {
        key: "itocDetails" as const,
        title: "ITOC Details",
        shortVoltage: "iTOC",
        shortCurrent: "ITOC",
      },
    ] as const;

    const lines = [
      {
        code: "R",
        name: "Red Line",
        badgeClass: "bg-red-100 text-red-700 border-red-200",
        voltageKey: "redLineVoltage" as const,
        voltageImageKey: "redLineVoltageImage" as const,
        currentKey: "redLineCurrent" as const,
        currentImageKey: "redLineCurrentImage" as const,
        voltageLabel: "Red Line Voltage",
        voltageImageLabel: "Red Line Voltage Image",
        currentLabel: "Red Line Current",
        currentImageLabel: "Red Line Current Image",
      },
      {
        code: "Y",
        name: "Yellow Line",
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
        voltageKey: "yellowLineVoltage" as const,
        voltageImageKey: "yellowLineVoltageImage" as const,
        currentKey: "yellowLineCurrent" as const,
        currentImageKey: "yellowLineCurrentImage" as const,
        voltageLabel: "Yellow Line Voltage",
        voltageImageLabel: "Yellow Line Voltage Image",
        currentLabel: "Yellow Line Current",
        currentImageLabel: "Yellow Line Current Image",
      },
      {
        code: "B",
        name: "Blue Line",
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        voltageKey: "blueLineVoltage" as const,
        voltageImageKey: "blueLineVoltageImage" as const,
        currentKey: "blueLineCurrent" as const,
        currentImageKey: "blueLineCurrentImage" as const,
        voltageLabel: "Blue Line Voltage",
        voltageImageLabel: "Blue Line Voltage Image",
        currentLabel: "Blue Line Current",
        currentImageLabel: "Blue Line Current Image",
      },
    ] as const;

    return (
      <div className="space-y-5">
        <div className="card">
          <div className="card-body space-y-3">
            <h3 className="card-title">Tenant Details ({tenants.length})</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {tenants.map((t, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tenant {idx + 1}
                  </p>
                  <p className="font-medium text-slate-800">
                    {t.tenantName || (
                      <span className="italic text-slate-400">
                        Not specified
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {tenants.map((tenant, idx) => {
          const sm = tenant.smartMeterDetails ?? {};
          const mm = tenant.multiMeterDetails ?? {};
          const itoc = tenant.itocDetails ?? {};
          const hasAnyForTenant =
            Boolean(tenant.tenantName) ||
            hasMeterLineData(sm) ||
            hasMeterLineData(mm) ||
            hasMeterLineData(itoc);
          if (!hasAnyForTenant) return null;

          const tenantLabel = tenant.tenantName
            ? `Tenant ${idx + 1} — ${tenant.tenantName}`
            : `Tenant ${idx + 1}`;

          return (
            <div
              key={idx}
              className="rounded-xl border-2 border-slate-200 bg-slate-50/40 p-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-800">
                  {tenantLabel} — Meter Readings
                </h3>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                  {tenantLabel}
                </span>
              </div>

              {/* Summary Table: Voltage (SM / Multi Meter / iTOC) & Current (SM / Clamp Meter / ITOC) */}
              <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th
                        colSpan={3}
                        className="bg-slate-900 text-white font-bold py-2 px-3 text-center border-r border-slate-700"
                      >
                        Voltage
                      </th>
                      <th
                        colSpan={3}
                        className="bg-emerald-800 text-white font-bold py-2 px-3 text-center"
                      >
                        Current
                      </th>
                    </tr>
                    <tr>
                      <th className="bg-sky-100 text-slate-800 font-semibold py-1.5 px-3 border border-slate-300 text-center">
                        SM
                      </th>
                      <th className="bg-sky-100 text-slate-800 font-semibold py-1.5 px-3 border border-slate-300 text-center">
                        Multi Meter
                      </th>
                      <th className="bg-sky-100 text-slate-800 font-semibold py-1.5 px-3 border border-slate-300 text-center">
                        iTOC
                      </th>
                      <th className="bg-emerald-100 text-slate-800 font-semibold py-1.5 px-3 border border-slate-300 text-center">
                        SM
                      </th>
                      <th className="bg-emerald-100 text-slate-800 font-semibold py-1.5 px-3 border border-slate-300 text-center">
                        Clamp Meter (Multi Meter)
                      </th>
                      <th className="bg-emerald-100 text-slate-800 font-semibold py-1.5 px-3 border border-slate-300 text-center">
                        ITOC
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[
                        {
                          r: sm.redLineVoltage,
                          y: sm.yellowLineVoltage,
                          b: sm.blueLineVoltage,
                        },
                        {
                          r: mm.redLineVoltage,
                          y: mm.yellowLineVoltage,
                          b: mm.blueLineVoltage,
                        },
                        {
                          r: itoc.redLineVoltage,
                          y: itoc.yellowLineVoltage,
                          b: itoc.blueLineVoltage,
                        },
                        {
                          r: sm.redLineCurrent,
                          y: sm.yellowLineCurrent,
                          b: sm.blueLineCurrent,
                        },
                        {
                          r: mm.redLineCurrent,
                          y: mm.yellowLineCurrent,
                          b: mm.blueLineCurrent,
                        },
                        {
                          r: itoc.redLineCurrent,
                          y: itoc.yellowLineCurrent,
                          b: itoc.blueLineCurrent,
                        },
                      ].map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border border-slate-300 p-2.5 align-top font-mono text-slate-700 space-y-1"
                        >
                          <div>
                            <span className="font-bold text-red-600">R-</span>{" "}
                            {cell.r || "-"}
                          </div>
                          <div>
                            <span className="font-bold text-amber-600">Y-</span>{" "}
                            {cell.y || "-"}
                          </div>
                          <div>
                            <span className="font-bold text-blue-600">B-</span>{" "}
                            {cell.b || "-"}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {sections.map((sec) => {
                const d = tenant[sec.key];
                if (!hasMeterLineData(d)) return null;
                return (
                  <div key={sec.key} className="card">
                    <div className="card-body space-y-4">
                      <h4 className="card-title text-sm">
                        {sec.title} ({tenantLabel})
                      </h4>
                      <div className="space-y-3">
                        {lines.map((line) => {
                          const vVal = d?.[line.voltageKey];
                          const vImg = d?.[line.voltageImageKey];
                          const cVal = d?.[line.currentKey];
                          const cImg = d?.[line.currentImageKey];
                          return (
                            <div
                              key={line.code}
                              className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3"
                            >
                              <div>
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${line.badgeClass}`}
                                >
                                  {line.code}- {line.name}
                                </span>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500">
                                    {line.voltageLabel} ({sec.shortVoltage})
                                  </p>
                                  <p className="mt-0.5 font-medium text-slate-800 break-all">
                                    {vVal || (
                                      <span className="italic text-slate-400">
                                        Not specified
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                    {line.voltageImageLabel}
                                  </p>
                                  {vImg ? (
                                    <ZoomableImage
                                      src={vImg}
                                      alt={line.voltageImageLabel}
                                    />
                                  ) : (
                                    <p className="text-sm italic text-slate-400">
                                      No image uploaded
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500">
                                    {line.currentLabel} ({sec.shortCurrent})
                                  </p>
                                  <p className="mt-0.5 font-medium text-slate-800 break-all">
                                    {cVal || (
                                      <span className="italic text-slate-400">
                                        Not specified
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                    {line.currentImageLabel}
                                  </p>
                                  {cImg ? (
                                    <ZoomableImage
                                      src={cImg}
                                      alt={line.currentImageLabel}
                                    />
                                  ) : (
                                    <p className="text-sm italic text-slate-400">
                                      No image uploaded
                                    </p>
                                  )}
                                </div>
                              </div>
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
        })}
      </div>
    );
  };

  if (
    groups.length === 0 &&
    !hasSimSwapFields &&
    !hasMaterialDetails &&
    !hasOtherSitePhotos &&
    !hasTenants
  ) {
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

            {site.simSwapTenants &&
              site.simSwapTenants.length > 0 &&
              !hasSmartMeterGroup && (
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
          <div key={g.key} className="space-y-5">
            <div className="card">
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

            {g.key === "smartMeterUnits" && renderTenantDetailsSection()}
          </div>
        );
      })}

      {/* Fallback Tenant Details when no Smart Meter group or SIM Swap card rendered it */}
      {hasTenants &&
        !hasSmartMeterGroup &&
        !hasSimSwapFields &&
        renderTenantDetailsSection()}

      {/* CCTV Site Installation Images */}
      {(site.rmsScope === RmsScope.CCTV ||
        !!site.cctvNvrPhoto ||
        !!site.cctvNvrMainBoxPhoto ||
        !!site.cctvCameraPhoto ||
        !!site.cctvHardDiskPhoto ||
        (site.cctvCameraPhotos && site.cctvCameraPhotos.length > 0) ||
        (site.cctvHardDiskPhotos && site.cctvHardDiskPhotos.length > 0) ||
        !!site.cctvFullSitePhoto) && (
        <div className="card">
          <div className="card-body space-y-4">
            <h3 className="card-title">Site Installation Images</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {site.cctvNvrPhoto && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    NVR Photo
                  </p>
                  <ZoomableImage src={site.cctvNvrPhoto} alt="NVR Photo" />
                </div>
              )}
              {site.cctvNvrMainBoxPhoto && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    NVR Main Box Photo
                  </p>
                  <ZoomableImage
                    src={site.cctvNvrMainBoxPhoto}
                    alt="NVR Main Box Photo"
                  />
                </div>
              )}
              {(() => {
                const photos =
                  site.cctvCameraPhotos && site.cctvCameraPhotos.length > 0
                    ? site.cctvCameraPhotos
                    : site.cctvCameraPhoto
                      ? [site.cctvCameraPhoto]
                      : [];
                return photos.map((url, idx) => {
                  if (!url) return null;
                  const label =
                    photos.length > 1
                      ? `CCTV Camera #${idx + 1} Photo`
                      : "CCTV Camera Photo";
                  return (
                    <div key={`cctv-cam-view-${idx}`}>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                        {label}
                      </p>
                      <ZoomableImage src={url} alt={label} />
                    </div>
                  );
                });
              })()}
              {(() => {
                const photos =
                  site.cctvHardDiskPhotos && site.cctvHardDiskPhotos.length > 0
                    ? site.cctvHardDiskPhotos
                    : site.cctvHardDiskPhoto
                      ? [site.cctvHardDiskPhoto]
                      : [];
                return photos.map((url, idx) => {
                  if (!url) return null;
                  const label =
                    photos.length > 1
                      ? `Hard Disk #${idx + 1} Photo`
                      : "Hard Disk Photo";
                  return (
                    <div key={`cctv-hd-view-${idx}`}>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                        {label}
                      </p>
                      <ZoomableImage src={url} alt={label} />
                    </div>
                  );
                });
              })()}
              {site.cctvFullSitePhoto && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    Full Site Photo
                  </p>
                  <ZoomableImage
                    src={site.cctvFullSitePhoto}
                    alt="Full Site Photo"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Other Site Photos card */}
      {site.otherSitePhotos && site.otherSitePhotos.length > 0 && (
        <div className="card">
          <div className="card-body space-y-3">
            <h3 className="card-title">Other Site Photos</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {site.otherSitePhotos.map((url, idx) => (
                <div key={`view-other-site-photo-${idx}`}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    Photo #{idx + 1}
                  </p>
                  <ZoomableImage
                    src={url}
                    alt={`Other Site Photo #${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
