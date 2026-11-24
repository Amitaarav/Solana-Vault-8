import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  helperText?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  suffix,
  helperText,
  error,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        <input
          id={inputId}
          className={`block w-full rounded-lg border bg-[#0d0f17] px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors duration-150 focus:outline-none focus:ring-1 ${
            suffix ? "pr-14" : ""
          } ${
            error
              ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500"
              : "border-[#262b3d] focus:border-indigo-500 focus:ring-indigo-500"
          } ${className}`}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <span className="font-mono text-xs font-semibold text-zinc-400">
              {suffix}
            </span>
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : (
        helperText && <p className="text-xs text-zinc-500">{helperText}</p>
      )}
    </div>
  );
};
