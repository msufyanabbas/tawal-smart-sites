import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { FullPageSpinner } from '@/components/Spinner';
import { downloadReportExcel, listReportSites } from '@/api/reports';
import { useSitesQuery } from '@/hooks/useSites';
import {
  RmsScope,
  SiteStatusFilter,
  type ReportFilters,
} from '@/types';
import {
  STATUS_STEPS,
  apiErrorMessage,
  formatDate,
  rmsScopeLabel,
} from '@/utils/helpers';

const StatusTick: React.FC<{ done: boolean }> = ({ done }) => (
  <span
    className={
      done
        ? 'inline-grid h-5 w-5 place-items-center rounded-full bg-green-500 text-white text-[10px] font-bold'
        : 'inline-grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-slate-400 text-[10px]'
    }
  >
    {done ? '✓' : '–'}
  </span>
);

export const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [downloading, setDownloading] = useState(false);

  const cleanFilters = useMemo<ReportFilters>(() => {
    const out: ReportFilters = {};
    if (filters.region) out.region = filters.region;
    if (filters.rmsScope) out.rmsScope = filters.rmsScope;
    if (filters.status) out.status = filters.status;
    if (filters.from) out.from = filters.from;
    if (filters.to) out.to = filters.to;
    return out;
  }, [filters]);

  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['reports', 'sites', cleanFilters],
    queryFn: () => listReportSites(cleanFilters),
  });

  // Region filter options derived from the full sites list so the user can
  // pivot between regions even after applying one. React-query dedupes with
  // SitesListPage and the Dashboard.
  const { data: allSitesForOptions = [] } = useSitesQuery({});
  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSitesForOptions) if (s.region) set.add(s.region);
    return [...set].sort().map((r) => ({ value: r, label: r }));
  }, [allSitesForOptions]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadReportExcel(cleanFilters);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to generate report'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Filter and export site records as Excel.</p>
        </div>
        <Button onClick={onDownload} loading={downloading}>Generate report</Button>
      </header>

      <div className="card">
        <div className="card-body grid gap-3 md:grid-cols-5">
          <SelectField
            label="Region"
            placeholder="All regions"
            value={filters.region ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value || undefined }))}
            options={regionOptions}
          />
          <SelectField
            label="Scope"
            placeholder="All scopes"
            value={filters.rmsScope ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, rmsScope: (e.target.value || undefined) as RmsScope | undefined }))}
            options={Object.values(RmsScope).map((s) => ({ value: s, label: rmsScopeLabel(s) }))}
          />
          <SelectField
            label="Status"
            placeholder="Any status"
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as SiteStatusFilter | undefined }))}
            options={[
              { value: SiteStatusFilter.CREATED, label: 'Created' },
              { value: SiteStatusFilter.ASSIGNED, label: 'Assigned' },
              { value: SiteStatusFilter.PROCESSING, label: 'Processing' },
              { value: SiteStatusFilter.COMPLETED, label: 'Completed' },
              { value: SiteStatusFilter.REVIEWED, label: 'Reviewed' },
            ]}
          />
          <TextField
            label="From"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
          />
          <TextField
            label="To"
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
          />
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body text-sm text-red-700">
            {apiErrorMessage(error, 'Could not load report')}
          </div>
        </div>
      )}

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Site Name</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Tawal ID</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Region</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Scope</th>
                {STATUS_STEPS.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-center font-semibold text-slate-700">
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 font-semibold text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(sites ?? []).map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.siteName}</td>
                  <td className="px-3 py-2 text-slate-700">{s.tawalId}</td>
                  <td className="px-3 py-2 text-slate-700">{s.region}</td>
                  <td className="px-3 py-2"><span className="chip">{rmsScopeLabel(s.rmsScope)}</span></td>
                  {STATUS_STEPS.map((step) => (
                    <td key={step.key} className="px-2 py-2 text-center">
                      <StatusTick done={!!s.status?.[step.key]?.done} />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs text-slate-500">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
              {(sites ?? []).length === 0 && (
                <tr>
                  <td colSpan={5 + STATUS_STEPS.length} className="px-3 py-8 text-center text-sm text-slate-500">
                    No sites match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
