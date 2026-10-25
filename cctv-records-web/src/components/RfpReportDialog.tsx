import { useState } from "react";
import { Button } from "@/components/Button";

export interface RfpNarrative {
  currentStatus: string;
  nextAction: string;
}

interface RfpReportDialogProps {
  open: boolean;
  busy: boolean;
  /** Shown under the title — e.g. the site name, or "12 sites selected". */
  subject?: string;
  onClose: () => void;
  onGenerate: (narrative: RfpNarrative) => void;
}

/**
 * Collects the two narrative fields that land on the report's Site
 * Installation Conclusion slide, before the deck is generated.
 *
 * Shared by the single-site detail page and the bulk run from the sites list;
 * in a bulk run the same wording is applied to every generated deck.
 *
 * Both fields are optional — a blank one falls back to wording the backend
 * derives from the site's workflow status.
 */
export const RfpReportDialog: React.FC<RfpReportDialogProps> = ({
  open,
  busy,
  subject,
  onClose,
  onGenerate,
}) => {
  const [currentStatus, setCurrentStatus] = useState("");
  const [nextAction, setNextAction] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
      >
        <div className="space-y-4 p-6">
          <div>
            <h3 className="card-title">Generate RFP report</h3>
            <p className="mt-1 text-sm text-slate-500">
              {subject
                ? `${subject} — these appear on the Site Installation Conclusion slide.`
                : "These appear on the Site Installation Conclusion slide."}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="rfp-status">
              Current status
            </label>
            <textarea
              id="rfp-status"
              className="input min-h-[80px] resize-y"
              placeholder="e.g. Installation completed and verified on site."
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              maxLength={400}
              disabled={busy}
            />
          </div>

          <div>
            <label className="label" htmlFor="rfp-next-action">
              Next action
            </label>
            <textarea
              id="rfp-next-action"
              className="input min-h-[80px] resize-y"
              placeholder="e.g. Awaiting TAWAL confirmation to proceed with PAT."
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              maxLength={400}
              disabled={busy}
            />
          </div>

          <p className="text-xs text-slate-400">
            Leave a field blank to use the wording derived from the site's
            status.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => onGenerate({ currentStatus, nextAction })}
              loading={busy}
            >
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
