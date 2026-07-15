import { useState, useRef, useId } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FullPageSpinner } from "@/components/Spinner";
import type { SimSerial, RmsSerial, BulkSerialResult } from "@/types";
import { apiErrorMessage, formatDate } from "@/utils/helpers";
import {
  useBulkCreateRmsMutation,
  useBulkCreateSimMutation,
  useBulkCreateSmartLockMutation,
  useBulkDeleteRmsMutation,
  useBulkDeleteSimMutation,
  useBulkDeleteSmartLockMutation,
  useCreateRmsMutation,
  useCreateSimMutation,
  useCreateSmartLockMutation,
  useDeleteRmsMutation,
  useDeleteSimMutation,
  useDeleteSmartLockMutation,
  useRmsSerialsQuery,
  useSimSerialsQuery,
  useSmartLockSerialsQuery,
} from "@/hooks/useSerials";

type TabId = "sim" | "rms" | "smartlock";

const singleSchema = z.object({
  serialNumber: z
    .string()
    .trim()
    .min(1, "Serial number is required")
    .max(100, "Too long"),
});
type SingleValues = z.infer<typeof singleSchema>;

function bulkToast(result: BulkSerialResult) {
  const parts: string[] = [];
  if (result.created > 0) parts.push(`${result.created} created`);
  if (result.skipped > 0) parts.push(`${result.skipped} skipped (duplicate)`);
  if (result.failed.length > 0) parts.push(`${result.failed.length} failed`);
  const msg = parts.join(", ");
  if (result.created > 0) toast.success(msg);
  else toast.error(msg || "Nothing was created");
}

// __________________ Modal wrapper ─────────────────────────────────────────────────────────────

const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="card-title">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Add Single modal ──────────────────────────────────────────────────────────

const AddSingleModal: React.FC<{
  open: boolean;
  tab: TabId;
  onClose: () => void;
}> = ({ open, tab, onClose }) => {
  const createSim = useCreateSimMutation();
  const createRms = useCreateRmsMutation();
  const createSmartLock = useCreateSmartLockMutation();
  const isSim = tab === "sim";
  const label = tab === "sim" ? "SIM" : tab === "rms" ? "RMS" : "Smart Lock";
  const mutation =
    tab === "sim" ? createSim : tab === "rms" ? createRms : createSmartLock;
  const fieldId = useId();

  const { register, handleSubmit, formState, reset } = useForm<SingleValues>({
    resolver: zodResolver(singleSchema),
  });

  const onSubmit = async (values: SingleValues) => {
    try {
      await mutation.mutateAsync(values.serialNumber);
      toast.success(`${label} serial added`);
      reset();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to add serial"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Add ${label} Serial`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          id={`${fieldId}-serial`}
          label={
            tab === "sim"
              ? "SIM Number"
              : tab === "rms"
                ? "RMS Serial"
                : "Smart Lock Serial"
          }
          placeholder="e.g 89610123456789012345"
          {...register("serialNumber")}
          error={formState.errors.serialNumber?.message}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Bulk Import modal ─────────────────────────────────────────────────────────

const BulkImportModal: React.FC<{
  open: boolean;
  tab: TabId;
  onClose: () => void;
}> = ({ open, tab, onClose }) => {
  const bulkSim = useBulkCreateSimMutation();
  const bulkRms = useBulkCreateRmsMutation();
  const bulkSmartLock = useBulkCreateSmartLockMutation();
  const isSim = tab === "sim";
  const label = tab === "sim" ? "SIM" : tab === "rms" ? "RMS" : "Smart Lock";
  const mutation =
    tab === "sim" ? bulkSim : tab === "rms" ? bulkRms : bulkSmartLock;
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const areaId = useId();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      // Accept CSV (first column) or newline-separated
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.split(",")[0].trim())
        .filter(Boolean);
      setText((prev) =>
        prev ? prev + "\n" + lines.join("\n") : lines.join("\n"),
      );
    };
    reader.readAsText(file);
    // reset file input
    e.target.value = "";
  };

  const handleSubmit = async () => {
    const serials = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (serials.length === 0) {
      toast.error("No serial numbers entered");
      return;
    }
    try {
      const result = await mutation.mutateAsync(serials);
      bulkToast(result);
      setText("");
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Bulk import failed"));
    }
  };

  const lineCount = text.split(/\r?\n/).filter((l) => l.trim()).length;

  return (
    <Modal
      open={open}
      onClose={() => {
        setText("");
        onClose();
      }}
      title={`Bulk Import ${label} Serials`}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Enter one serial number per line, or upload a CSV file (first column
          used).
        </p>

        <div>
          <label htmlFor={`${areaId}-area`} className="label">
            Serial Numbers
            {lineCount > 0 && (
              <span className="ml-2 text-brand-600">({lineCount} entered)</span>
            )}
          </label>
          <textarea
            id={`${areaId}-area`}
            className="input min-h-[160px] resize-y font-mono text-xs"
            placeholder={"89610123456789012345\n89610987654321098765\n..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600
                       transition hover:border-slate-300 hover:bg-slate-50"
          >
            📂 Upload CSV / TXT
          </button>
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="text-xs text-red-500 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setText("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={mutation.isPending}
            onClick={handleSubmit}
          >
            Import {lineCount > 0 ? `(${lineCount})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Serial Table ──────────────────────────────────────────────────────────────

type AnySerial = SimSerial | RmsSerial;

const SerialTable: React.FC<{
  serials: AnySerial[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}> = ({ serials, selected, onToggle, onToggleAll, onDelete, isDeleting }) => {
  const allSelected = serials.length > 0 && selected.size === serials.length;
  const someSelected = selected.size > 0 && !allSelected;

  if (serials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <span className="mb-2 text-4xl">📭</span>
        <p className="text-sm">No serials yet. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onToggleAll}
                aria-label="Select all"
              />
            </th>
            <th className="px-3 py-2 font-semibold text-slate-700">#</th>
            <th className="px-3 py-2 font-semibold text-slate-700">
              Serial Number
            </th>
            <th className="px-3 py-2 font-semibold text-slate-700">Added</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {serials.map((s, idx) => (
            <tr
              key={s._id}
              className={`transition-colors ${selected.has(s._id) ? "bg-brand-50" : "hover:bg-slate-50"}`}
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                  checked={selected.has(s._id)}
                  onChange={() => onToggle(s._id)}
                  aria-label={`Select ${s.serialNumber}`}
                />
              </td>
              <td className="px-3 py-2 text-slate-400 tabular-nums">
                {idx + 1}
              </td>
              <td className="px-3 py-2 font-mono text-slate-800">
                {s.serialNumber}
              </td>
              <td className="px-3 py-2 text-xs text-slate-500">
                {formatDate(s.createdAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => onDelete(s._id)}
                  disabled={isDeleting}
                  className="text-xs text-red-500 hover:underline disabled:opacity-40"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Tab panel ─────────────────────────────────────────────────────────────────

const TabPanel: React.FC<{ tab: TabId }> = ({ tab }) => {
  const isSim = tab === "sim";

  // Data
  const simQuery = useSimSerialsQuery();
  const rmsQuery = useRmsSerialsQuery();
  const smartLockQuery = useSmartLockSerialsQuery();
  const query =
    tab === "sim" ? simQuery : tab === "rms" ? rmsQuery : smartLockQuery;
  const serials: AnySerial[] = (query.data as AnySerial[]) ?? [];

  // Mutations
  const deleteSim = useDeleteSimMutation();
  const deleteRms = useDeleteRmsMutation();
  const deleteSmartLock = useDeleteSmartLockMutation();
  const bulkDelSim = useBulkDeleteSimMutation();
  const bulkDelRms = useBulkDeleteRmsMutation();
  const bulkDelSmartLock = useBulkDeleteSmartLockMutation();
  const singleDel =
    tab === "sim" ? deleteSim : tab === "rms" ? deleteRms : deleteSmartLock;
  const bulkDel =
    tab === "sim" ? bulkDelSim : tab === "rms" ? bulkDelRms : bulkDelSmartLock;

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === serials.length) setSelected(new Set());
    else setSelected(new Set(serials.map((s) => s._id)));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this serial?")) return;
    try {
      await singleDel.mutateAsync(id);
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      toast.success("Serial deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} selected serial${ids.length > 1 ? "s" : ""}?`,
      )
    )
      return;
    try {
      const result = await bulkDel.mutateAsync(ids);
      setSelected(new Set());
      toast.success(
        `${result.deleted} serial${result.deleted !== 1 ? "s" : ""} deleted`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Bulk delete failed"));
    }
  };

  if (query.isLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            {serials.length} serial {serials.length !== 1 ? "s" : ""}
            {selected.size > 0 && (
              <span className="ml-2 font-semibold text-brand-700">
                · {selected.size} selected
              </span>
            )}
          </p>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDel.isPending}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs
                         font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              🗑 Delete selected ({selected.size})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            ⬆ Bulk Import
          </Button>
          <Button onClick={() => setAddOpen(true)}>+ Add Serial</Button>
        </div>
      </div>

      {query.error && (
        <div className="card border-red-200 bg-red-50 card-body text-sm text-red-700">
          {apiErrorMessage(query.error, "Could not load serials")}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <SerialTable
          serials={serials}
          selected={selected}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          onDelete={handleDelete}
          isDeleting={singleDel.isPending}
        />
      </div>

      {/* Modals */}
      <AddSingleModal
        open={addOpen}
        tab={tab}
        onClose={() => setAddOpen(false)}
      />
      <BulkImportModal
        open={bulkOpen}
        tab={tab}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const SerialsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("sim");

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "sim", label: "SIM Serials", icon: "📡" },
    { id: "rms", label: "RMS Serials", icon: "🖥️" },
    { id: "smartlock", label: "Smart Lock", icon: "🔒" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Serial Inventory</h1>
        <p className="text-sm text-slate-500">
          Manage SIM card, RMS device, and Smart Lock serial numbers
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm
                        font-semibold transition-all ${
                          activeTab === t.id
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <TabPanel key={activeTab} tab={activeTab} />
    </div>
  );
};
