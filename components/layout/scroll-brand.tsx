"use client";

import { useEffect, useState } from "react";

import { siteConfig } from "@/lib/constants";

const SCROLL_THRESHOLD_PX = 48;

type ScrollBrandProps = {
  className?: string;
};

export function ScrollBrand({ className }: ScrollBrandProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed top-4 left-4 z-100 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out motion-reduce:transition-none ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <p
        className={`bg-linear-to-b from-yellow-300 via-orange-400 to-red-600 bg-clip-text text-transparent text-3xl font-extrabold leading-none tracking-wide sm:text-4xl ${className ?? ""}`}
      >
        {siteConfig.name}
      </p>
    </div>
  );
}
