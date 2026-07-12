import { useRef, useState, useEffect } from "react";
import {
  Mic,
  Square,
  Sparkles,
  Save,
  RefreshCw,
  BookOpen,
  Quote,
  Check,
  Feather,
  FileText,
  ArrowRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import TypingDots from "@/components/TypingDots";
import Postmark from "@/components/Postmark";
import { useStore } from "@/store/useStore";
import {
  structureStory,
  formatStoryForStream,
  streamText,
  generateMemoryArticle,
  formatArticleForStream,
  type StructuredStory,
} from "@/lib/ai";
import type { LifeStage, MemoryArticle } from "@/types";
import { cn } from "@/lib/utils";

const SAMPLE_PROMPT =
  "我小时候住在乡下，外婆每年过年都要在灶台前打糍粑。木槌落在石臼里咚咚响，整个院子都是糯米的香气。外婆会把第一块糍粑蘸上红糖偷偷塞给我，笑着说这是咱们家的秘密。那时我只觉得甜，现在外婆已经走了二十年，可那口甜味还留在舌尖上。";

const STAGES: LifeStage[] = ["童年", "求学", "工作", "家庭", "旅行", "晚年"];

const STAGE_COLORS: Record<LifeStage, string> = {
  童年: "bg-gold-500/15 text-gold-600",
  求学: "bg-sage-500/15 text-sage-600",
  工作: "bg-ochre-500/15 text-ochre-600",
  家庭: "bg-ochre-500/15 text-ochre-700",
  旅行: "bg-sage-500/15 text-sage-600",
  晚年: "bg-paper-300 text-ink-700",
};

const THINKING_MESSAGES = [
  "正在阅读您的文字…",
  "寻找最动人的细节…",
  "为您拟一个好标题…",
];

const ARTICLE_THINKING_MESSAGES = [
  "正在感受这段故事的情绪…",
  "为您构思散文开头…",
  "润色文字，让它更有温度…",
  "写一句点题的感悟…",
];

const BAR_HEIGHTS = [14, 20, 10, 24, 16, 22, 12, 18, 26];

export default function Story() {
  const addStory = useStore((s) => s.addStory);
  const addMemoryArticle = useStore((s) => s.addMemoryArticle);

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [phase, setPhase] = useState<"idle" | "thinking" | "streaming" | "transitioning" | "done">(
    "idle",
  );
  const [streamedText, setStreamedText] = useState("");
  const [result, setResult] = useState<StructuredStory | null>(null);
  const [saved, setSaved] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);

  // 回忆文章相关状态
  const [articlePhase, setArticlePhase] = useState<"hidden" | "thinking" | "streaming" | "done">("hidden");
  const [articleStreamed, setArticleStreamed] = useState("");
  const [article, setArticle] = useState<MemoryArticle | null>(null);
  const [articleSaved, setArticleSaved] = useState(false);
  const [articleThinkingIndex, setArticleThinkingIndex] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const articleAbortRef = useRef<AbortController | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const articleThinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 故事整理思考阶段文字轮播
  useEffect(() => {
    if (phase === "thinking") {
      setThinkingIndex(0);
      thinkingTimerRef.current = setInterval(() => {
        setThinkingIndex((i) => (i + 1) % THINKING_MESSAGES.length);
      }, 1200);
    } else {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    }
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [phase]);

  // 文章生成思考阶段文字轮播
  useEffect(() => {
    if (articlePhase === "thinking") {
      setArticleThinkingIndex(0);
      articleThinkingTimerRef.current = setInterval(() => {
        setArticleThinkingIndex((i) => (i + 1) % ARTICLE_THINKING_MESSAGES.length);
      }, 1000);
    } else {
      if (articleThinkingTimerRef.current) clearInterval(articleThinkingTimerRef.current);
    }
    return () => {
      if (articleThinkingTimerRef.current) clearInterval(articleThinkingTimerRef.current);
    };
  }, [articlePhase]);

  // 流式→卡片过渡
  useEffect(() => {
    if (phase === "transitioning") {
      const t = setTimeout(() => setPhase("done"), 800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function toggleRecord() {
    if (recording) {
      setRecording(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (!text.trim()) {
        setText(SAMPLE_PROMPT);
      }
    } else {
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds((s) => s + 1);
      }, 1000);
    }
  }

  async function structure() {
    if (!text.trim() || phase !== "idle") return;
    setResult(null);
    setSaved(false);
    setPhase("thinking");
    setStreamedText("");
    // 重置文章状态
    setArticlePhase("hidden");
    setArticle(null);
    setArticleStreamed("");
    setArticleSaved(false);

    await new Promise((r) => setTimeout(r, 2200));

    const structured = structureStory(text);
    setResult(structured);
    setPhase("streaming");

    abortRef.current = new AbortController();
    await streamText(
      formatStoryForStream(structured),
      {
        onChunk: (partial) => setStreamedText(partial),
        onDone: () => setPhase("transitioning"),
        signal: abortRef.current.signal,
      },
      { speed: 22, jitter: 14 },
    );
  }

  function reset() {
    abortRef.current?.abort();
    articleAbortRef.current?.abort();
    setText("");
    setResult(null);
    setStreamedText("");
    setPhase("idle");
    setSaved(false);
    setArticlePhase("hidden");
    setArticle(null);
    setArticleStreamed("");
    setArticleSaved(false);
  }

  function save() {
    if (!result) return;
    addStory({
      title: result.title,
      content: result.content,
      keywords: result.keywords,
      stage: result.stage,
      source: "story",
    });
    setSaved(true);
  }

  // 生成回忆文章
  async function generateArticle() {
    if (!result || articlePhase !== "hidden") return;
    setArticlePhase("thinking");
    setArticleStreamed("");

    // 模拟思考
    await new Promise((r) => setTimeout(r, 2500));

    const articleResult = generateMemoryArticle(
      result.title,
      result.content,
      result.stage,
      result.keywords,
    );
    setArticle(articleResult);
    setArticlePhase("streaming");

    articleAbortRef.current = new AbortController();
    await streamText(
      formatArticleForStream(articleResult),
      {
        onChunk: (partial) => setArticleStreamed(partial),
        onDone: () => setArticlePhase("done"),
        signal: articleAbortRef.current.signal,
      },
      { speed: 24, jitter: 16 },
    );
  }

  function saveArticle() {
    if (!article) return;
    addMemoryArticle({
      storyId: "",
      title: article.title,
      opening: article.opening,
      body: article.body,
      reflection: article.reflection,
      motto: article.motto,
      stage: article.stage,
    });
    setArticleSaved(true);
  }

  return (
    <Layout>
      <SectionTitle
        eyebrow="讲故事 · AI 整理"
        title="您来讲，小光来整理"
        subtitle="慢慢说一段往事，不用管排版。小光会帮您拟好标题、分好段落、配上关键词，还能为您写一篇文学化的回忆文章。"
      />

      <div className="mt-10 grid lg:grid-cols-[1.1fr_1fr] gap-8">
        {/* 左：输入区 */}
        <div className="paper-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-2xl text-ink-800">您的故事</h3>
            <button
              onClick={() => setText(SAMPLE_PROMPT)}
              className="group text-base text-ochre-600 hover:text-ochre-700 inline-flex items-center gap-1 font-serif relative"
            >
              <Sparkles size={16} />
              <span className="relative">
                看个例子
                <span className="absolute left-0 bottom-0 w-full h-[2px] bg-ochre-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </span>
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="比如：我小时候住在乡下，外婆每年过年都要在灶台前打糍粑…"
            rows={10}
            className="input-warm resize-none !text-lg leading-relaxed font-serif"
            disabled={phase !== "idle"}
          />

          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleRecord}
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-warm",
                  recording
                    ? "bg-ochre-600 text-paper-50"
                    : "bg-gold-500 text-paper-50 hover:bg-gold-600",
                )}
                title={recording ? "停止录音" : "开始录音"}
              >
                {recording && (
                  <>
                    <span className="absolute inset-0 rounded-full border-2 border-ochre-500 animate-pulse-ring" />
                    <span className="absolute inset-0 rounded-full border-2 border-ochre-400/60 animate-ripple" style={{ animationDelay: "0.6s" }} />
                    <span className="absolute inset-0 rounded-full border border-ochre-400/40 animate-ripple" style={{ animationDelay: "1.2s" }} />
                  </>
                )}
                {recording ? <Square size={22} /> : <Mic size={26} />}
              </button>
              <div>
                {recording ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-end gap-1 h-7">
                      {BAR_HEIGHTS.map((h, i) => (
                        <span
                          key={i}
                          className="w-1 bg-ochre-500 rounded-full"
                          style={{
                            height: `${h}px`,
                            transformOrigin: "bottom",
                            animation: "wave 0.8s ease-in-out infinite",
                            animationDelay: `${i * 0.09}s`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="font-latin text-xl text-ochre-600">
                      {Math.floor(recSeconds / 60)}:
                      {(recSeconds % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <p className="text-base text-ink-700/70 font-serif">
                    按一下，对着话筒讲就好
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={structure}
              disabled={!text.trim() || phase !== "idle"}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={20} />
              请小光整理
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-ochre-500/15">
            <p className="text-base text-ink-700/70 font-serif leading-relaxed">
              <span className="text-ochre-600 font-semibold">提示：</span>
              您说的越细越好——人名、地名、年份、味道、声音。
              小光会从这些细节里帮您找到故事的"魂"，还能写成一篇文学化的回忆文章。
            </p>
          </div>
        </div>

        {/* 右：AI 整理结果 */}
        <div className="space-y-6">
          <div className="paper-card p-6 md:p-8 relative overflow-hidden min-h-[360px]">
            <div className="absolute -top-4 -right-4 opacity-30">
              <Postmark size="md" rotate={14}>
                <span className="text-[10px] leading-tight text-center">
                  AI
                  <br />
                  整理
                </span>
              </Postmark>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="text-ochre-600" size={26} />
              <h3 className="font-display text-2xl text-ink-800">小光的整理稿</h3>
            </div>

            {phase === "idle" && !result && (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="w-20 h-20 rounded-full bg-paper-200/70 flex items-center justify-center mb-4">
                  <Sparkles className="text-ochre-500/60" size={36} />
                </div>
                <p className="text-lg text-ink-700/70 font-serif">
                  整理稿会出现在这里。
                  <br />
                  您先讲一段，小光听一听。
                </p>
              </div>
            )}

            {phase === "thinking" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-gold-500/20 animate-pulse-ring" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-ochre-500 animate-float-soft" size={40} />
                  </div>
                </div>
                <p className="text-lg text-ink-700/80 font-serif">
                  小光正在读您的故事…
                </p>
                <div className="h-6 flex items-center gap-2 text-ink-700/60">
                  <TypingDots />
                  <span key={thinkingIndex} className="text-sm animate-fade-in">
                    {THINKING_MESSAGES[thinkingIndex]}
                  </span>
                </div>
              </div>
            )}

            {(phase === "streaming" || phase === "transitioning" || phase === "done") && result && (
              <div className="space-y-4">
                {(phase === "streaming" || phase === "transitioning") ? (
                  <pre className={cn(
                    "font-serif text-lg text-ink-800 leading-relaxed whitespace-pre-wrap font-[inherit] transition-all duration-700",
                    phase === "transitioning" && "opacity-0 translate-y-2",
                  )}>
                    {streamedText}
                    {phase === "streaming" && (
                      <span className="inline-block w-1 h-5 ml-0.5 bg-ochre-500/70 animate-pulse align-middle" />
                    )}
                  </pre>
                ) : null}
                {phase === "done" && (
                  <div className="animate-fade-up">
                    <StoryResultCard
                      result={result}
                      saved={saved}
                      onSave={save}
                      onReset={reset}
                      onGenerateArticle={generateArticle}
                      articlePhase={articlePhase}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 回忆文章区 */}
          {articlePhase !== "hidden" && (
            <div className="paper-card p-6 md:p-8 relative overflow-hidden animate-fade-up">
              <div className="absolute -top-4 -right-4 opacity-30">
                <Postmark size="md" rotate={-10}>
                  <span className="text-[10px] leading-tight text-center">
                    回忆
                    <br />
                    文章
                  </span>
                </Postmark>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Feather className="text-ochre-600" size={26} />
                <h3 className="font-display text-2xl text-ink-800">小光为您写的回忆文章</h3>
              </div>

              {articlePhase === "thinking" && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-gold-500/20 animate-pulse-ring" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Feather className="text-ochre-500 animate-float-soft" size={32} />
                    </div>
                  </div>
                  <p className="text-lg text-ink-700/80 font-serif">
                    小光正在把您的故事写成文章…
                  </p>
                  <div className="h-6 flex items-center gap-2 text-ink-700/60">
                    <TypingDots />
                    <span key={articleThinkingIndex} className="text-sm animate-fade-in">
                      {ARTICLE_THINKING_MESSAGES[articleThinkingIndex]}
                    </span>
                  </div>
                </div>
              )}

              {articlePhase === "streaming" && (
                <pre className="font-serif text-lg text-ink-800 leading-relaxed whitespace-pre-wrap font-[inherit]">
                  {articleStreamed}
                  <span className="inline-block w-1 h-5 ml-0.5 bg-ochre-500/70 animate-pulse align-middle" />
                </pre>
              )}

              {articlePhase === "done" && article && (
                <div className="animate-fade-up space-y-6">
                  {/* 文章标题 */}
                  <div>
                    <span className="eyebrow mb-2">
                      <Feather size={14} />
                      回忆文章
                    </span>
                    <h4 className="font-display text-3xl md:text-4xl text-ink-800 mt-2 leading-tight">
                      {article.title}
                    </h4>
                  </div>

                  {/* 开篇 */}
                  <div className="bg-gold-500/8 rounded-2xl p-5 border border-gold-500/15">
                    <span className="text-xs text-gold-600 tracking-widest font-serif uppercase">开篇 · 场景描写</span>
                    <p className="mt-2 font-serif text-lg text-ink-800 leading-relaxed italic">
                      {article.opening}
                    </p>
                  </div>

                  {/* 正文 */}
                  <div>
                    <span className="text-xs text-ochre-600 tracking-widest font-serif uppercase">正文 · 往事如昨</span>
                    <div className="mt-2 space-y-4">
                      {article.body.split("\n\n").map((p, i) => (
                        <p
                          key={i}
                          className={cn(
                            "font-serif text-lg text-ink-800 leading-relaxed",
                            i === 0 && "first-letter:font-display first-letter:text-5xl first-letter:text-ochre-600 first-letter:mr-2 first-letter:float-left first-letter:leading-none first-letter:font-bold",
                          )}
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* 感悟 */}
                  <div className="bg-sage-500/8 rounded-2xl p-5 border border-sage-500/15">
                    <span className="text-xs text-sage-600 tracking-widest font-serif uppercase">感悟 · 岁月留痕</span>
                    <p className="mt-2 font-serif text-lg text-ink-800 leading-relaxed">
                      {article.reflection}
                    </p>
                  </div>

                  {/* 点题 */}
                  {article.motto && (
                    <div className="text-center py-4">
                      <p className="font-display text-2xl text-ochre-600 leading-relaxed">
                        「{article.motto}」
                      </p>
                    </div>
                  )}

                  {/* 操作 */}
                  <div className="pt-5 border-t border-ochre-500/15 flex items-center gap-3 flex-wrap">
                    {articleSaved ? (
                      <span className="inline-flex items-center gap-2 text-sage-600 font-serif text-lg animate-fade-in-up">
                        <span className="w-6 h-6 rounded-full bg-sage-500/20 flex items-center justify-center">
                          <Check size={14} className="text-sage-600" strokeWidth={3} />
                        </span>
                        文章已保存
                      </span>
                    ) : (
                      <button onClick={saveArticle} className="btn-primary">
                        <Save size={20} />
                        保存这篇文章
                      </button>
                    )}
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

// ============================================================
// 整理结果卡片
// ============================================================
function StoryResultCard({
  result,
  saved,
  onSave,
  onReset,
  onGenerateArticle,
  articlePhase,
}: {
  result: StructuredStory;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
  onGenerateArticle: () => void;
  articlePhase: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <span className="eyebrow mb-2">
          <Quote size={14} />
          标题
        </span>
        <h4 className="font-display text-3xl text-ink-800 mt-1 leading-tight">
          {result.title}
        </h4>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            "text-base px-3 py-1 rounded-full font-serif",
            STAGE_COLORS[result.stage],
          )}
        >
          {result.stage}
        </span>
        {result.keywords.map((k) => (
          <span
            key={k}
            className="text-base px-3 py-1 rounded-full bg-paper-200 text-ink-700/80 font-serif"
          >
            #{k}
          </span>
        ))}
      </div>

      <div>
        <span className="eyebrow mb-2">
          <Quote size={14} />
          正文
        </span>
        <div className="mt-1 space-y-4">
          {result.content.split("\n\n").map((p, i) => (
            <p
              key={i}
              className={cn(
                "font-serif text-lg text-ink-800 leading-relaxed",
                i === 0 && "first-letter:font-display first-letter:text-6xl first-letter:text-ochre-600 first-letter:mr-3 first-letter:float-left first-letter:leading-none first-letter:font-bold",
              )}
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-ochre-500/15 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {saved ? (
            <span className="inline-flex items-center gap-2 text-sage-600 font-serif text-lg animate-fade-in-up">
              <span className="w-6 h-6 rounded-full bg-sage-500/20 flex items-center justify-center">
                <Check size={14} className="text-sage-600" strokeWidth={3} />
              </span>
              已收入家庭档案
            </span>
          ) : (
            <button onClick={onSave} className="btn-primary">
              <Save size={20} />
              收入家庭档案
            </button>
          )}
          <button onClick={onReset} className="btn-ghost">
            <RefreshCw size={18} />
            再讲一段
          </button>
        </div>

        {/* 生成回忆文章入口 */}
        {saved && articlePhase === "hidden" && (
          <div className="animate-fade-up">
            <button
              onClick={onGenerateArticle}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-gold-500/10 via-ochre-500/8 to-sage-500/10 border border-ochre-500/20 hover:border-ochre-500/40 hover:shadow-warm transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-ochre-500 flex items-center justify-center shadow-warm shrink-0">
                <Feather className="text-paper-50" size={22} />
              </div>
              <div className="text-left flex-1">
                <p className="font-display text-xl text-ink-800 group-hover:text-ochre-600 transition-colors">
                  生成回忆文章
                </p>
                <p className="text-sm text-ink-700/70 font-serif">
                  小光把您的故事改写成一篇文学散文，配上场景描写和感悟收尾
                </p>
              </div>
              <ArrowRight className="text-ochre-500 group-hover:translate-x-1 transition-transform shrink-0" size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
