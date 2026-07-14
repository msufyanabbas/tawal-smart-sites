import { type Site } from "@/types";
import { STATUS_STEPS, formatDateTime } from "@/utils/helpers";

export const StatusTimeline: React.FC<{ site: Site }> = ({ site }) => (
  <ol className="flex flex-wrap items-center gap-3">
    {STATUS_STEPS.map((step, i) => {
      const flag = site.status?.[step.key];
      const done = !!flag?.done;
      return (
        <li key={step.key} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={
                done
                  ? "grid h-8 w-8 place-items-center rounded-full bg-green-500 text-white font-bold"
                  : "grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-400 font-semibold"
              }
            >
              {i + 1}
            </span>
            <div>
              <p
                className={
                  done
                    ? "text-sm font-semibold text-slate-800"
                    : "text-sm font-medium text-slate-500"
                }
              >
                {step.label}
              </p>
              {flag?.at && (
                <p className="text-xs text-slate-500">
                  {formatDateTime(flag.at)}
                </p>
              )}
            </div>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <span
              className={
                done ? "h-px w-6 bg-green-400" : "h-px w-6 bg-slate-200"
              }
            />
          )}
        </li>
      );
    })}
  </ol>
);
