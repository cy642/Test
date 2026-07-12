import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PhotoFrameProps {
  src: string;
  alt?: string;
  caption?: string;
  rotate?: number;
  className?: string;
  vintage?: boolean;
}

/**
 * 老相册风格的相框：邮票齿边 + 微微旋转 + 暖色阴影
 * 齿边效果用 radial-gradient 模拟四边齿孔
 */
export default function PhotoFrame({
  src,
  alt = "老照片",
  caption,
  rotate = -2,
  className,
  vintage = true,
}: PhotoFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // 邮票齿边：四边均匀齿孔
  const stampMaskStyle = {
    // 上边齿孔
    backgroundImage: [
      "radial-gradient(circle 4px at 8px 0, transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at calc(100% - 8px) 0, transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at 0 8px, transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at 100% 8px, transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at 8px 100%, transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at calc(100% - 8px) 100%, transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at 0 calc(100% - 8px), transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at 100% calc(100% - 8px), transparent 3.5px, #fdf8ef 4px)",
      "radial-gradient(circle 4px at 8px 8px, transparent 3.5px, #fdf8ef 4px)",
    ].join(", "),
    backgroundSize: "16px 16px, 16px 16px, 16px 16px, 16px 16px, 16px 16px, 16px 16px, 16px 16px, 16px 16px, 16px 16px",
    backgroundPosition: "top left, top right, left top, right top, bottom left, bottom right, left bottom, right bottom, top left",
    backgroundRepeat: "repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat",
  } as React.CSSProperties;

  return (
    <figure
      className={cn("relative inline-block", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* 邮票齿边底纸 */}
      <div
        className="relative bg-paper-50 p-3 pb-4 shadow-photo rounded-sm"
        style={stampMaskStyle}
      >
        <div className="relative overflow-hidden bg-paper-200">
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-paper-200" />
          )}
          <img
            ref={ref}
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn(
              "block w-full h-auto object-cover transition-opacity duration-700",
              vintage && "filter-vintage",
              loaded ? "animate-photo-reveal" : "opacity-0 blur-xl",
            )}
          />
          {/* 暖色光晕 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 50%, rgba(60,40,30,0.25) 100%)",
            }}
          />
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-sm font-serif text-ink-700/80 italic">
            {caption}
          </figcaption>
        )}
      </div>
    </figure>
  );
}
