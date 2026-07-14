export const CountsCard: React.FC<{ site: Site }> = ({ site }) => {
  const counts: Array<[string, number]> = [];
  const push = (label: string, val: number) => {
    if (val > 0) counts.push([label, val]);
  };
  push("RMS units", site.numberOfRms);
  push("Expanders", site.numberOfExpanders);
  push("SIMs", site.numberOfSims);
  push("Fence Locks", site.numberOfFenceLocks);
  push("ODUs", site.numberOfOdus);
  push("Tenants", site.numberOfTenants);
  push("Smart Meters", site.numberOfSmartMeters);
  push("CT Splits", site.numberOfCtSplits);
  push("Silbo Gateways", site.numberOfSilboGateways);

  if (counts.length === 0) return null;
  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title">Equipment counts</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {counts.map(([k, v]) => (
            <div
              key={k}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {k}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
