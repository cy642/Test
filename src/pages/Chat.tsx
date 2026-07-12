import { useEffect, useRef, useState } from "react";
import {
  Send,
  Bookmark,
  Eraser,
  Lightbulb,
  Heart,
  Frown,
  Smile,
  Wind,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Layout from "@/components/Layout";
import Mascot from "@/components/Mascot";
import TypingDots from "@/components/TypingDots";
import SectionTitle from "@/components/SectionTitle";
import { useStore } from "@/store/useStore";
import {
  generateChatReply,
  streamText,
  SUGGESTED_TOPICS,
  type Emotion,
} from "@/lib/ai";
import { uid } from "@/data/seed";
import type { ChatMessage, LifeStage } from "@/types";
import { cn } from "@/lib/utils";

const emotionMeta: Record<Emotion, { icon: typeof Heart; label: string; color: string }> = {
  happy: { icon: Smile, label: "开心", color: "text-gold-600" },
  sad: { icon: Frown, label: "心疼", color: "text-sage-600" },
  nostalgic: { icon: Heart, label: "怀念", color: "text-ochre-600" },
  neutral: { icon: Wind, label: "倾听", color: "text-ink-700" },
};

const STAGES: LifeStage[] = ["童年", "求学", "工作", "家庭", "旅行", "晚年"];

// AI 气泡情绪装饰
const emotionDecor: Record<Emotion, { icon: typeof Heart; text?: string }> = {
  happy: { icon: Sparkles, text: undefined },
  nostalgic: { icon: Heart, text: undefined },
  sad: { icon: Frown, text: "抱抱您，我在听" },
  neutral: { icon: Wind, text: undefined },
};

export default function Chat() {
  const chat = useStore((s) => s.chat);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChat = useStore((s) => s.clearChat);
  const saveChatAsStory = useStore((s) => s.saveChatAsStory);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [saveTarget, setSaveTarget] = useState<string | null>(null);
  const [savedAnim, setSavedAnim] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isListening = thinking || streaming !== null;

  // 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat, streaming, thinking]);

  // 卸载时取消流式
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || thinking || streaming) return;

    const userMsg: ChatMessage = {
      id: uid("chat"),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput("");
    setThinking(true);

    // 模拟思考延迟
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
    setThinking(false);

    const reply = generateChatReply(content);
    const aiId = uid("chat");
    setStreaming("");

    abortRef.current = new AbortController();
    await streamText(
      reply.content,
      {
        onChunk: (partial) => setStreaming(partial),
        onDone: (full) => {
          const aiMsg: ChatMessage = {
            id: aiId,
            role: "ai",
            content: full,
            emotion: reply.emotion,
            timestamp: new Date().toISOString(),
          };
          addChatMessage(aiMsg);
          setStreaming(null);
        },
        signal: abortRef.current.signal,
      },
      { speed: 32, jitter: 22 },
    );

    // 如果有追问，再发一条小气泡提示
    if (reply.followUp) {
      await new Promise((r) => setTimeout(r, 500));
      setThinking(true);
      await new Promise((r) => setTimeout(r, 700));
      setThinking(false);
      abortRef.current = new AbortController();
      await streamText(
        reply.followUp,
        {
          onChunk: (partial) => setStreaming(partial),
          onDone: (full) => {
            addChatMessage({
              id: uid("chat"),
              role: "ai",
              content: full,
              emotion: reply.emotion,
              timestamp: new Date().toISOString(),
            });
            setStreaming(null);
          },
          signal: abortRef.current.signal,
        },
        { speed: 32, jitter: 22 },
      );
    }
  }

  function handleSave(msgId: string, stage: LifeStage) {
    saveChatAsStory(msgId, stage);
    setSaveTarget(null);
    setSavedAnim(msgId);
    setTimeout(() => setSavedAnim(null), 1800);
  }

  return (
    <Layout>
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        {/* 左：聊天主区 */}
        <div className="paper-card overflow-hidden flex flex-col h-[78vh] min-h-[560px]">
          {/* 头部 */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-ochre-500/15 bg-paper-50/50">
            <Mascot size={52} talking={isListening} />
            <div className="flex-1">
              <h2 className="font-display text-2xl text-ink-800">时光信使 · 小光</h2>
              <div className="relative h-5 overflow-hidden">
                <p
                  className={cn(
                    "absolute inset-x-0 text-sm transition-all duration-500",
                    isListening
                      ? "translate-y-0 opacity-100 text-ochre-600"
                      : "-translate-y-5 opacity-0",
                  )}
                >
                  正在听您说…
                </p>
                <p
                  className={cn(
                    "absolute inset-x-0 text-sm transition-all duration-500 text-ink-700/70",
                    isListening
                      ? "translate-y-5 opacity-0"
                      : "translate-y-0 opacity-100",
                  )}
                >
                  在线 · 随时陪您聊
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="btn-ghost text-base !py-2 !px-4"
              title="清空对话"
            >
              <Eraser size={18} />
              重新开始
            </button>
          </div>

          {/* 消息流 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-6 space-y-5"
          >
            {chat.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSave={() => setSaveTarget(msg.id)}
                saveStagePickerOpen={saveTarget === msg.id}
                onPickStage={(stage) => handleSave(msg.id, stage)}
                onClosePicker={() => setSaveTarget(null)}
                showSavedAnim={savedAnim === msg.id}
              />
            ))}

            {/* 思考中 */}
            {thinking && (
              <div className="flex items-end gap-3">
                <Mascot size={40} />
                <div className="paper-card !shadow-warm-inset px-4 py-3 rounded-3xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* 流式输出中 */}
            {streaming !== null && (
              <div className="flex items-end gap-3">
                <Mascot size={40} talking />
                <div className="paper-card !shadow-warm-inset px-4 py-3 rounded-3xl rounded-bl-sm max-w-[80%]">
                  <p className="font-serif text-lg text-ink-800 leading-relaxed whitespace-pre-wrap">
                    {streaming}
                    <span className="inline-block w-1 h-5 ml-0.5 bg-ochre-500/70 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="border-t border-ochre-500/15 bg-paper-50/50 px-4 md:px-6 py-4">
            {/* 小光正在听状态条 */}
            {isListening && (
              <div className="flex items-center gap-2 mb-3 px-1 animate-fade-up">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ochre-500" />
                </span>
                <span className="text-sm text-ochre-600 font-serif">小光正在听…</span>
              </div>
            )}

            {/* 话题气泡：3个一组换行 */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="w-full flex items-center gap-1 text-sm text-ink-700/70 mb-0.5">
                <Lightbulb size={16} className="text-gold-500" />
                试试：
              </span>
              {SUGGESTED_TOPICS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => send(t)}
                  disabled={isListening}
                  className="text-base px-3 py-1.5 rounded-full bg-gold-500/15 text-ochre-600 hover:bg-gold-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif"
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="慢慢说，小光在听…（按 Enter 发送）"
                rows={2}
                className="input-warm resize-none flex-1 !text-lg leading-relaxed"
                disabled={isListening}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isListening}
                className="btn-primary !px-5 self-stretch disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={22} />
                <span className="hidden md:inline">寄出</span>
              </button>
            </div>
          </div>
        </div>

        {/* 右：使用提示 - 移动端隐藏 */}
        <aside className="hidden lg:block space-y-5">
          <SectionTitle
            eyebrow="陪聊小贴士"
            title="怎么和小光聊天？"
          />
          <div className="paper-card p-5 space-y-4 text-base text-ink-700/85 font-serif leading-relaxed">
            <p>
              <span className="text-ochre-600 font-semibold">①</span> 想到什么说什么，
              不用组织语言，小光听得懂。
            </p>
            <p>
              <span className="text-ochre-600 font-semibold">②</span> 觉得哪句话讲得好，
              点句子下面的<span className="text-ochre-600">「收藏成故事」</span>，
              就会自动归入您的家庭档案。
            </p>
            <p>
              <span className="text-ochre-600 font-semibold">③</span> 不知道从哪讲起？
              点底部的<span className="text-gold-600">话题气泡</span>就好。
            </p>
          </div>

          <div className="paper-card p-5 bg-gradient-to-br from-sage-500/10 to-gold-500/10">
            <span className="eyebrow mb-3 text-sage-600">
              <Heart size={14} />
              情绪小光也懂
            </span>
            <div className="grid grid-cols-2 gap-2 text-sm font-serif">
              {Object.entries(emotionMeta).map(([k, m]) => {
                const Icon = m.icon;
                return (
                  <div key={k} className="flex items-center gap-2">
                    <Icon size={18} className={m.color} />
                    <span className="text-ink-700/80">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-ink-700/70 leading-relaxed">
              小光会根据您说的话感受您的心情，给您最暖的回应。
            </p>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

// ============================================================
// 单条消息气泡
// ============================================================
interface MessageBubbleProps {
  msg: ChatMessage;
  onSave: () => void;
  saveStagePickerOpen: boolean;
  onPickStage: (stage: LifeStage) => void;
  onClosePicker: () => void;
  showSavedAnim: boolean;
}

function MessageBubble({
  msg,
  onSave,
  saveStagePickerOpen,
  onPickStage,
  onClosePicker,
  showSavedAnim,
}: MessageBubbleProps) {
  const isAi = msg.role === "ai";
  const emo = msg.emotion ? emotionMeta[msg.emotion] : null;
  const decor = msg.emotion ? emotionDecor[msg.emotion] : null;

  return (
    <div
      className={cn(
        "flex items-end gap-3 animate-fade-up",
        !isAi && "flex-row-reverse",
      )}
    >
      {isAi ? (
        <Mascot size={40} />
      ) : (
        <div className="w-10 h-10 rounded-full bg-sage-500 flex items-center justify-center text-paper-50 font-display shrink-0">
          我
        </div>
      )}
      <div className={cn("max-w-[78%]", !isAi && "flex flex-col items-end")}>
        <div
          className={cn(
            "relative px-5 py-3.5 rounded-3xl shadow-warm-inset font-serif text-lg leading-relaxed whitespace-pre-wrap",
            isAi
              ? "bg-paper-50 text-ink-800 rounded-bl-sm border border-ochre-500/10"
              : "bg-gradient-to-br from-gold-400 to-ochre-500 text-paper-50 rounded-br-sm",
            msg.savedAsStory && !isAi && "ring-2 ring-sage-500/60",
          )}
        >
          {/* AI 气泡情绪装饰 */}
          {isAi && decor && (
            <span
              className={cn(
                "absolute -top-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full text-sm",
                msg.emotion === "happy" && "bg-gold-500/20 text-gold-600",
                msg.emotion === "nostalgic" && "bg-ochre-500/20 text-ochre-600",
                msg.emotion === "sad" && "bg-sage-500/20 text-sage-600",
                msg.emotion === "neutral" && "bg-ink-500/10 text-ink-700",
              )}
            >
              <decor.icon size={14} />
            </span>
          )}
          {msg.content}
          {/* 难过情绪安慰语 */}
          {isAi && msg.emotion === "sad" && decor?.text && (
            <span className="block mt-2 text-sm text-sage-600/80 italic">
              {decor.text}
            </span>
          )}
        </div>

        {/* 元信息行 */}
        <div
          className={cn(
            "mt-1.5 flex items-center gap-2 text-xs text-ink-700/60 px-2",
            !isAi && "flex-row-reverse",
          )}
        >
          <span>{new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
          {isAi && emo && (
            <span className={cn("inline-flex items-center gap-1", emo.color)}>
              <emo.icon size={14} />
              {emo.label}
            </span>
          )}
          {!isAi && !msg.savedAsStory && (
            <button
              onClick={onSave}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ochre-500/10 text-ochre-700 hover:bg-ochre-500/20 transition-colors font-medium"
              title="把这段话收藏成故事"
            >
              <Bookmark size={13} />
              收藏成故事
            </button>
          )}
          {msg.savedAsStory && (
            <span
              className={cn(
                "inline-flex items-center gap-1 transition-all duration-300",
                showSavedAnim
                  ? "text-green-600 scale-110"
                  : "text-sage-600",
              )}
            >
              {showSavedAnim ? (
                <CheckCircle2 size={14} className="animate-bounce" />
              ) : (
                <Bookmark size={14} />
              )}
              {showSavedAnim ? "已收藏" : "已收入档案"}
            </span>
          )}
        </div>

        {/* 阶段选择弹层 */}
        {saveStagePickerOpen && (
          <div className="mt-2 paper-card p-3 max-w-sm animate-fade-up">
            <p className="text-sm text-ink-700/80 mb-2 font-serif">
              这段话归到人生哪一段？
            </p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => onPickStage(s)}
                  className="text-base px-3 py-1.5 rounded-full bg-paper-200 hover:bg-ochre-500 hover:text-paper-50 transition-colors font-serif"
                >
                  {s}
                </button>
              ))}
              <button
                onClick={onClosePicker}
                className="text-base px-3 py-1.5 rounded-full text-ink-700/60 hover:text-ink-800 font-serif ml-auto"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
