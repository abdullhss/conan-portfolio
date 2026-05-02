"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";
import overlayImg from "@/assets/abdullah overlay.png";
import hiddenImg from "@/assets/abdullah hidden (window).png";

export function HeroSection() {
  const lensRootRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const root = lensRootRef.current;
    if (!root) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const duration = reduced ? 0 : 0.55;
    const pos = posRef.current;

    const syncCss = () => {
      root.style.setProperty("--mx", `${pos.x}px`);
      root.style.setProperty("--my", `${pos.y}px`);
    };

    const centerLens = () => {
      pos.x = root.clientWidth / 2;
      pos.y = root.clientHeight / 2;
      syncCss();
    };

    centerLens();

    const xTo = gsap.quickTo(pos, "x", {
      duration,
      ease: "power3.out",
      onUpdate: syncCss,
    });
    const yTo = gsap.quickTo(pos, "y", {
      duration,
      ease: "power3.out",
      onUpdate: syncCss,
    });

    const onPointerMove = (event: PointerEvent) => {
      if (reduced) return;
      const rect = root.getBoundingClientRect();
      xTo(event.clientX - rect.left);
      yTo(event.clientY - rect.top);
    };

    root.addEventListener("pointermove", onPointerMove);

    return () => {
      root.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <section className="box-border flex h-screen min-h-screen w-full shrink-0 flex-col items-stretch self-stretch bg-black pt-6 sm:pt-10">
      <div
        ref={lensRootRef}
        className="relative min-h-0 flex-1 w-full max-w-none select-none overflow-hidden bg-black"
        style={
          {
            touchAction: "pan-y",
            ["--lens-r"]: "min(32vmin, 9.5rem)",
          } as CSSProperties
        }
        aria-label="Portrait with interactive magnifying lens — move the pointer to reveal the image underneath."
      >
        <Image
          src={hiddenImg}
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-contain object-top select-none"
          draggable={false}
        />

        <Image
          src={overlayImg}
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none object-contain object-top select-none"
          draggable={false}
          style={{
            WebkitMaskImage:
              "radial-gradient(circle at var(--mx) var(--my), transparent var(--lens-r), black calc(var(--lens-r) + 1px))",
            WebkitMaskRepeat: "no-repeat",
            maskImage:
              "radial-gradient(circle at var(--mx) var(--my), transparent var(--lens-r), black calc(var(--lens-r) + 1px))",
            maskRepeat: "no-repeat",
          }}
        />

        <div
          className="pointer-events-none absolute rounded-full border border-white/45 bg-linear-to-br from-white/12 to-transparent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_12px_40px_rgba(0,0,0,0.2)]"
          style={{
            width: "calc(var(--lens-r) * 2)",
            height: "calc(var(--lens-r) * 2)",
            left: "var(--mx)",
            top: "var(--my)",
            transform: "translate(-50%, -50%)",
          }}
          aria-hidden
        />
      </div>
    </section>
  );
}
