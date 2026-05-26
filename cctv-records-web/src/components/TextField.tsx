import clsx from 'clsx';
import { forwardRef, InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, helper, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx('input', error && 'input-error', className)}
          {...rest}
        />
        {error ? (
          <p className="helper-text">{error}</p>
        ) : helper ? (
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = 'TextField';
