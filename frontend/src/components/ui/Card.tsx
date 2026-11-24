import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  action,
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-[#1f2330] bg-[#11131a] p-5 shadow-sm transition-all duration-200 ${className}`}
      {...props}
    >
      {(title || description || action) && (
        <div className="mb-4 flex items-start justify-between border-b border-[#1f2330]/70 pb-3">
          <div>
            {title && (
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
            )}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
