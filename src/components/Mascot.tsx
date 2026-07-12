import { Bird } from "lucide-react";
import { cn } from "@/lib/utils";

interface MascotProps {
  size?: number;
  className?: string;
  talking?: boolean;
}

/**
 * AI 信使吉祥物：一只衔着信的小鸟"小光"
 */
export default function Mascot({ size = 64, className, talking = false }: MascotProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* 光晕 */}
      <div
        className="absolute inset-0 rounded-full bg-gold-500/30 blur-xl"
        aria-hidden
      />
      {/* 主体 */}
      <div
        className={cn(
          "relative rounded-full bg-gradient-to-br from-gold-400 to-ochre-500",
          "shadow-warm flex items-center justify-center",
          talking && "animate-float-soft",
        )}
        style={{ width: size, height: size }}
      >
        <Bird
          size={size * 0.55}
          className="text-paper-50 drop-shadow-sm"
          strokeWidth={2.2}
        />
      </div>
      {/* 嘴边小信封 */}
      <div
        className="absolute -bottom-1 -right-1 bg-paper-50 rounded-[3px] shadow-stamp rotate-12"
        style={{ width: size * 0.28, height: size * 0.2 }}
        aria-hidden
      >
        <div className="absolute inset-[2px] border border-ochre-500/40 rounded-[2px]" />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            borderLeft: `${size * 0.1}px solid transparent`,
            borderRight: `${size * 0.1}px solid transparent`,
            borderBottom: `${size * 0.08}px solid rgba(181,103,62,0.5)`,
          }}
        />
      </div>
    </div>
  );
}
