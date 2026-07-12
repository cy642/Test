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
  ScrollText,
  Eye,
  Clock,
} from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import Postmark from "@/components/Postmark";
import TypingDots from "@/components/TypingDots";
import { useStore } from "@/store/useStore";
import {
  generateVideo,
  generateVideoScript,
  formatScriptForStream,
  generateSubtitlesFromScript,
  streamText,
  VIDEO_SUBTITLES,
} from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { VideoClip, VideoScript, ScriptScene } from "@/types";

const GENERATE_STAGES = [
  { icon: ImageIcon, label: "选照片" },
  { icon: BookOpen, label: "写旁白" },
  { icon: Music, label: "配音乐" },
  { icon: Film, label: "合成画面" },
];

const SCRIPT_THINKING_MESSAGES = [
  "正在梳理您的故事线…",
  "为每个场景构思画面…",
  "撰写旁白与音乐提示…",
  "编排节奏，计算时长…",
];

const SCENE_TYPE_META: Record<ScriptScene["type"], { label: string; color: string }> = {
  opening: { label: "开场", color: "bg-gold-500/15 text-gold-600" },
  photo: { label: "照片", color: "bg-sage-500/15 text-sage-600" },
  story: { label: "故事", color: "bg-ochre-500/15 text-ochre-600" },
  transition: { label: "过渡", color: "bg-paper-200 text-ink-700/70" },
  closing: { label: "结尾", color: "bg-ochre-500/15 text-ochre-700" },
};

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

  // 视频脚本相关状态
  const [scriptPhase, setScriptPhase] = useState<"hidden" | "thinking" | "streaming" | "done">("hidden");
  const [scriptStreamed, setScriptStreamed] = useState("");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [scriptThinkingIdx, setScriptThinkingIdx] = useState(0);
  const [activeSceneIdx, setActiveSceneIdx] = useState<number | null>(null);

  // 视频播放时使用脚本字幕（如果有）或默认字幕
  const currentSubtitles = script ? generateSubtitlesFromScript(script) : VIDEO_SUBTITLES;

  const abortRef = useRef<AbortController | null>(null);
  const scriptAbortRef = useRef<AbortController | null>(null);
  const subTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptThinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStageIdx = progress <= 25 ? 0 : progress <= 50 ? 1 : progress <= 75 ? 2 : 3;

  useEffect(() => () => {
    abortRef.current?.abort();
    scriptAbortRef.current?.abort();
    if (subTimerRef.current) clearInterval(subTimerRef.current);
    if (scriptThinkingTimerRef.current) clearInterval(scriptThinkingTimerRef.current);
  }, []);

  // 脚本思考文字轮播
  useEffect(() => {
    if (scriptPhase === "thinking") {
      setScriptThinkingIdx(0);
      scriptThinkingTimerRef.current = setInterval(() => {
        setScriptThinkingIdx((i) => (i + 1) % SCRIPT_THINKING_MESSAGES.length);
      }, 1000);
    } else {
      if (scriptThinkingTimerRef.current) clearInterval(scriptThinkingTimerRef.current);
    }
    return () => {
      if (scriptThinkingTimerRef.current) clearInterval(scriptThinkingTimerRef.current);
    };
  }, [scriptPhase]);

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
          const next = (prev + 1) % currentSubtitles.length;
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
  }, [phase, playing, currentSubtitles.length]);

  function replay() {
    setSubIdx(0);
    setPlaying(true);
    setFinished(false);
  }

  function reset() {
    abortRef.current?.abort();
    scriptAbortRef.current?.abort();
    setPhase("idle");
    setProgress(0);
    setPlaying(false);
    setSubIdx(0);
    setFinished(false);
    clearClips();
    setScriptPhase("hidden");
    setScript(null);
    setScriptStreamed("");
    setActiveSceneIdx(null);
  }

  // 生成视频脚本
  async function generateScript() {
    if (scriptPhase !== "hidden") return;
    setScriptPhase("thinking");
    setScriptStreamed("");

    const selectedPhotoClips = clips.filter((c) => c.type === "photo");
    const selectedStoryClips = clips.filter((c) => c.type === "story");

    const storyTitles = selectedStoryClips.map((c) => c.title);
    const storyContents = selectedStoryClips.map((c) => {
      const s = stories.find((st) => st.id === c.refId);
      return s?.content ?? c.subtitle;
    });
    const storyStages = selectedStoryClips.map((c) => {
      const s = stories.find((st) => st.id === c.refId);
      return s?.stage ?? "家庭";
    });
    const photoEras = selectedPhotoClips.map((c) => c.title);
    const photoMemories = selectedPhotoClips.map((c) => c.subtitle);

    await new Promise((r) => setTimeout(r, 2800));

    const scriptResult = generateVideoScript(storyTitles, storyContents, storyStages, photoEras, photoMemories);
    setScript(scriptResult);
    setScriptPhase("streaming");

    scriptAbortRef.current = new AbortController();
    await streamText(
      formatScriptForStream(scriptResult),
      {
        onChunk: (partial) => setScriptStreamed(partial),
        onDone: () => setScriptPhase("done"),
        signal: scriptAbortRef.current.signal,
      },
      { speed: 18, jitter: 12 },
    );
  }

  const selectedPhotos = clips.filter((c) => c.type === "photo");
  const selectedStories = clips.filter((c) => c.type === "story");

  return (
    <Layout>
      <SectionTitle
        eyebrow="AI 回忆视频"
        title="把这一段时光，剪成寄给家人的短片"
        subtitle="挑选几张照片、几段故事，小光会替您写好脚本、配上字幕和音乐，做成一段家庭回忆短片。"
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
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p) => {
                  const selected = clips.some((c) => c.refId === p.id);
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
                      <img src={p.url} alt={p.era} className="w-full h-full object-cover filter-vintage" />
                      <div className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        selected
                          ? "bg-gradient-to-t from-ink-900/60 to-transparent"
                          : "bg-ink-900/20 hover:bg-gradient-to-t hover:from-ink-900/60 hover:to-transparent",
                      )} />
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] text-paper-50 font-serif text-center">{p.era}</span>
                      {selected && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ochre-500 text-paper-50 flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
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
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300",
                        selected ? "bg-ochre-500 border-ochre-500 text-paper-50" : "border-ochre-500/30",
                      )}>
                        {selected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <div className={cn(
                          "font-display text-lg transition-colors duration-300 truncate",
                          selected ? "text-ink-800" : "text-ink-700/60",
                        )}>{s.title}</div>
                        <div className="text-sm text-ink-700/70 font-serif line-clamp-2 mt-0.5">{s.content}</div>
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
            {clips.length > 0 && phase !== "generating" && (
              <button onClick={clearClips} className="btn-ghost">
                清空选择
              </button>
            )}
          </div>
        </div>

        {/* 右：视频预览 + 脚本 */}
        <div className="space-y-6">
          <div className="paper-card p-6 md:p-8 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 opacity-30">
              <Postmark size="md" rotate={14}>
                <span className="text-[10px] leading-tight text-center">回忆<br />短片</span>
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
                    <div className="absolute inset-0 rounded-full border-4 border-gold-500 border-t-transparent animate-spin" style={{ animationDuration: "1.2s" }} />
                    <div className="absolute inset-0 flex items-center justify-center font-latin text-2xl">{progress}%</div>
                  </div>
                  <p className="font-serif text-lg text-center">{stageText}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {GENERATE_STAGES.map((stage, idx) => {
                      const StageIcon = stage.icon;
                      const isActive = idx === currentStageIdx;
                      const isDone = idx < currentStageIdx;
                      return (
                        <div key={stage.label} className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-serif transition-all duration-500",
                            isActive ? "bg-gold-500/30 text-gold-300 scale-110"
                              : isDone ? "bg-sage-600/20 text-sage-300"
                              : "bg-paper-50/10 text-paper-50/30",
                          )}>
                            {isDone ? <Check size={12} strokeWidth={3} /> : <StageIcon size={12} />}
                            <span>{stage.label}</span>
                          </div>
                          {idx < GENERATE_STAGES.length - 1 && (
                            <ArrowRight size={12} className={cn("transition-colors duration-500", isDone ? "text-sage-300" : "text-paper-50/20")} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="w-full max-w-xs h-2 rounded-full bg-paper-50/20 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-400 to-ochre-500 transition-all duration-150" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {phase === "done" && (
                <>
                  <div className="absolute inset-0">
                    {selectedPhotos.length > 0 ? (
                      selectedPhotos.map((c, i) => {
                        const photo = photos.find((p) => p.id === c.refId);
                        if (!photo) return null;
                        return (
                          <div key={c.id} className={cn(
                            "absolute inset-0 transition-opacity duration-1000",
                            i === subIdx % Math.max(selectedPhotos.length, 1) ? "opacity-100" : "opacity-0",
                          )}>
                            <img src={photo.url} alt={c.title} className="w-full h-full object-cover filter-vintage-strong" />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-ink-900/40" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-ochre-700 to-ink-900" />
                    )}
                  </div>
                  <div className="absolute inset-0 grain-overlay pointer-events-none" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-paper-50/80 text-xs font-serif">
                    <span className="inline-flex items-center gap-1.5 bg-ink-900/50 px-2.5 py-1 rounded-full">
                      <Film size={12} /> 时光信箱 · 家庭短片
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-ink-900/50 px-2.5 py-1 rounded-full">
                      <Music size={12} /> {script ? "配乐：根据脚本定制" : "配乐：温暖的弦乐"}
                    </span>
                  </div>
                  <div className="absolute bottom-16 left-0 right-0 px-8 text-center">
                    <p key={subIdx} className="font-display text-2xl md:text-3xl text-paper-50 text-shadow-warm leading-relaxed text-balance animate-subtitle-fade">
                      {currentSubtitles[subIdx]}
                    </p>
                  </div>
                  {finished && (
                    <div className="absolute inset-0 bg-ink-900/60 flex flex-col items-center justify-center gap-5 animate-fade-in z-10">
                      <p className="font-display text-2xl text-paper-50 text-shadow-warm">播放完毕</p>
                      <div className="flex items-center gap-4">
                        <button onClick={replay} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-paper-50 text-ink-900 font-serif font-semibold text-base shadow-warm hover:scale-105 transition-transform">
                          <Redo2 size={18} /> 重播
                        </button>
                        <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-ochre-500 text-paper-50 font-serif font-semibold text-base shadow-warm hover:scale-105 transition-transform">
                          <Sparkles size={18} /> 再做一段
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-ink-900/90 to-transparent flex items-center gap-3">
                    <button onClick={() => setPlaying((p) => !p)} className="w-10 h-10 rounded-full bg-paper-50 text-ink-900 flex items-center justify-center hover:scale-105 transition-transform">
                      {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </button>
                    <div className="flex-1 h-1.5 rounded-full bg-paper-50/20 overflow-hidden">
                      <div className="h-full bg-gold-500 transition-all duration-100" style={{ width: `${((subIdx + 1) / currentSubtitles.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-paper-50/80 font-latin">
                      {String(subIdx + 1).padStart(2, "0")} / {String(currentSubtitles.length).padStart(2, "0")}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* 操作行 */}
            {phase === "done" && (
              <div className="mt-5 flex items-center gap-3 flex-wrap animate-fade-up">
                <button onClick={replay} className="btn-ghost"><Redo2 size={18} /> 重播</button>
                <button onClick={reset} className="btn-ghost"><RotateCcw size={18} /> 再做一段</button>
                <p className="text-base text-ink-700/70 font-serif ml-auto">
                  共选用 {selectedPhotos.length} 张照片 · {selectedStories.length} 段故事
                </p>
              </div>
            )}
          </div>

          {/* 视频脚本区 */}
          {phase === "done" && scriptPhase === "hidden" && (
            <div className="animate-fade-up">
              <button
                onClick={generateScript}
                className="w-full flex items-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-sage-500/10 via-gold-500/8 to-ochre-500/10 border border-ochre-500/20 hover:border-ochre-500/40 hover:shadow-warm transition-all group paper-card"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-400 to-ochre-500 flex items-center justify-center shadow-warm shrink-0">
                  <ScrollText className="text-paper-50" size={22} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-display text-xl text-ink-800 group-hover:text-ochre-600 transition-colors">
                    生成视频脚本
                  </p>
                  <p className="text-sm text-ink-700/70 font-serif">
                    AI 自动为每个场景撰写旁白、画面描述和音乐提示，生成完整的分镜脚本
                  </p>
                </div>
                <ArrowRight className="text-ochre-500 group-hover:translate-x-1 transition-transform shrink-0" size={20} />
              </button>
            </div>
          )}

          {/* 脚本生成过程/结果 */}
          {scriptPhase !== "hidden" && (
            <div className="paper-card p-6 md:p-8 relative overflow-hidden animate-fade-up">
              <div className="absolute -top-4 -right-4 opacity-30">
                <Postmark size="md" rotate={-10}>
                  <span className="text-[10px] leading-tight text-center">视频<br />脚本</span>
                </Postmark>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <ScrollText className="text-ochre-600" size={26} />
                <h3 className="font-display text-2xl text-ink-800">AI 视频脚本</h3>
              </div>

              {scriptPhase === "thinking" && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-gold-500/20 animate-pulse-ring" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ScrollText className="text-ochre-500 animate-float-soft" size={32} />
                    </div>
                  </div>
                  <p className="text-lg text-ink-700/80 font-serif">
                    小光正在为您撰写视频脚本…
                  </p>
                  <div className="h-6 flex items-center gap-2 text-ink-700/60">
                    <TypingDots />
                    <span key={scriptThinkingIdx} className="text-sm animate-fade-in">
                      {SCRIPT_THINKING_MESSAGES[scriptThinkingIdx]}
                    </span>
                  </div>
                </div>
              )}

              {scriptPhase === "streaming" && (
                <pre className="font-serif text-base text-ink-800 leading-relaxed whitespace-pre-wrap font-[inherit] max-h-96 overflow-y-auto scrollbar-thin">
                  {scriptStreamed}
                  <span className="inline-block w-1 h-4 ml-0.5 bg-ochre-500/70 animate-pulse align-middle" />
                </pre>
              )}

              {scriptPhase === "done" && script && (
                <div className="animate-fade-up space-y-5">
                  {/* 脚本概览 */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="eyebrow mb-1">脚本标题</span>
                      <h4 className="font-display text-2xl text-ink-800 mt-1">{script.title}</h4>
                    </div>
                    <div className="ml-auto flex items-center gap-4 text-sm font-serif text-ink-700/70">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} />
                        总时长 {script.totalDuration}秒
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Film size={14} />
                        {script.scenes.length} 个场景
                      </span>
                    </div>
                  </div>

                  <div className="bg-gold-500/8 rounded-2xl p-4 border border-gold-500/15">
                    <span className="text-xs text-gold-600 tracking-widest font-serif">主题</span>
                    <p className="mt-1 font-serif text-lg text-ink-800">{script.theme}</p>
                  </div>

                  {/* 场景列表 */}
                  <div className="space-y-3">
                    <span className="eyebrow">
                      <Eye size={14} />
                      分镜场景
                    </span>
                    {script.scenes.map((scene) => {
                      const meta = SCENE_TYPE_META[scene.type];
                      const isActive = activeSceneIdx === scene.index;
                      return (
                        <button
                          key={scene.index}
                          onClick={() => setActiveSceneIdx(isActive ? null : scene.index)}
                          className={cn(
                            "w-full text-left p-4 rounded-2xl border transition-all duration-300",
                            isActive
                              ? "bg-ochre-500/8 border-ochre-500/30 shadow-warm"
                              : "bg-paper-50/60 border-ochre-500/10 hover:border-ochre-500/25",
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-serif", meta.color)}>
                              {meta.label}
                            </span>
                            <span className="font-latin text-sm text-ink-700/60">
                              场景 {scene.index + 1}
                            </span>
                            <span className="ml-auto text-xs text-ink-700/50 font-serif flex items-center gap-1">
                              <Clock size={12} /> {scene.duration}秒
                            </span>
                          </div>

                          {scene.narration && (
                            <p className={cn(
                              "font-serif text-base leading-relaxed transition-all",
                              isActive ? "text-ink-800" : "text-ink-700/80 line-clamp-1",
                            )}>
                              旁白：「{scene.narration}」
                            </p>
                          )}

                          {isActive && (
                            <div className="mt-3 space-y-2 animate-fade-in">
                              <p className="text-sm text-ink-700/70 font-serif">
                                <span className="text-ochre-600">画面：</span>{scene.visual}
                              </p>
                              {scene.music && (
                                <p className="text-sm text-ink-700/70 font-serif inline-flex items-center gap-1">
                                  <Music size={12} className="text-sage-600" />
                                  <span className="text-sage-600">音乐：</span>{scene.music}
                                </p>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
