import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading,
  disabled,
  className,
  children,
  ...rest
}) => (
  <button
    {...rest}
    disabled={loading || disabled}
    className={clsx(variantClass[variant], className)}
  >
    {loading && <Spinner size={16} className="text-white" />}
    <span>{children}</span>
  </button>
);
