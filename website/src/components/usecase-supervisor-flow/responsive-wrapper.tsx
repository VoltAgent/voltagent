import { useMediaQuery } from "@site/src/hooks/use-media-query";
import { Suspense, lazy } from "react";

// Lazy load components to ensure proper hydration
const UseCaseSupervisorFlow = lazy(() =>
  import("./index").then((module) => ({ default: module.UseCaseSupervisorFlow })),
);
const MobileFlow = lazy(() =>
  import("./mobile-flow").then((module) => ({ default: module.MobileFlow })),
);

interface ResponsiveFlowProps {
  slug: string;
  className?: string;
}

export function ResponsiveSupervisorFlow({ slug, className }: ResponsiveFlowProps) {
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Loading fallback
  const LoadingFallback = () => (
    <div className={className} style={{ minHeight: isMobile ? "300px" : "500px" }}>
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-emerald-400">Loading...</div>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      {isMobile ? (
        <MobileFlow slug={slug} className={className} />
      ) : (
        <UseCaseSupervisorFlow slug={slug} className={className} />
      )}
    </Suspense>
  );
}
