import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useAcceptSiteMutation,
  useAssignSiteMutation,
  useDeleteSiteMutation,
  useReviewSiteMutation,
  useSiteQuery,
} from "@/hooks/useSites";
import { useUsersQuery } from "@/hooks/useUsers";
import { FullPageSpinner } from "@/components/Spinner";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/SelectField";
import {
  type ImagedSerialTag,
  Role,
  type SiteUnitsPayload,
  type Site,
} from "@/types";
import { apiErrorMessage, roleLabel, rmsScopeLabel } from "@/utils/helpers";
import { StatusTimeline } from "@/components/TimeLIne";
import { SiteInfoCard } from "@/components/SiteInfoCard";
import { CountsCard } from "@/components/CountCard";
import { FieldEntryForm } from "@/components/FieldEntryForm";

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

const AssignPanel: React.FC<{ site: Site }> = ({ site }) => {
  const { data: techs = [], isLoading } = useUsersQuery(Role.TECHNICIAN);
  const assign = useAssignSiteMutation();
  const [techId, setTechId] = useState<string>(
    site.status?.assigned?.assignedTo ?? "",
  );

  useEffect(() => {
    setTechId(site.status?.assigned?.assignedTo ?? "");
  }, [site._id, site.status?.assigned?.assignedTo]);

  const onAssign = async () => {
    if (!techId) return toast.error("Pick a technician");
    try {
      await assign.mutateAsync({ id: site._id, technicianId: techId });
      toast.success("Site assigned");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to assign"));
    }
  };

  return (
    <div className="card">
      <div className="card-body space-y-3">
        <h3 className="card-title">Assign to technician</h3>
        <SelectField
          label="Technician"
          placeholder={isLoading ? "Loading…" : "Pick a technician"}
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
          options={techs.map((t) => ({
            value: t.id,
            label: `${t.name || t.email} (${t.email})`,
          }))}
        />
        <Button onClick={onAssign} loading={assign.isPending}>
          {site.status?.assigned?.done ? "Reassign" : "Assign"}
        </Button>
      </div>
    </div>
  );
};

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

const SubmittedDataView: React.FC<{ site: Site }> = ({ site }) => {
  const groups = SUBMITTED_GROUPS.map((g) => ({
    ...g,
    units: ((site as any)[g.key] as ImagedSerialTag[] | undefined) ?? [],
  })).filter((g) => g.units.length > 0);

  if (groups.length === 0) {
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

export const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: site, isLoading, error } = useSiteQuery(id);
  const accept = useAcceptSiteMutation();
  const review = useReviewSiteMutation();
  const del = useDeleteSiteMutation();
  const [reviewRemarks, setReviewRemarks] = useState("");

  if (isLoading) return <FullPageSpinner />;
  if (error || !site) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="card-body text-sm text-red-700">
          {apiErrorMessage(error, "Site not found")}
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === Role.ADMIN;
  const isManager = user?.role === Role.MANAGER;
  const isTech = user?.role === Role.TECHNICIAN;

  const canAssign = isManager || isAdmin;
  const canAccept =
    isTech && site.status?.assigned?.done && !site.status?.processing?.done;
  const canReview =
    (isManager || isAdmin) &&
    site.status?.completed?.done &&
    !site.status?.reviewed?.done;
  const showFieldEntry = isTech && site.status?.processing?.done;
  const showSubmittedView =
    (isAdmin || isManager) &&
    (site.status?.completed?.done || site.status?.reviewed?.done);

  const onAccept = async () => {
    try {
      await accept.mutateAsync(site._id);
      toast.success("Site accepted — you can now enter field data");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to accept"));
    }
  };

  const onReview = async () => {
    try {
      await review.mutateAsync({ id: site._id, remarks: reviewRemarks });
      setReviewRemarks("");
      toast.success("Site approved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to review"));
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this site? This cannot be undone.")) return;
    try {
      await del.mutateAsync(site._id);
      toast.success("Site deleted");
      navigate("/sites", { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete site"));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{site.siteName}</h1>
          <p className="text-sm text-slate-500">
            {site.tawalId} · {site.region} · {rmsScopeLabel(site.rmsScope)}
          </p>
        </div>
        <div className="flex gap-2">
          {canAccept && (
            <Button onClick={onAccept} loading={accept.isPending}>
              Accept site
            </Button>
          )}
          {isAdmin && (
            <Link to={`/sites/${site._id}/edit`} className="btn-secondary">
              Edit site
            </Link>
          )}
          {isAdmin && (
            <Button variant="danger" onClick={onDelete} loading={del.isPending}>
              Delete
            </Button>
          )}
        </div>
      </header>

      <div className="card">
        <div className="card-body space-y-3">
          <StatusTimeline site={site} />
          {site.status?.reviewed?.done && site.status.reviewed.remarks && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Reviewer remarks
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                {site.status.reviewed.remarks}
              </p>
            </div>
          )}
        </div>
      </div>

      {canReview && (
        <div className="card">
          <div className="card-body space-y-3">
            <h3 className="card-title">Review submitted work</h3>
            <label className="label" htmlFor="review-remarks">
              Remarks (optional)
            </label>
            <textarea
              id="review-remarks"
              className="input min-h-[88px] resize-y"
              placeholder="Add any review notes or remarks..."
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              maxLength={2000}
              disabled={review.isPending}
            />
            <div className="flex justify-end">
              <Button onClick={onReview} loading={review.isPending}>
                Approve Work
              </Button>
            </div>
          </div>
        </div>
      )}

      <SiteInfoCard site={site} />
      <CountsCard site={site} />

      {canAssign && <AssignPanel site={site} />}

      {(showFieldEntry || (isTech && site.status?.completed?.done)) && (
        <FieldEntryForm site={site} />
      )}

      {showSubmittedView && <SubmittedDataView site={site} />}

      {isTech && !site.status?.processing?.done && (
        <div className="card">
          <div className="card-body text-sm text-slate-500">
            Accept the site to start entering field data.
          </div>
        </div>
      )}

      {user && (
        <p className="text-right text-xs text-slate-400">
          Signed in as {user.email} ({roleLabel(user.role)})
        </p>
      )}
    </div>
  );
};
