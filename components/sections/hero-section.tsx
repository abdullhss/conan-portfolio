"use client";

import type { CSSProperties } from "react";
import { useId, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import Image from "next/image";
import overlayImg from "@/assets/abdullah overlay.png";
import hiddenImg from "@/assets/abdullah hidden (window).png";

/** Natural size of the portrait assets — scene width follows this so side gutters stay free for UI. */
const PORTRAIT_W = overlayImg.width;
const PORTRAIT_H = overlayImg.height;
/** width ÷ height — used to size the box when only absolute children are inside. */
const PORTRAIT_WH_RATIO = PORTRAIT_W / PORTRAIT_H;

const MAX_TILT_DEG = 9;
const Z_BACK = -42;
const Z_FRONT = 52;

/** Base scale for the lens; larger = wider/taller polygon overall. */
function lensRadiusPx(rootW: number, rootH: number): number {
  const vmin = Math.min(rootW, rootH) / 100;
  return Math.min(56 * vmin, 15.5 * 16);
}

/** Extra horizontal spread (1 = uniform; values above 1 stretch width). */
const LENS_WIDTH_STRETCH = 1.22;

/** Deterministic PRNG for stable SSR + hydration (same “random” shape every build). */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LensVertexSpec = { angle: number; rMul: number };

/** Irregular polygon: jittered angles + random radius multipliers, sorted by angle (simple polygon). */
function buildIrregularLensSpec(seed: number, sides: number): LensVertexSpec[] {
  const rnd = mulberry32(seed);
  const raw: LensVertexSpec[] = [];
  for (let i = 0; i < sides; i++) {
    const baseAngle = (2 * Math.PI * i) / sides;
    const angleJitter = (rnd() - 0.5) * 0.55;
    raw.push({
      angle: baseAngle + angleJitter,
      rMul: 0.58 + rnd() * 0.42,
    });
  }
  raw.sort((a, b) => a.angle - b.angle);
  return raw;
}

/** Change seed to reshuffle the silhouette; keep fixed so SSR matches client. */
const IRREGULAR_POLYGON_SEED = 0xdea110c;

const IRREGULAR_LENS_SPEC = buildIrregularLensSpec(IRREGULAR_POLYGON_SEED, 300);

/** Static outline (reduced motion / fallback). */
function irregularPolygonPoints(cx: number, cy: number, baseR: number): string {
  return IRREGULAR_LENS_SPEC.map(({ angle, rMul }) => {
    const R = baseR * rMul;
    const x = cx + R * Math.cos(angle) * LENS_WIDTH_STRETCH;
    const y = cy + R * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");
}

/** Same vertices as `buildIrregularLensSpec`, with gentle radial + angular motion over `timeSec`. */
const LENS_BREATHE_AMP = 0.05;
const LENS_BREATHE_HZ = 0.85;
const LENS_ANGLE_WOBBLE_AMP = 0.035;

function irregularPolygonPointsAnimated(
  cx: number,
  cy: number,
  baseR: number,
  timeSec: number,
): string {
  const omega = Math.PI * 2 * LENS_BREATHE_HZ;
  return IRREGULAR_LENS_SPEC.map(({ angle, rMul }, i) => {
    const phase = i * 0.37;
    const breathe = 1 + LENS_BREATHE_AMP * Math.sin(omega * timeSec + phase);
    const angleWobble =
      LENS_ANGLE_WOBBLE_AMP *
      Math.sin(timeSec * 1.15 + i * 0.09 + 2.1);
    const a = angle + angleWobble;
    const R = baseR * rMul * breathe;
    const x = cx + R * Math.cos(a) * LENS_WIDTH_STRETCH;
    const y = cy + R * Math.sin(a);
    return `${x},${y}`;
  }).join(" ");
}

export function HeroSection() {
  const maskId = useId().replace(/:/g, "");

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const maskElRef = useRef<SVGMaskElement>(null);
  const maskRectRef = useRef<SVGRectElement>(null);
  const holePolyRef = useRef<SVGPolygonElement>(null);
  const rimPolyRef = useRef<SVGPolygonElement>(null);

  const posRef = useRef({ x: 0, y: 0 });
  const tiltRef = useRef({ rx: 0, ry: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const scene = sceneRef.current;
    if (!root || !scene) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lensDur = reduced ? 0 : 0.55;
    const tiltDur = reduced ? 0 : 0.38;

    const pos = posRef.current;
    const tilt = tiltRef.current;

    const syncLensShapes = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const R = lensRadiusPx(w, h);
      const t = performance.now() / 1000;
      const pts = reduced
        ? irregularPolygonPoints(pos.x, pos.y, R)
        : irregularPolygonPointsAnimated(pos.x, pos.y, R, t);

      maskElRef.current?.setAttribute("x", "0");
      maskElRef.current?.setAttribute("y", "0");
      maskElRef.current?.setAttribute("width", String(w));
      maskElRef.current?.setAttribute("height", String(h));
      maskRectRef.current?.setAttribute("x", "0");
      maskRectRef.current?.setAttribute("y", "0");
      maskRectRef.current?.setAttribute("width", String(w));
      maskRectRef.current?.setAttribute("height", String(h));

      holePolyRef.current?.setAttribute("points", pts);
      rimPolyRef.current?.setAttribute("points", pts);
    };

    const applyTilt = () => {
      scene.style.transform = `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`;
    };

    const centerLens = () => {
      pos.x = root.clientWidth / 2;
      pos.y = root.clientHeight / 2;
      syncLensShapes();
    };

    centerLens();
    applyTilt();

    const xTo = gsap.quickTo(pos, "x", {
      duration: lensDur,
      ease: "power3.out",
      onUpdate: syncLensShapes,
    });
    const yTo = gsap.quickTo(pos, "y", {
      duration: lensDur,
      ease: "power3.out",
      onUpdate: syncLensShapes,
    });

    const rxTo = gsap.quickTo(tilt, "rx", {
      duration: tiltDur,
      ease: "power3.out",
      onUpdate: applyTilt,
    });
    const ryTo = gsap.quickTo(tilt, "ry", {
      duration: tiltDur,
      ease: "power3.out",
      onUpdate: applyTilt,
    });

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();

      if (!reduced) {
        xTo(event.clientX - rect.left);
        yTo(event.clientY - rect.top);
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;
        rxTo(-ny * 2 * MAX_TILT_DEG);
        ryTo(nx * 2 * MAX_TILT_DEG);
      }
    };

    const onPointerLeave = () => {
      if (reduced) return;
      rxTo(0);
      ryTo(0);
    };

    const ro = new ResizeObserver(() => {
      pos.x = root.clientWidth / 2;
      pos.y = root.clientHeight / 2;
      syncLensShapes();
    });
    ro.observe(root);

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);

    const onLensTick = () => {
      syncLensShapes();
    };
    if (!reduced) {
      gsap.ticker.add(onLensTick);
    }

    return () => {
      if (!reduced) {
        gsap.ticker.remove(onLensTick);
      }
      ro.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const fullMaskId = `lens-irregular-${maskId}`;
  /** Matches ScrollBrand: bg-linear-to-b from-yellow-300 via-orange-400 to-red-600 */
  const rimStrokeGradientId = `lens-rim-grad-${maskId}`;

  return (
    <section className="box-border flex h-screen min-h-screen w-full shrink-0 flex-col items-stretch self-stretch bg-black pb-0 pt-6 sm:pt-10">
      <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-3 px-3 pb-0 sm:px-4">
        {/* Optional: add columns before/after the portrait (e.g. <aside className="hidden w-40 shrink-0 lg:block" />) */}
        <div
          ref={rootRef}
          className="relative min-h-0 w-auto max-w-full shrink-0 select-none overflow-hidden bg-black"
          style={
            {
              touchAction: "pan-y",
              perspective: "1400px",
              aspectRatio: `${PORTRAIT_W} / ${PORTRAIT_H}`,
              /* Explicit width so the box isn’t height-collapsed (all scene children are absolute). */
              width: `min(100%, calc(88svh * ${PORTRAIT_WH_RATIO}))`,
              maxHeight: "88svh",
            } as CSSProperties
          }
          aria-label="Interactive 3D parallax portrait with irregular polygon lens — move the pointer to tilt the scene and reveal the layer below."
        >
          <div
            ref={sceneRef}
            className="absolute inset-0 transform-3d will-change-transform"
          style={{
            transformOrigin: "center center",
            transform: "rotateX(0deg) rotateY(0deg)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 transform-3d"
            style={{
              transform: `translateZ(${Z_BACK}px) scale(1.07)`,
            }}
          >
            <Image
              src={hiddenImg}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 96vw, min(90vw, 1200px)"
              className="pointer-events-none object-contain object-bottom select-none"
              draggable={false}
            />
          </div>

          <div
            className="pointer-events-none absolute inset-0 transform-3d"
            style={{
              transform: `translateZ(${Z_FRONT}px) scale(1.015)`,
            }}
          >
            <Image
              src={overlayImg}
              alt=""
              fill
              sizes="(max-width: 768px) 96vw, min(90vw, 1200px)"
              className="pointer-events-none object-contain object-bottom select-none"
              draggable={false}
              style={{
                WebkitMaskImage: `url(#${fullMaskId})`,
                WebkitMaskRepeat: "no-repeat",
                maskImage: `url(#${fullMaskId})`,
                maskRepeat: "no-repeat",
              }}
            />

            <svg
              className="pointer-events-none absolute inset-0 size-full"
              aria-hidden
            >
              <defs>
                <linearGradient
                  id={rimStrokeGradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                  gradientUnits="objectBoundingBox"
                >
                  <stop offset="0%" stopColor="#fde047" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#fb923c" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.2} />
                </linearGradient>
                <mask
                  ref={maskElRef}
                  id={fullMaskId}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="1"
                  height="1"
                >
                  <rect
                    ref={maskRectRef}
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    fill="white"
                  />
                  <polygon ref={holePolyRef} fill="black" />
                </mask>
              </defs>
              <polygon
                ref={rimPolyRef}
                fill="none"
                stroke={`url(#${rimStrokeGradientId})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
