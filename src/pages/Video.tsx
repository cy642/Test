import { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Play,
  Pause,
  Sparkles,
  Check,
  Music,
  Film,
  RotateCcw,
  Image as ImageIcon,
  BookOpen,
  Redo2,
  ArrowRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import Postmark from "@/components/Postmark";
import { useStore } from "@/store/useStore";
import { generateVideo, VIDEO_SUBTITLES } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { VideoClip } from "@/types";

const GENERATE_STAGES = [
  { icon: ImageIcon, label: "选照片" },
  { icon: BookOpen, label: "写旁白" },
  { icon: Music, label: "配音乐" },
  { icon: Film, label: "合成画面" },
];

export default function Video() {
  const photos = useStore((s) => s.photos);
  const stories = useStore((s) => s.stories);
  const clips = useStore((s) => s.videoClips);
  const toggleClip = useStore((s) => s.toggleVideoClip);
  const clearClips = useStore((s) => s.clearVideoClips);

  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState("");
  const [playing, setPlaying] = useState(false);
  const [subIdx, setSubIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const subTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 根据 progress 算出当前阶段索引
  const currentStageIdx =
    progress <= 25 ? 0 : progress <= 50 ? 1 : progress <= 75 ? 2 : 3;

  useEffect(() => () => {
    abortRef.current?.abort();
    if (subTimerRef.current) clearInterval(subTimerRef.current);
  }, []);

  async function generate() {
    if (clips.length === 0 || phase === "generating") return;
    setPhase("generating");
    setProgress(0);
    setFinished(false);
    abortRef.current = new AbortController();
    await generateVideo({
      onProgress: (p, stage) => {
        setProgress(p);
        setStageText(stage);
      },
      onDone: () => {
        setPhase("done");
        setPlaying(true);
      },
      signal: abortRef.current.signal,
    });
  }

  // 播放时字幕轮播
  useEffect(() => {
    if (phase === "done" && playing) {
      setFinished(false);
      subTimerRef.current = setInterval(() => {
        setSubIdx((prev) => {
          const next = (prev + 1) % VIDEO_SUBTITLES.length;
          if (next === 0) setFinished(true);
          return next;
        });
      }, 3600);
    } else {
      if (subTimerRef.current) clearInterval(subTimerRef.current);
    }
    return () => {
      if (subTimerRef.current) clearInterval(subTimerRef.current);
    };
  }, [phase, playing]);

  function replay() {
    setSubIdx(0);
    setPlaying(true);
    setFinished(false);
  }

  function reset() {
    abortRef.current?.abort();
    setPhase("idle");
    setProgress(0);
    setPlaying(false);
    setSubIdx(0);
    setFinished(false);
    clearClips();
  }

  const selectedPhotos = clips.filter((c) => c.type === "photo");
  const selectedStories = clips.filter((c) => c.type === "story");

  return (
    <Layout>
      <SectionTitle
        eyebrow="AI 回忆视频"
        title="把这一段时光，剪成寄给家人的短片"
        subtitle="挑选几张照片、几段故事，小光会替您配上字幕和音乐，做成一段 30 秒的家庭回忆短片。"
      />

      <div className="mt-10 grid lg:grid-cols-[1fr_1.2fr] gap-8">
        {/* 左：素材选择 */}
        <div className="space-y-6">
          {/* 照片素材 */}
          <div className="paper-card p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="text-sage-600" size={22} />
              <h3 className="font-display text-xl text-ink-800">挑几张照片</h3>
              <span className="ml-auto text-sm text-ink-700/60 font-serif">
                已选 {selectedPhotos.length}
              </span>
            </div>
            {photos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <ImageIcon size={32} className="text-ink-700/30" />
                <p className="text-base text-ink-700/60 font-serif">
                  还没有照片，先去「贴张老照片」收录一些吧。
                </p>
                <p className="text-sm text-ink-700/40 font-serif">
                  照片是视频最温暖的素材，收录几张后回来挑选 ✦
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p) => {
                  const selected = clips.some(
                    (c) => c.refId === p.id,
                  );
                  const clipData: Omit<VideoClip, "id"> = {
                    type: "photo",
                    refId: p.id,
                    title: p.era,
                    subtitle: p.memory.slice(0, 24) + "…",
                  };
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleClip(clipData)}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300",
                        selected
                          ? "border-ochre-500 ring-2 ring-ochre-500/30 scale-[1.03] shadow-warm"
                          : "border-ochre-500/15 opacity-70 grayscale-[30%] hover:opacity-100 hover:grayscale-0 hover:border-ochre-500/40",
                      )}
                    >
                      <img
                        src={p.url}
                        alt={p.era}
                        className="w-full h-full object-cover filter-vintage"
                      />
                      <div className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        selected
                          ? "bg-gradient-to-t from-ink-900/60 to-transparent"
                          : "bg-ink-900/20 hover:bg-gradient-to-t hover:from-ink-900/60 hover:to-transparent",
                      )} />
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] text-paper-50 font-serif text-center">
                        {p.era}
                      </span>
                      {selected && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ochre-500 text-paper-50 flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      {!selected && (
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="w-7 h-7 rounded-full border-2 border-paper-50/80 bg-ink-900/30" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 故事素材 */}
          <div className="paper-card p-5 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="text-ochre-600" size={22} />
              <h3 className="font-display text-xl text-ink-800">挑几段故事</h3>
              <span className="ml-auto text-sm text-ink-700/60 font-serif">
                已选 {selectedStories.length}
              </span>
            </div>
            {stories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <BookOpen size={32} className="text-ink-700/30" />
                <p className="text-base text-ink-700/60 font-serif">
                  还没有故事，先去「讲段故事」记录一些吧。
                </p>
                <p className="text-sm text-ink-700/40 font-serif">
                  故事是旁白的灵魂，记录几段后回来挑选 ✦
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {stories.map((s) => {
                  const selected = clips.some((c) => c.refId === s.id);
                  const clipData: Omit<VideoClip, "id"> = {
                    type: "story",
                    refId: s.id,
                    title: s.title,
                    subtitle: s.content.slice(0, 30) + "…",
                  };
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleClip(clipData)}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl border transition-all duration-300 flex gap-3 items-start",
                        selected
                          ? "bg-ochre-500/10 border-ochre-500 shadow-warm"
                          : "bg-paper-50/60 border-ochre-500/15 opacity-60 hover:opacity-100 hover:border-ochre-500/40",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300",
                          selected
                            ? "bg-ochre-500 border-ochre-500 text-paper-50"
                            : "border-ochre-500/30",
                        )}
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <div className={cn(
                          "font-display text-lg transition-colors duration-300 truncate",
                          selected ? "text-ink-800" : "text-ink-700/60",
                        )}>
                          {s.title}
                        </div>
                        <div className="text-sm text-ink-700/70 font-serif line-clamp-2 mt-0.5">
                          {s.content}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={generate}
              disabled={clips.length === 0 || phase === "generating"}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={20} />
              {phase === "generating" ? "正在生成…" : "生成回忆视频"}
            </button>
            {clips.length > 0 && (
              <button onClick={clearClips} className="btn-ghost">
                清空选择
              </button>
            )}
          </div>
        </div>

        {/* 右：视频预览 */}
        <div className="paper-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 opacity-30">
            <Postmark size="md" rotate={14}>
              <span className="text-[10px] leading-tight text-center">
                回忆
                <br />
                短片
              </span>
            </Postmark>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Clapperboard className="text-ochre-600" size={26} />
            <h3 className="font-display text-2xl text-ink-800">视频预览</h3>
          </div>

          {/* 模拟播放器 */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-ink-900 shadow-warm-lg">
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-paper-50/70 gap-4">
                <Film size={48} className="opacity-60" />
                <p className="font-serif text-lg">挑选素材后，视频会在这里生成</p>
                <p className="font-serif text-sm text-paper-50/40 max-w-xs text-center">
                  从左边选择几张照片和几段故事，小光会为您制作一段温馨的回忆短片
                </p>
              </div>
            )}

            {phase === "generating" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-paper-50 gap-5 px-6">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-paper-50/20" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-gold-500 border-t-transparent animate-spin"
                    style={{ animationDuration: "1.2s" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center font-latin text-2xl">
                    {progress}%
                  </div>
                </div>
                <p className="font-serif text-lg text-center">{stageText}</p>
                {/* 四阶段指示器 */}
                <div className="flex items-center gap-2 mt-1">
                  {GENERATE_STAGES.map((stage, idx) => {
                    const StageIcon = stage.icon;
                    const isActive = idx === currentStageIdx;
                    const isDone = idx < currentStageIdx;
                    return (
                      <div key={stage.label} className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-serif transition-all duration-500",
                            isActive
                              ? "bg-gold-500/30 text-gold-300 scale-110"
                              : isDone
                                ? "bg-sage-600/20 text-sage-300"
                                : "bg-paper-50/10 text-paper-50/30",
                          )}
                        >
                          {isDone ? (
                            <Check size={12} strokeWidth={3} />
                          ) : (
                            <StageIcon size={12} />
                          )}
                          <span>{stage.label}</span>
                        </div>
                        {idx < GENERATE_STAGES.length - 1 && (
                          <ArrowRight size={12} className={cn(
                            "transition-colors duration-500",
                            isDone ? "text-sage-300" : "text-paper-50/20",
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="w-full max-w-xs h-2 rounded-full bg-paper-50/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold-400 to-ochre-500 transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "done" && (
              <>
                {/* 背景：轮播照片 */}
                <div className="absolute inset-0">
                  {selectedPhotos.length > 0 ? (
                    selectedPhotos.map((c, i) => {
                      const photo = photos.find((p) => p.id === c.refId);
                      if (!photo) return null;
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "absolute inset-0 transition-opacity duration-1000",
                            i === subIdx % Math.max(selectedPhotos.length, 1)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        >
                          <img
                            src={photo.url}
                            alt={c.title}
                            className="w-full h-full object-cover filter-vintage-strong"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-ink-900/40" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-ochre-700 to-ink-900" />
                  )}
                </div>

                {/* 胶片划痕 */}
                <div className="absolute inset-0 grain-overlay pointer-events-none" />

                {/* 顶部胶片标识 */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-paper-50/80 text-xs font-serif">
                  <span className="inline-flex items-center gap-1.5 bg-ink-900/50 px-2.5 py-1 rounded-full">
                    <Film size={12} />
                    时光信箱 · 家庭短片
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-ink-900/50 px-2.5 py-1 rounded-full">
                    <Music size={12} />
                    配乐：温暖的弦乐
                  </span>
                </div>

                {/* 字幕（淡入淡出过渡） */}
                <div className="absolute bottom-16 left-0 right-0 px-8 text-center">
                  <p
                    key={subIdx}
                    className="font-display text-2xl md:text-3xl text-paper-50 text-shadow-warm leading-relaxed text-balance animate-subtitle-fade"
                  >
                    {VIDEO_SUBTITLES[subIdx]}
                  </p>
                </div>

                {/* 播放完成遮罩 */}
                {finished && (
                  <div className="absolute inset-0 bg-ink-900/60 flex flex-col items-center justify-center gap-5 animate-fade-in z-10">
                    <p className="font-display text-2xl text-paper-50 text-shadow-warm">
                      播放完毕
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={replay}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-paper-50 text-ink-900 font-serif font-semibold text-base shadow-warm hover:scale-105 transition-transform"
                      >
                        <Redo2 size={18} />
                        重播
                      </button>
                      <button
                        onClick={reset}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-ochre-500 text-paper-50 font-serif font-semibold text-base shadow-warm hover:scale-105 transition-transform"
                      >
                        <Sparkles size={18} />
                        再做一段
                      </button>
                    </div>
                  </div>
                )}

                {/* 控制条 */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-ink-900/90 to-transparent flex items-center gap-3">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="w-10 h-10 rounded-full bg-paper-50 text-ink-900 flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <div className="flex-1 h-1.5 rounded-full bg-paper-50/20 overflow-hidden">
                    <div
                      className="h-full bg-gold-500 transition-all duration-100"
                      style={{
                        width: `${((subIdx + 1) / VIDEO_SUBTITLES.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-paper-50/80 font-latin">
                    {String(subIdx + 1).padStart(2, "0")} / {String(VIDEO_SUBTITLES.length).padStart(2, "0")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 操作行 */}
          {phase === "done" && (
            <div className="mt-5 flex items-center gap-3 flex-wrap animate-fade-up">
              <button onClick={replay} className="btn-ghost">
                <Redo2 size={18} />
                重播
              </button>
              <button onClick={reset} className="btn-ghost">
                <RotateCcw size={18} />
                再做一段
              </button>
              <p className="text-base text-ink-700/70 font-serif ml-auto">
                共选用 {selectedPhotos.length} 张照片 · {selectedStories.length} 段故事
              </p>
            </div>
          )}

          {/* 素材清单 */}
          {clips.length > 0 && phase !== "generating" && (
            <div className="mt-5 pt-5 border-t border-ochre-500/15">
              <p className="text-sm text-ink-700/70 font-serif mb-2">本次素材</p>
              <div className="flex flex-wrap gap-2">
                {clips.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full bg-paper-200 text-ink-700/80 font-serif"
                  >
                    {c.type === "photo" ? <ImageIcon size={12} /> : <BookOpen size={12} />}
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
