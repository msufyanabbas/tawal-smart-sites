import clsx from 'clsx';
import { forwardRef, SelectHTMLAttributes } from 'react';

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, placeholder = 'Select…', className, id, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx('input', error && 'input-error', className)}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="helper-text">{error}</p>}
      </div>
    );
  },
);
SelectField.displayName = 'SelectField';
