import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/Button';
import { bulkCreateSites } from '@/api/sites';
import { sitesKeys } from '@/hooks/useSites';
import { parseImportFile, type ParsedRow } from '@/utils/sitesExcel';
import { apiErrorMessage } from '@/utils/helpers';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const BulkImportModal: React.FC<Props> = ({ open, onClose }) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: Array<{ row: number; reason: string }> } | null>(null);

  if (!open) return null;

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  const reset = () => {
    setRows([]);
    setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseImportFile(f);
      setRows(parsed);
      setFileName(f.name);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to parse file'));
    } finally {
      setParsing(false);
    }
  };

  const onConfirm = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    setImporting(true);
    try {
      const r = await bulkCreateSites(validRows.map((v) => v.payload));
      setResult(r);
      qc.invalidateQueries({ queryKey: sitesKeys.all });
      toast.success(`Imported ${r.created} site${r.created === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to import sites'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Bulk import sites</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {!result && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={onPick}
                  className="block text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
                {fileName && (
                  <span className="text-xs text-slate-500">Loaded: {fileName}</span>
                )}
                {rows.length > 0 && (
                  <Button type="button" variant="secondary" onClick={reset}>Clear</Button>
                )}
              </div>

              {parsing && <p className="text-sm text-slate-500">Parsing…</p>}

              {rows.length > 0 && (
                <>
                  <div className="text-sm text-slate-600">
                    {rows.length} row{rows.length === 1 ? '' : 's'} ·{' '}
                    <span className="font-semibold text-green-700">{validRows.length} valid</span>
                    {invalidCount > 0 && (
                      <> · <span className="font-semibold text-red-700">{invalidCount} with errors</span></>
                    )}
                  </div>
                  <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Row</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Site name</th>
                          <th className="px-3 py-2 font-semibold">Tawal ID</th>
                          <th className="px-3 py-2 font-semibold">Region</th>
                          <th className="px-3 py-2 font-semibold">Scope</th>
                          <th className="px-3 py-2 font-semibold">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => {
                          const ok = r.errors.length === 0;
                          return (
                            <tr key={r.rowNumber} className={ok ? '' : 'bg-red-50'}>
                              <td className="px-3 py-1.5 text-slate-500">{r.rowNumber}</td>
                              <td className="px-3 py-1.5">
                                {ok ? (
                                  <span className="font-semibold text-green-700">✓ valid</span>
                                ) : (
                                  <span className="font-semibold text-red-700">✗ error</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5">{r.payload.siteName}</td>
                              <td className="px-3 py-1.5">{r.payload.tawalId}</td>
                              <td className="px-3 py-1.5">{r.payload.region}</td>
                              <td className="px-3 py-1.5">{r.payload.rmsScope}</td>
                              <td className="px-3 py-1.5 text-red-700">
                                {r.errors.join('; ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Created <span className="font-semibold">{result.created}</span> site
                {result.created === 1 ? '' : 's'}.
              </div>
              {result.failed.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-800">
                    {result.failed.length} row{result.failed.length === 1 ? '' : 's'} failed:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-700">
                    {result.failed.map((f) => (
                      <li key={f.row}>Row {f.row}: {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          {result ? (
            <Button type="button" onClick={() => { reset(); onClose(); }}>Done</Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                onClick={onConfirm}
                loading={importing}
                disabled={validRows.length === 0}
              >
                Confirm import ({validRows.length})
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
