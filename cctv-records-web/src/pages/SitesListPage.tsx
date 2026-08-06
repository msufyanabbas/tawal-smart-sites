import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData, useSitesQuery } from "@/hooks/useSites";
import { useUsersQuery } from "@/hooks/useUsers";
import { FullPageSpinner } from "@/components/Spinner";
import { TextField } from "@/components/TextField";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/Button";
import { Pagination } from "@/components/Pagination";
import { BulkImportModal } from "@/components/BulkImportModal";
import { Role, RmsScope, SiteStatusFilter } from "@/types";
import {
  STATUS_STEPS,
  apiErrorMessage,
  formatDate,
  rmsScopeLabel,
} from "@/utils/helpers";
import { downloadImportTemplate, downloadSitesExcel } from "@/utils/sitesExcel";

const StatusTick: React.FC<{ done: boolean; label: string }> = ({
  done,
  label,
}) => (
  <span
    aria-label={`${label}: ${done ? "done" : "pending"}`}
    className={
      done
        ? "inline-grid h-6 w-6 place-items-center rounded-full bg-green-500 text-white text-xs font-bold"
        : "inline-grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-slate-400 text-xs"
    }
  >
    {done ? "✓" : "–"}
  </span>
);

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 0]; // 0 = All

export const SitesListPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const isManager = user?.role === Role.MANAGER;
  const isTech = user?.role === Role.TECHNICIAN;
  // Only admin can create or import sites; manager keeps view + assign rights.
  const canCreate = isAdmin;
  const canImport = isAdmin;
  // Manager still needs the technician roster to label exports nicely.
  const canSeeExports = isAdmin || isManager;

  // Seed the region filter from the URL so dashboard drill-down lands on the
  // pre-filtered list. Region is free-text now, so we accept any string from
  // the query param. The filter remains controllable from the page itself,
  // so we mirror further user changes back into the URL via setSearchParams.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRegion = searchParams.get("region") ?? "";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [region, setRegion] = useState<string>(initialRegion);
  const [city, setCity] = useState<string>("");
  const [simSwapSerial, setSimSwapSerial] = useState<string>("");
  const [rmsScope, setRmsScope] = useState<RmsScope | "">("");
  const [status, setStatus] = useState<SiteStatusFilter | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
      setPage(1);
    }, 800);
  };

  // Keep the URL in sync with the region filter so refreshing the page or
  // sharing the link preserves the drill-down state.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (region) next.set("region", region);
    else next.delete("region");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [region, searchParams, setSearchParams]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);

  const filters = useMemo(
    () => ({
      ...(region ? { region } : {}),
      ...(city ? { siteCity: city } : {}),
      ...(rmsScope ? { rmsScope } : {}),
      ...(status ? { status } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(simSwapSerial ? { simSwapSerial } : {}),
      // When "All" is selected (pageSize === 0), omit page/limit so the
      // backend returns every site in a single response.
      ...(pageSize > 0 ? { page, limit: pageSize } : {}),
    }),
    [
      region,
      city,
      rmsScope,
      status,
      debouncedSearch,
      simSwapSerial,
      page,
      pageSize,
    ],
  );

  const { data, isLoading, error } = useSitesQuery(filters);

  const sites = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? 1;

  // Region and city filter options come from the dashboard API so we don't
  // need to fetch the full sites list just to populate dropdowns. React-query
  // dedupes this with the Dashboard's identical query.
  const { data: dashboardData } = useDashboardData();
  const regionOptions = useMemo(
    () =>
      (dashboardData?.byRegion ?? []).map((r) => ({
        value: r.region,
        label: r.region,
      })),
    [dashboardData],
  );
  // Cities for the city filter: all cities from the dashboard API so the
  // dropdown always shows every city in the dataset.
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of dashboardData?.cities ?? []) {
      set.add(c.city);
    }
    return [...set].sort().map((c) => ({ value: c, label: c }));
  }, [dashboardData]);

  // Technicians are only loaded for admin/manager so we can resolve the
  // "assignedTo" id into a name during export.
  const { data: technicians = [] } = useUsersQuery(
    canSeeExports ? Role.TECHNICIAN : undefined,
  );
  const technicianNameById = useMemo(() => {
    const out: Record<string, string> = {};
    for (const t of technicians) out[t.id] = t.name || t.email;
    return out;
  }, [technicians]);

  if (isLoading) return <FullPageSpinner />;

  const allOnPageSelected =
    sites.length > 0 && sites.every((s) => selected.has(s._id));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sites.map((s) => s._id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportAll = () => {
    downloadSitesExcel(sites, technicianNameById, "tawal-sites.xlsx");
  };

  const exportSelected = () => {
    const subset = sites.filter((s) => selected.has(s._id));
    if (subset.length === 0) return;
    downloadSitesExcel(subset, technicianNameById, "tawal-sites-selected.xlsx");
  };

  const selectionCount = selected.size;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelected(new Set());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isTech ? "My Sites" : "Sites"}
          </h1>
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? "site" : "sites"} total
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canImport && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={downloadImportTemplate}
              >
                Download template
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setImportOpen(true)}
              >
                Import
              </Button>
            </>
          )}
          {!isTech && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={exportAll}
                disabled={sites.length === 0}
              >
                Export All
              </Button>
              {selectionCount > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={exportSelected}
                >
                  Export Selected ({selectionCount})
                </Button>
              )}
            </>
          )}
          {canCreate && (
            <Link to="/sites/new" className="btn-primary">
              + New site
            </Link>
          )}
        </div>
      </header>

      <div className="card">
        <div className="card-body grid gap-3 md:grid-cols-6">
          <TextField
            label="Search"
            placeholder="Site name, Tawal ID, city, TCN…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            autoFocus={true}
          />
          <SelectField
            label="Region"
            placeholder="All regions"
            value={region}
            onChange={(e) => {
              const next = e.target.value;
              setRegion(next);
              // Drop the city when changing region so the user re-picks one
              // from the new region's list.
              if (next !== region) setCity("");
              setPage(1);
            }}
            options={regionOptions}
          />
          <SelectField
            label="City"
            placeholder="All cities"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            options={cityOptions}
          />
          <SelectField
            label="Scope"
            placeholder="All scopes"
            value={rmsScope}
            onChange={(e) => {
              setRmsScope(e.target.value as RmsScope | "");
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SiteStatusFilter | "");
              setPage(1);
            }}
            options={[
              { label: "Created", value: SiteStatusFilter.CREATED },
              { label: "Assigned", value: SiteStatusFilter.ASSIGNED },
              { label: "Processing", value: SiteStatusFilter.PROCESSING },
              { label: "Completed", value: SiteStatusFilter.COMPLETED },
              { label: "Reviewed", value: SiteStatusFilter.REVIEWED },
            ]}
          />
          <TextField
            label="SIM Serial #"
            placeholder="Search by SIM serial…"
            value={simSwapSerial}
            onChange={(e) => {
              setSimSwapSerial(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body text-sm text-red-700">
            {apiErrorMessage(error, "Could not load sites")}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              {!isTech && (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
              )}
              <th className="px-3 py-2 font-semibold text-slate-700">
                Site Name
              </th>
              <th className="px-3 py-2 font-semibold text-slate-700">
                Tawal ID
              </th>
              <th className="px-3 py-2 font-semibold text-slate-700">Region</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Scope</th>
              {STATUS_STEPS.map((step) => (
                <th
                  key={step.key}
                  className="px-2 py-2 text-center font-semibold text-slate-700"
                >
                  {step.label}
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
                {!isTech && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.siteName}`}
                      checked={selected.has(s._id)}
                      onChange={() => toggleOne(s._id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                )}
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
                  colSpan={5 + STATUS_STEPS.length + (isTech ? 0 : 1)}
                  className="px-3 py-8 text-center text-sm text-slate-500"
                >
                  No sites match your filters
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
                setSelected(new Set());
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "All" : n}
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

      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
