import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSitesQuery } from '@/hooks/useSites';
import { FullPageSpinner } from '@/components/Spinner';
import {
  Role,
  type Site,
  type RmsScope,
} from '@/types';
import {
  apiErrorMessage,
  currentStage,
  formatDateTime,
  rmsScopeLabel,
} from '@/utils/helpers';

const StatCard: React.FC<{ label: string; value: number | string; sub?: string }> = ({
  label,
  value,
  sub,
}) => (
  <div className="card">
    <div className="card-body">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  </div>
);

const groupBy = <T, K extends string>(
  arr: T[],
  fn: (t: T) => K,
): Record<K, number> => {
  const out = {} as Record<K, number>;
  for (const item of arr) {
    const k = fn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};

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

// Sites are grouped dynamically by whatever region strings happen to exist in
// the data — sorted alphabetically. If nothing is loaded yet we surface an
// empty hint instead of a half-empty grid.
const SitesByRegion: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const s of sites) {
      if (!s.region) continue;
      tally[s.region] = (tally[s.region] ?? 0) + 1;
    }
    return Object.entries(tally)
      .map(([region, n]) => ({ region, n }))
      .sort((a, b) => a.region.localeCompare(b.region));
  }, [sites]);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Sites by region
      </h3>
      {counts.length === 0 ? (
        <div className="card">
          <div className="card-body text-sm text-slate-500">No sites created yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {counts.map((c) => (
            <RegionCard key={c.region} region={c.region} count={c.n} />
          ))}
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const byScope = groupBy(sites, (s) => s.rmsScope);
  const byStage = groupBy(sites, (s) => currentStage(s));
  const recent = [...sites]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total sites" value={sites.length} />
        <StatCard label="In review" value={byStage.completed ?? 0} />
        <StatCard label="In progress" value={byStage.processing ?? 0} />
        <StatCard label="Pending assignment" value={byStage.created ?? 0} />
      </div>

      <SitesByRegion sites={sites} />

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Sites by scope</h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {(Object.keys(byScope) as RmsScope[]).map((k) => (
              <li key={k} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{rmsScopeLabel(k)}</span>
                <span className="font-semibold text-slate-900">{byScope[k]}</span>
              </li>
            ))}
            {Object.keys(byScope).length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">No sites yet</li>
            )}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Recent activity</h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <Link to={`/sites/${s._id}`} className="font-medium text-brand-700 hover:underline">
                    {s.siteName}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">{s.tawalId}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700">{currentStage(s)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(s.createdAt)}</p>
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">Nothing here yet</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const byStage = groupBy(sites, (s) => currentStage(s));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const completedThisMonth = sites.filter(
    (s) =>
      s.status?.completed?.done &&
      s.status.completed.at &&
      new Date(s.status.completed.at) >= monthStart,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Assigned" value={byStage.assigned ?? 0} />
        <StatCard label="In progress" value={byStage.processing ?? 0} />
        <StatCard label="Pending review" value={byStage.completed ?? 0} />
        <StatCard label="Completed this month" value={completedThisMonth} />
      </div>

      <SitesByRegion sites={sites} />

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Sites pending your review</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {sites
              .filter((s) => s.status?.completed?.done && !s.status?.reviewed?.done)
              .slice(0, 8)
              .map((s) => (
                <li key={s._id} className="flex items-center justify-between py-3 text-sm">
                  <Link to={`/sites/${s._id}`} className="font-medium text-brand-700 hover:underline">
                    {s.siteName}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(s.status.completed.at)}
                  </span>
                </li>
              ))}
            {!sites.some(
              (s) => s.status?.completed?.done && !s.status?.reviewed?.done,
            ) && (
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

const TechnicianDashboard: React.FC<{ sites: Site[] }> = ({ sites }) => {
  const pendingAccept = sites.filter(
    (s) => s.status?.assigned?.done && !s.status?.processing?.done,
  );
  const inProgress = sites.filter(
    (s) => s.status?.processing?.done && !s.status?.completed?.done,
  );
  const done = sites.filter((s) => s.status?.completed?.done);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="My sites" value={sites.length} />
        <StatCard label="Pending acceptance" value={pendingAccept.length} />
        <StatCard label="Completed" value={done.length} />
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Sites awaiting your acceptance</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {pendingAccept.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-3 text-sm">
                <Link to={`/sites/${s._id}`} className="font-medium text-brand-700 hover:underline">
                  {s.siteName}
                </Link>
                <span className="text-xs text-slate-500">
                  assigned {formatDateTime(s.status.assigned.at)}
                </span>
              </li>
            ))}
            {pendingAccept.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">All caught up</li>
            )}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="card-title">In progress</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {inProgress.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-3 text-sm">
                <Link to={`/sites/${s._id}`} className="font-medium text-brand-700 hover:underline">
                  {s.siteName}
                </Link>
                <span className="text-xs text-slate-500">
                  accepted {formatDateTime(s.status.processing.at)}
                </span>
              </li>
            ))}
            {inProgress.length === 0 && (
              <li className="py-4 text-center text-sm text-slate-500">Nothing in progress</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useSitesQuery({});
  const sites = useMemo(() => data ?? [], [data]);

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
            {apiErrorMessage(error, 'Could not load dashboard data')}
          </div>
        </div>
      )}

      {user?.role === Role.ADMIN && <AdminDashboard sites={sites} />}
      {user?.role === Role.MANAGER && <ManagerDashboard sites={sites} />}
      {user?.role === Role.TECHNICIAN && <TechnicianDashboard sites={sites} />}
    </div>
  );
};
