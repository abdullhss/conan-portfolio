"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Served from `public/conan-door.mp4` (static URL avoids Turbopack’s unknown module type for `.mp4` imports). */
const DOOR_VIDEO_SRC = "/conan-door.mp4";

/**
 * Only the first ~1.2s of the file is used (then fade out). Avoids long black tail
 * after the door opens when the rest of the file is mostly black.
 */
const DOOR_CLIP_SEC = 1.2;

/**
 * Within `DOOR_CLIP_SEC`, first ratio = “door closing,” remainder = “opening.”
 */
const CLOSE_PHASE_RATIO = 0.5;

function normalizeFullPath(pathname: string, search: string) {
  return pathname + (search ? `?${search}` : "");
}

function stripHash(path: string) {
  const i = path.indexOf("#");
  return i === -1 ? path : path.slice(0, i);
}

function pathsMatchAfterNav(pending: string | null, currentFull: string) {
  if (pending === null) return false;
  return stripHash(pending) === currentFull;
}

function DoorTransitionInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();

  const videoRef = useRef<HTMLVideoElement>(null);
  const splitTimeRef = useRef(0);
  /** End time (seconds) for intro / open playback — min(file duration, DOOR_CLIP_SEC). */
  const clipEndRef = useRef(DOOR_CLIP_SEC);
  const phaseRef = useRef<"intro" | "idle" | "close" | "open">("intro");
  const introStartedRef = useRef(false);
  const introDoneRef = useRef(false);
  const videoArmedRef = useRef(false);
  const closeNavSentRef = useRef(false);
  const pendingTargetRef = useRef<string | null>(null);

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const fullPath = normalizeFullPath(pathname, searchString);

  function finishIntro() {
    if (introDoneRef.current) return;
    introDoneRef.current = true;
    phaseRef.current = "idle";
    videoRef.current?.pause();
    setOverlayVisible(false);
  }

  /** Duration is often NaN on first `loadedmetadata`; later events fix it. */
  function tryArmVideoFromEl(v: HTMLVideoElement | null) {
    if (!v || videoArmedRef.current) return;
    const d = v.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    videoArmedRef.current = true;
    const clipEnd = Math.min(d, DOOR_CLIP_SEC);
    clipEndRef.current = clipEnd;
    splitTimeRef.current = Math.max(clipEnd * CLOSE_PHASE_RATIO, 0.05);
    setVideoReady(true);
  }

  function runOpenPhase() {
    const v = videoRef.current;
    const split = splitTimeRef.current;
    if (!v || split <= 0) {
      phaseRef.current = "idle";
      setOverlayVisible(false);
      return;
    }
    phaseRef.current = "open";
    setOverlayVisible(true);
    v.pause();
    v.currentTime = split;
    void v.play().catch(() => {
      phaseRef.current = "idle";
      setOverlayVisible(false);
    });
  }

  function onVideoProgressCheck() {
    const v = videoRef.current;
    if (!v) return;
    const clipEnd = clipEndRef.current;

    if (phaseRef.current === "intro") {
      if (introDoneRef.current) return;
      if (v.currentTime >= clipEnd - 0.02 || v.ended) {
        finishIntro();
      }
      return;
    }

    if (phaseRef.current === "open") {
      if (v.currentTime >= clipEnd - 0.02 || v.ended) {
        phaseRef.current = "idle";
        v.pause();
        setOverlayVisible(false);
      }
    }
  }

  /** If metadata never yields a finite duration (edge codecs / partial load), still reveal the site. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!videoArmedRef.current && !introDoneRef.current) {
        finishIntro();
      }
    }, 8000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!videoReady || introStartedRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    introStartedRef.current = true;

    const skipIntro = () => {
      finishIntro();
    };

    if (prefersReducedMotion) {
      queueMicrotask(skipIntro);
      return;
    }

    const v = videoRef.current;
    if (!v) {
      queueMicrotask(skipIntro);
      return;
    }

    phaseRef.current = "intro";
    v.pause();
    v.currentTime = 0;

    void v.play().catch(() => {
      queueMicrotask(skipIntro);
    });
  }, [videoReady]);

  useEffect(() => {
    if (!introDoneRef.current) return;
    const pending = pendingTargetRef.current;
    if (!pathsMatchAfterNav(pending, fullPath)) return;

    pendingTargetRef.current = null;
    closeNavSentRef.current = false;
    runOpenPhase();
  }, [fullPath]);

  function handleVideoEnded() {
    if (phaseRef.current === "intro") {
      finishIntro();
      return;
    }
    if (phaseRef.current === "open") {
      phaseRef.current = "idle";
      videoRef.current?.pause();
      setOverlayVisible(false);
      return;
    }
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      if (phaseRef.current !== "close" || closeNavSentRef.current) return;
      const split = splitTimeRef.current;
      if (split <= 0) return;
      if (v.currentTime >= split - 0.05) {
        closeNavSentRef.current = true;
        v.pause();
        const target = pendingTargetRef.current;
        if (target) {
          router.push(target);
        }
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [router, videoReady]);

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (!introDoneRef.current || !videoReady) return;
      if (phaseRef.current !== "idle") return;
      if (e.defaultPrevented) return;

      const el = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!el) return;

      const a = el as HTMLAnchorElement;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;
      if (a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const nextPathSearch = url.pathname + url.search;
      const loc = window.location;
      const currentPathSearch = loc.pathname + loc.search;

      if (nextPathSearch === currentPathSearch) {
        return;
      }

      const nextForRouter = url.pathname + url.search + url.hash;

      e.preventDefault();
      pendingTargetRef.current = nextForRouter;
      closeNavSentRef.current = false;
      phaseRef.current = "close";
      setOverlayVisible(true);

      const vid = videoRef.current;
      const split = splitTimeRef.current;
      if (!vid || split <= 0) {
        router.push(nextForRouter);
        return;
      }

      vid.pause();
      vid.currentTime = 0;
      void vid.play().catch(() => {
        router.push(nextForRouter);
      });
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [router, videoReady]);

  return (
    <>
      {children}
      <div
        aria-hidden={!overlayVisible}
        className={`fixed inset-0 z-10000 flex items-center justify-center bg-black transition-opacity duration-500 ease-out motion-reduce:transition-none motion-reduce:duration-150 ${
          overlayVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="auto"
          src={DOOR_VIDEO_SRC}
          onLoadedMetadata={() => tryArmVideoFromEl(videoRef.current)}
          onDurationChange={() => tryArmVideoFromEl(videoRef.current)}
          onLoadedData={() => tryArmVideoFromEl(videoRef.current)}
          onCanPlay={() => tryArmVideoFromEl(videoRef.current)}
          onError={() => {
            finishIntro();
          }}
          onEnded={handleVideoEnded}
          onTimeUpdate={onVideoProgressCheck}
        />
      </div>
    </>
  );
}

export function DoorTransition({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <DoorTransitionInner>{children}</DoorTransitionInner>
    </Suspense>
  );
}
