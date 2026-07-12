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
  return (
    <figure
      className={cn("relative inline-block", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* 邮票齿边底纸 */}
      <div
        className="relative bg-paper-50 p-3 pb-4 shadow-photo rounded-sm"
        style={{
          maskImage:
            "radial-gradient(circle 5px at 5px 50%, transparent 4px, #000 5px), radial-gradient(circle 5px at calc(100% - 5px) 50%, transparent 4px, #000 5px), radial-gradient(circle 5px at 50% 5px, transparent 4px, #000 5px), radial-gradient(circle 5px at 50% calc(100% - 5px), transparent 4px, #000 5px)",
          WebkitMaskComposite: "source-over",
          maskComposite: "intersect",
        }}
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
              "block w-full h-auto object-cover",
              vintage && "filter-vintage",
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
