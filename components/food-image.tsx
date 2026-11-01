"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function FoodImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        className={cn(
          "bg-[radial-gradient(circle_at_30%_20%,#ff4d2e,#24160f_70%)]",
          className,
        )}
        role="img"
        aria-label={alt}
      />
    );
  }
  return (
    // Local cuisine photos, plus Google photo proxies that can fail.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
