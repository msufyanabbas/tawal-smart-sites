import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ALL_RMS_SCOPES, Site, SiteDocument } from '../site/site.schema';
import { Role } from '../user/role.enum';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

type Stage = 'created' | 'assigned' | 'processing' | 'completed' | 'reviewed';

@Injectable()
export class DashboardService {
  constructor(@InjectModel(Site.name) private siteModel: Model<SiteDocument>) {}

  // Mirrors the web helper `currentStage` — deepest milestone that's done.
  private currentStageOf(doc: SiteDocument): Stage {
    const order: Stage[] = [
      'created',
      'assigned',
      'processing',
      'completed',
      'reviewed',
    ];
    let last: Stage = 'created';
    for (const k of order) {
      if (doc.status?.[k]?.done) last = k;
    }
    return last;
  }

  // Returns all aggregate data needed to render the role-aware web dashboard.
  // Technicians only see sites assigned to them; admins/managers see all.
  async getDashboard(actor: CurrentUserPayload) {
    const filter: FilterQuery<SiteDocument> = {};
    if (actor.role === Role.TECHNICIAN) {
      filter['status.assigned.assignedTo'] = new Types.ObjectId(actor.userId);
    }

    const projection = {
      siteName: 1,
      tawalId: 1,
      region: 1,
      siteCity: 1,
      rmsScope: 1,
      status: 1,
      createdAt: 1,
    };

    // `timestamps: true` adds createdAt/updatedAt at runtime even though they
    // aren't declared on the Site class — widen the type so we can read them.
    const sites = (await this.siteModel
      .find(filter, projection)
      .sort({ createdAt: -1 })) as Array<
      SiteDocument & { createdAt?: Date; updatedAt?: Date }
    >;

    // ── Stage tallies (deepest milestone reached) ───────────────────────
    const byStage: Record<Stage, number> = {
      created: 0,
      assigned: 0,
      processing: 0,
      completed: 0,
      reviewed: 0,
    };
    for (const s of sites) {
      const stage = this.currentStageOf(s);
      byStage[stage] = (byStage[stage] ?? 0) + 1;
    }

    // ── Scope tallies (all scopes zero-filled so the UI stays stable) ───
    const byScope: Record<string, number> = {};
    for (const scope of ALL_RMS_SCOPES) byScope[scope] = 0;
    for (const s of sites) {
      if (s.rmsScope) byScope[s.rmsScope] = (byScope[s.rmsScope] ?? 0) + 1;
    }

    // ── Region tallies (alphabetical) ───────────────────────────────────
    const regionCounts: Record<string, number> = {};
    for (const s of sites) {
      if (!s.region) continue;
      regionCounts[s.region] = (regionCounts[s.region] ?? 0) + 1;
    }
    const byRegion = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => a.region.localeCompare(b.region));

    // ── Cities (grouped by region so the Sites list can filter city
    //    options by the active region) ───────────────────────────────────
    const seenCities = new Set<string>();
    const cities: Array<{ city: string; region: string }> = [];
    for (const s of sites) {
      if (!s.siteCity) continue;
      const key = `${s.region}|${s.siteCity}`;
      if (seenCities.has(key)) continue;
      seenCities.add(key);
      cities.push({ city: s.siteCity, region: s.region });
    }
    cities.sort(
      (a, b) =>
        a.city.localeCompare(b.city) || a.region.localeCompare(b.region),
    );

    // ── Completed this month (manager card) ──────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = sites.filter(
      (s) =>
        s.status?.completed?.done &&
        s.status.completed.at &&
        s.status.completed.at >= monthStart,
    ).length;

    // ── Recent activity (already sorted newest-first) ───────────────────
    const recent = sites.slice(0, 6).map((s) => ({
      _id: String(s._id),
      siteName: s.siteName,
      tawalId: s.tawalId,
      stage: this.currentStageOf(s),
      createdAt: s.createdAt,
    }));

    // ── Sites completed but not yet reviewed (manager card) ─────────────
    const pendingReview = sites
      .filter((s) => s.status?.completed?.done && !s.status?.reviewed?.done)
      .slice(0, 8)
      .map((s) => ({
        _id: String(s._id),
        siteName: s.siteName,
        completedAt: s.status.completed.at,
      }));

    const dashboard: any = {
      totals: {
        total: sites.length,
        byStage,
        completedThisMonth,
      },
      byScope,
      byRegion,
      cities,
      recent,
      pendingReview,
    };

    // ── Technician-only drill-down lists ────────────────────────────────
    if (actor.role === Role.TECHNICIAN) {
      dashboard.pendingAcceptance = sites
        .filter((s) => s.status?.assigned?.done && !s.status?.processing?.done)
        .map((s) => ({
          _id: String(s._id),
          siteName: s.siteName,
          assignedAt: s.status.assigned.at,
        }));
      dashboard.inProgress = sites
        .filter((s) => s.status?.processing?.done && !s.status?.completed?.done)
        .map((s) => ({
          _id: String(s._id),
          siteName: s.siteName,
          acceptedAt: s.status.processing.at,
        }));
      dashboard.completed = sites.filter(
        (s) => s.status?.completed?.done,
      ).length;
    }

    return dashboard;
  }
}
