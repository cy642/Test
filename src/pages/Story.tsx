import { useRef, useState } from "react";
import {
  Mic,
  Square,
  Sparkles,
  Save,
  RefreshCw,
  BookOpen,
  Quote,
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
  type StructuredStory,
} from "@/lib/ai";
import type { LifeStage } from "@/types";
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

export default function Story() {
  const addStory = useStore((s) => s.addStory);

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [phase, setPhase] = useState<"idle" | "thinking" | "streaming" | "done">(
    "idle",
  );
  const [streamedText, setStreamedText] = useState("");
  const [result, setResult] = useState<StructuredStory | null>(null);
  const [saved, setSaved] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 模拟录音
  function toggleRecord() {
    if (recording) {
      setRecording(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      // 把"录音"自动转成示意文字
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

    // 思考 2~3 秒
    await new Promise((r) => setTimeout(r, 2200));

    const structured = structureStory(text);
    setResult(structured);
    setPhase("streaming");

    abortRef.current = new AbortController();
    await streamText(
      formatStoryForStream(structured),
      {
        onChunk: (partial) => setStreamedText(partial),
        onDone: () => setPhase("done"),
        signal: abortRef.current.signal,
      },
      { speed: 22, jitter: 14 },
    );
  }

  function reset() {
    abortRef.current?.abort();
    setText("");
    setResult(null);
    setStreamedText("");
    setPhase("idle");
    setSaved(false);
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

  return (
    <Layout>
      <SectionTitle
        eyebrow="讲故事 · AI 整理"
        title="您来讲，小光来整理"
        subtitle="慢慢说一段往事，不用管排版。小光会帮您拟好标题、分好段落、配上关键词，再轻轻放进家庭档案。"
      />

      <div className="mt-10 grid lg:grid-cols-[1.1fr_1fr] gap-8">
        {/* 左：输入区 */}
        <div className="paper-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-2xl text-ink-800">您的故事</h3>
            <button
              onClick={() => setText(SAMPLE_PROMPT)}
              className="text-base text-ochre-600 hover:text-ochre-700 inline-flex items-center gap-1 font-serif"
            >
              <Sparkles size={16} />
              看个例子
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
            {/* 录音按钮 */}
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
                  <span className="absolute inset-0 rounded-full border-2 border-ochre-500 animate-pulse-ring" />
                )}
                {recording ? <Square size={22} /> : <Mic size={26} />}
              </button>
              <div>
                {recording ? (
                  <div className="flex items-center gap-3">
                    {/* 声波 */}
                    <div className="flex items-end gap-1 h-6">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-1 bg-ochre-500 rounded-full"
                          style={{
                            height: "100%",
                            transformOrigin: "bottom",
                            animation: "wave 0.8s ease-in-out infinite",
                            animationDelay: `${i * 0.1}s`,
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
              小光会从这些细节里帮您找到故事的"魂"。
            </p>
          </div>
        </div>

        {/* 右：AI 整理结果 */}
        <div className="paper-card p-6 md:p-8 relative overflow-hidden min-h-[480px]">
          {/* 装饰邮戳 */}
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

          {/* idle */}
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

          {/* thinking */}
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
              <div className="flex items-center gap-2 text-ink-700/60">
                <TypingDots />
                <span className="text-sm">寻找最动人的细节</span>
              </div>
            </div>
          )}

          {/* streaming / done */}
          {(phase === "streaming" || phase === "done") && result && (
            <div className="space-y-4">
              {phase === "streaming" ? (
                // 流式输出原始文本
                <pre className="font-serif text-lg text-ink-800 leading-relaxed whitespace-pre-wrap font-[inherit]">
                  {streamedText}
                  <span className="inline-block w-1 h-5 ml-0.5 bg-ochre-500/70 animate-pulse align-middle" />
                </pre>
              ) : (
                // 完成后用结构化卡片展示
                <StoryResultCard result={result} saved={saved} onSave={save} onReset={reset} />
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
}: {
  result: StructuredStory;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="animate-fade-up space-y-5">
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
              className="font-serif text-lg text-ink-800 leading-relaxed first-letter:font-display first-letter:text-5xl first-letter:text-ochre-600 first-letter:mr-2 first-letter:float-left first-letter:leading-none"
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-ochre-500/15 flex items-center gap-3 flex-wrap">
        {saved ? (
          <span className="inline-flex items-center gap-2 text-sage-600 font-serif text-lg">
            <Save size={20} />
            已收入家庭档案，可在时间轴查看
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
    </div>
  );
}
