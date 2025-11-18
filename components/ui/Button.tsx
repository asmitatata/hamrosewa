"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", disabled, ...props },
  ref
) {
  const base = "rounded-lg h-11 px-4 font-medium inline-flex items-center justify-center transition-colors";
  const variants: Record<Variant, string> = {
    primary: `${"text-white shadow"} ${disabled ? "bg-rose-300 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700"}`,
    ghost: `${"border bg-white"} ${disabled ? "border-zinc-200 text-zinc-400 cursor-not-allowed" : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"}`,
  };
  const cx = (...arr: (string | undefined)[]) => arr.filter(Boolean).join(" ");
  return (
    <button ref={ref} className={cx(base, variants[variant], className)} disabled={disabled} {...props} />
  );
});

export default Button;
