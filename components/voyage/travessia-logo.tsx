import TravessiaMark from "@/components/voyage/travessia-mark";
import { cn } from "@/lib/utils";

type TravessiaLogoProps = {
  className?: string;
  // Narrow chrome keeps the mark and leaves the name to assistive technology.
  compact?: boolean;
};

export default function TravessiaLogo({ className, compact = false }: TravessiaLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <TravessiaMark className="size-[1.9em] shrink-0" />
      <span className={cn("font-sans font-semibold tracking-[0.2em] uppercase", compact && "max-[26rem]:sr-only")}>
        Travessia
      </span>
    </span>
  );
}
