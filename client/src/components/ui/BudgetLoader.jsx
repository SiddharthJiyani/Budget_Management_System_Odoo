export default function BudgetLoader() {
  return (
    <div className="py-8">
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Loading Message */}
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          Loading analytics data for selected period...
        </p>
      </div>

      {/* Skeleton Table */}
      <div className="mt-8 space-y-3">
        {[1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="flex gap-4 animate-pulse">
            <div className="h-10 bg-muted/40 rounded w-1/3 shimmer"></div>
            <div className="h-10 bg-muted/40 rounded w-1/6 shimmer"></div>
            <div className="h-10 bg-muted/40 rounded w-1/6 shimmer"></div>
            <div className="h-10 bg-muted/40 rounded w-1/6 shimmer"></div>
            <div className="h-10 bg-muted/40 rounded w-1/6 shimmer"></div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        .shimmer {
          background: linear-gradient(
            90deg,
            var(--muted) 0%,
            var(--muted-foreground) 20%,
            var(--muted) 40%,
            var(--muted) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
