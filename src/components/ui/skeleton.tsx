import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/70 bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:800px_100%]",
        "animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
