import { cn } from "@/lib/utils";

/** AI 正在思考的打字指示器（三个跳动的暖色圆点） */
export default function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label="AI 正在输入"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-ochre-500/70"
          style={{
            animation: "wave 1s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}
