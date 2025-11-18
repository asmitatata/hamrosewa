"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`h-11 rounded-lg border border-zinc-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 ${className}`}
      {...props}
    />
  );
});

export default Select;
