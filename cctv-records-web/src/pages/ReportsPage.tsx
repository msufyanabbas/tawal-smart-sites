import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { FullPageSpinner } from "@/components/Spinner";
import { Pagination } from "@/components/Pagination";
import { downloadReportExcel, listReportSites } from "@/api/reports";
import { useDashboardData } from "@/hooks/useSites";
import { RmsScope, SiteStatusFilter, type ReportFilters } from "@/types";
import {
  STATUS_STEPS,
  apiErrorMessage,
  formatDate,
  rmsScopeLabel,
} from "@/utils/helpers";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

const StatusTick: React.FC<{ done: boolean; label: string }> = ({
  done,
  label,
}) => (
  <span
    aria-label={`${label}: ${done ? "done" : "pending"}`}
    className={
      done
        ? "inline-grid h-5 w-5 place-items-center rounded-full bg-green-500 text-white text-[10px] font-bold"
        : "inline-grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-slate-400 text-[10px]"
    }
  >
    {done ? "✓" : "–"}
  </span>
);

export const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const cleanFilters = useMemo<ReportFilters>(() => {
    const out: ReportFilters = {};
    if (filters.region) out.region = filters.region;
    if (filters.rmsScope) out.rmsScope = filters.rmsScope;
    if (filters.status) out.status = filters.status;
    if (filters.from) out.from = filters.from;
    if (filters.to) out.to = filters.to;
    return out;
  }, [filters]);

  const queryFilters = useMemo(
    () => ({ ...cleanFilters, page, limit: pageSize }),
    [cleanFilters, page, pageSize],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "sites", queryFilters],
    queryFn: () => listReportSites(queryFilters),
  });

  const sites = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? 1;

  // Region filter options come from the dashboard API so we don't need to
  // fetch the full sites list just to populate the dropdown. React-query
  // dedupes this with SitesListPage and the Dashboard.
  const { data: dashboardData } = useDashboardData();
  const regionOptions = useMemo(
    () =>
      (dashboardData?.byRegion ?? []).map((r) => ({
        value: r.region,
        label: r.region,
      })),
    [dashboardData],
  );

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadReportExcel(cleanFilters);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to generate report"));
    } finally {
      setDownloading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            Filter and export site records as Excel.
          </p>
        </div>
        <Button onClick={onDownload} loading={downloading}>
          Generate report
        </Button>
      </header>

      <div className="card">
        <div className="card-body grid gap-3 md:grid-cols-5">
          <SelectField
            label="Region"
            placeholder="All regions"
            value={filters.region ?? ""}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                region: e.target.value || undefined,
              }));
              setPage(1);
            }}
            options={regionOptions}
          />
          <SelectField
            label="Scope"
            placeholder="All scopes"
            value={filters.rmsScope ?? ""}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                rmsScope: (e.target.value || undefined) as RmsScope | undefined,
              }));
              setPage(1);
            }}
            options={Object.values(RmsScope).map((s) => ({
              value: s,
              label: rmsScopeLabel(s),
            }))}
          />
          <SelectField
            label="Status"
            placeholder="Any status"
            value={filters.status ?? ""}
            onChange={(e) => {
              setFilters((f) => ({
                ...f,
                status: (e.target.value || undefined) as
                  | SiteStatusFilter
                  | undefined,
              }));
              setPage(1);
            }}
            options={[
              { value: SiteStatusFilter.CREATED, label: "Created" },
              { value: SiteStatusFilter.ASSIGNED, label: "Assigned" },
              { value: SiteStatusFilter.PROCESSING, label: "Processing" },
              { value: SiteStatusFilter.COMPLETED, label: "Completed" },
              { value: SiteStatusFilter.REVIEWED, label: "Reviewed" },
            ]}
          />
          <TextField
            label="From"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, from: e.target.value || undefined }));
              setPage(1);
            }}
          />
          <TextField
            label="To"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, to: e.target.value || undefined }));
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body text-sm text-red-700">
            {apiErrorMessage(error, "Could not load report")}
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
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Site Name
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Tawal ID
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Region
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Scope
                </th>
                {STATUS_STEPS.map((s) => (
                  <th
                    key={s.key}
                    className="px-2 py-2 text-center font-semibold text-slate-700"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sites.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link
                      to={`/sites/${s._id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {s.siteName}
                    </Link>
                    <p className="text-xs text-slate-500">{s.siteCity}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{s.tawalId}</td>
                  <td className="px-3 py-2 text-slate-700">{s.region}</td>
                  <td className="px-3 py-2">
                    <span className="chip">{rmsScopeLabel(s.rmsScope)}</span>
                  </td>
                  {STATUS_STEPS.map((step) => (
                    <td key={step.key} className="px-2 py-2 text-center">
                      <StatusTick
                        done={!!s.status?.[step.key]?.done}
                        label={step.label}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {formatDate(s.createdAt)}
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td
                    colSpan={5 + STATUS_STEPS.length}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No sites match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-1 py-3">
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="text-sm text-slate-500">
                Rows per page:
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={total}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};
