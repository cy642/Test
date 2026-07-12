import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="eyebrow">
          <span className="inline-block w-6 h-px bg-ochre-500/50" />
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl md:text-4xl text-ink-800 text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-ink-700/80 max-w-2xl leading-relaxed text-balance">
          {subtitle}
        </p>
      )}
    </div>
  );
}
