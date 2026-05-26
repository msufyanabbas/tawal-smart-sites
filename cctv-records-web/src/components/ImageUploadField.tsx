import { useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { readFileAsDataUrl } from '@/utils/helpers';

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  className?: string;
  maxSizeMB?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  className,
  maxSizeMB = 5,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeMB} MB`);
      return;
    }
    setBusy(true);
    try {
      const url = await readFileAsDataUrl(file);
      onChange(url);
    } catch {
      toast.error('Failed to read image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={clsx('space-y-2', className)}>
      <p className="label">{label}</p>
      <div className="flex items-start gap-3">
        <div
          className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 hover:border-brand-400"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : busy ? (
            'Reading…'
          ) : (
            'Click to upload'
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5 !text-xs"
            onClick={() => inputRef.current?.click()}
          >
            {value ? 'Replace' : 'Upload image'}
          </button>
          {value && (
            <button
              type="button"
              className="btn-danger !px-3 !py-1.5 !text-xs"
              onClick={() => onChange(undefined)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Reset input so the same file can be picked again after removal.
          e.target.value = '';
        }}
      />
    </div>
  );
};
