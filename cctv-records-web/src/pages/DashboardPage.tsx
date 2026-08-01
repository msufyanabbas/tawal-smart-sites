import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useSites";
import { FullPageSpinner } from "@/components/Spinner";
import { Role, type RmsScope } from "@/types";
import type { SiteStats } from "@/api/sites";
import {
  apiErrorMessage,
  formatDateTime,
  rmsScopeLabel,
} from "@/utils/helpers";

const StatCard: React.FC<{
  label: string;
  value: number | string;
  sub?: string;
}> = ({ label, value, sub }) => (
  <div className="card">
    <div className="card-body">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  </div>
);

// Tappable region card — navigates to the filtered Sites list.
const RegionCard: React.FC<{ region: string; count: number }> = ({
  region,
  count,
}) => (
  <Link
    to={`/sites?region=${encodeURIComponent(region)}`}
    className="card transition hover:border-brand-300 hover:shadow-md"
  >
    <div className="card-body">
      <p className="text-xs uppercase tracking-wide text-slate-500">{region}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{count}</p>
      <p className="mt-1 text-xs font-medium text-brand-600">View sites →</p>
    </div>
  </Link>
);

// Regions come pre-sorted alphabetically from the stats endpoint. If nothing
// exists yet we surface an empty hint instead of a half-empty grid.
const SitesByRegion: React.FC<{ byRegion: SiteStats["byRegion"] }> = ({
  byRegion,
}) => (
  <div>
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
      Sites by region
    </h3>
    {byRegion.length === 0 ? (
      <div className="card">
        <div className="card-body text-sm text-slate-500">
          No sites created yet
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {byRegion.map((r) => (
          <RegionCard key={r.region} region={r.region} count={r.count} />
        ))}
      </div>
    )}
  </div>
);

const AdminDashboard: React.FC<{ stats: SiteStats }> = ({ stats }) => {
  const { total, byStage } = stats.totals;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total sites" value={total} />
        <StatCard label="In review" value={byStage.completed} />
        <StatCard label="In progress" value={byStage.processing} />
        <StatCard label="Pending assignment" value={byStage.created} />
      </div>

      <SitesByRegion byRegion={stats.byRegion} />

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Sites by scope</h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {(Object.keys(stats.byScope) as RmsScope[]).map((k) => (
              <li
                key={k}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-slate-700">{rmsScopeLabel(k)}</span>
                <span className="font-semibold text-slate-900">
                  {stats.byScope[k]}
                </span>
              </li>
            ))}
            {Object.keys(stats.byScope).length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                No sites yet
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Recent activity</h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {stats.recent.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <Link
                    to={`/sites/${s._id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {s.siteName}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {s.tawalId}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700">
                    {s.stage}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(s.createdAt)}
                  </p>
                </div>
              </li>
            ))}
            {stats.recent.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                Nothing here yet
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC<{ stats: SiteStats }> = ({ stats }) => {
  const { byStage, completedThisMonth } = stats.totals;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Assigned" value={byStage.assigned} />
        <StatCard label="In progress" value={byStage.processing} />
        <StatCard label="Pending review" value={byStage.completed} />
        <StatCard label="Completed this month" value={completedThisMonth} />
      </div>

      <SitesByRegion byRegion={stats.byRegion} />

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Sites pending your review</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {stats.pendingReview.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <Link
                  to={`/sites/${s._id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {s.siteName}
                </Link>
                <span className="text-xs text-slate-500">
                  {formatDateTime(s.completedAt)}
                </span>
              </li>
            ))}
            {stats.pendingReview.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                Nothing waiting on you right now
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const TechnicianDashboard: React.FC<{ stats: SiteStats }> = ({ stats }) => {
  const pendingAcceptance = stats.pendingAcceptance ?? [];
  const inProgress = stats.inProgress ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="My sites" value={stats.totals.total} />
        <StatCard label="Pending acceptance" value={pendingAcceptance.length} />
        <StatCard label="Completed" value={stats.completed ?? 0} />
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Sites awaiting your acceptance</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {pendingAcceptance.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <Link
                  to={`/sites/${s._id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {s.siteName}
                </Link>
                <span className="text-xs text-slate-500">
                  assigned {formatDateTime(s.assignedAt)}
                </span>
              </li>
            ))}
            {pendingAcceptance.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                All caught up
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">In progress</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {inProgress.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <Link
                  to={`/sites/${s._id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {s.siteName}
                </Link>
                <span className="text-xs text-slate-500">
                  accepted {formatDateTime(s.acceptedAt)}
                </span>
              </li>
            ))}
            {inProgress.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">
                Nothing in progress
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useDashboardData();

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {user?.name || user?.email}.
        </p>
      </header>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-body text-sm text-red-700">
            {apiErrorMessage(error, "Could not load dashboard data")}
          </div>
        </div>
      )}

      {stats && user?.role === Role.ADMIN && <AdminDashboard stats={stats} />}
      {stats && user?.role === Role.MANAGER && (
        <ManagerDashboard stats={stats} />
      )}
      {stats && user?.role === Role.TECHNICIAN && (
        <TechnicianDashboard stats={stats} />
      )}
    </div>
  );
};
