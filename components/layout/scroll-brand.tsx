"use client";

import { siteConfig } from "@/lib/constants";

type ScrollBrandProps = {
  className?: string;
};

export function ScrollBrand({ className }: ScrollBrandProps) {
  const gradient =
    "bg-linear-to-b from-yellow-300 via-orange-400 to-red-600 bg-clip-text text-transparent font-extrabold leading-[0.95] tracking-wide";

  return (
    <div
      className="pointer-events-none fixed top-4 left-4 z-100 max-w-[calc(100vw-2rem)]"
      aria-hidden={false}
    >
      <p className={`flex flex-col ${className ?? ""}`}>
        <span
          className={`${gradient} text-2xl sm:text-3xl`}
        >
          {siteConfig.brandFirst}
        </span>
        <span className={`${gradient} text-4xl sm:text-5xl`}>
          {siteConfig.brandSecond}
        </span>
      </p>
    </div>
  );
}
