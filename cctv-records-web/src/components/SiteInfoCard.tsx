import { type Site } from "@/types";
import { formatDateTime, rmsScopeLabel } from "@/utils/helpers";
export const SiteInfoCard: React.FC<{ site: Site }> = ({ site }) => (
  <div className="card">
    <div className="card-body grid gap-3 md:grid-cols-3">
      <div>
        <p className="text-xs uppercase text-slate-500">Tawal ID</p>
        <p className="font-medium text-slate-800">{site.tawalId}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">Region</p>
        <p className="font-medium text-slate-800">{site.region}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">City</p>
        <p className="font-medium text-slate-800">{site.siteCity}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">TCN</p>
        <p className="font-medium text-slate-800">{site.tcnNumber}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">Scope</p>
        <p className="font-medium text-slate-800">
          {rmsScopeLabel(site.rmsScope)}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase text-slate-500">Created</p>
        <p className="font-medium text-slate-800">
          {formatDateTime(site.createdAt)}
        </p>
      </div>
    </div>
  </div>
);
