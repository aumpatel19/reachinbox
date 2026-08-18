import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-xl border border-transparent bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 ${className}`}
        {...props}
      />
    );
  },
);
