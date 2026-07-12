import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PostmarkProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  rotate?: number;
}

/**
 * 邮戳印章装饰组件
 * 圆形双环 + 文字，模拟旧时邮局印章
 */
export default function Postmark({
  children,
  className,
  size = "md",
  rotate = -12,
}: PostmarkProps) {
  const sizes = {
    sm: "w-16 h-16 text-[10px]",
    md: "w-24 h-24 text-xs",
    lg: "w-32 h-32 text-sm",
  };
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full",
        "border-[2.5px] border-ochre-600/55 text-ochre-600/80",
        "font-display tracking-[0.15em] uppercase select-none",
        "before:content-[''] before:absolute before:inset-[6px] before:rounded-full before:border before:border-ochre-600/40",
        sizes[size],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className="relative z-10 text-center leading-tight px-2">
        {children}
      </span>
    </div>
  );
}
