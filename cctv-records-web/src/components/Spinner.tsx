import clsx from 'clsx';

interface SpinnerProps {
  className?: string;
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ className, size = 20 }) => (
  <svg
    className={clsx('animate-spin text-brand-500', className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const FullPageSpinner: React.FC = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center">
    <Spinner size={36} />
  </div>
);
