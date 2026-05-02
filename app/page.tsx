import { HeroSection } from "@/components/sections/hero-section";

export default function Home() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <HeroSection />
      <section
        className="min-h-[100vh] w-full shrink-0 border-t border-border bg-muted/25"
        aria-label="Scroll test area"
      />
    </div>
  );
}
