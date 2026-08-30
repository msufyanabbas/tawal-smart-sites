import { useEffect, useState } from "react";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className = "",
  imgClassName = "h-24 w-24 object-cover",
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block overflow-hidden rounded-lg border border-slate-200 transition hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${className}`}
        title="Click to view full image"
      >
        <img src={src} alt={alt} className={imgClassName} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
          <svg
            className="h-5 w-5 text-white drop-shadow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
            />
          </svg>
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image preview"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          {/* Top bar with Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close image preview"
            className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Close</span>
          </button>

          {/* Modal Content */}
          <div
            className="relative flex max-h-[85vh] max-w-5xl flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            {alt && (
              <p className="mt-2 text-center text-sm font-medium text-slate-200">
                {alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
