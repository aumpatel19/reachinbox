import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <div className="relative inline-block">
        <select
          ref={ref}
          className={`appearance-none rounded-full bg-zinc-100 py-2 pl-4 pr-9 text-sm font-medium text-zinc-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-100 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </div>
    );
  },
);
