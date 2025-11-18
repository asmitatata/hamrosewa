"use client";

import { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  color?: "default" | "emerald" | "amber" | "sky";
}

export default function Badge({ className = "", color = "default", ...props }: Props) {
  const variants = {
    default: "bg-zinc-100 text-zinc-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${variants[color]} ${className}`} {...props} />
  );
}
