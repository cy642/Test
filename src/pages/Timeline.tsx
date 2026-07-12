import { useMemo, useState } from "react";
import {
  Clock,
  MapPin,
  Heart,
  MessageCircle,
  Send,
  X,
  Quote,
} from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import Postmark from "@/components/Postmark";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import type { LifeStage, TimelineNode } from "@/types";

const STAGE_ORDER: LifeStage[] = ["童年", "求学", "工作", "家庭", "旅行", "晚年"];

const STAGE_META: Record<LifeStage, { color: string; emoji: string; desc: string }> = {
  童年: { color: "from-gold-400 to-gold-600", emoji: "🌱", desc: "无忧无虑的最早时光" },
  求学: { color: "from-sage-400 to-sage-600", emoji: "📖", desc: "书本里写满远方" },
  工作: { color: "from-ochre-400 to-ochre-600", emoji: "✏️", desc: "用一生去做一件事" },
  家庭: { color: "from-ochre-500 to-ochre-700", emoji: "🏡", desc: "柴米油盐里的爱" },
  旅行: { color: "from-sage-500 to-sage-600", emoji: "🚂", desc: "路上看见的世界" },
  晚年: { color: "from-paper-300 to-paper-200", emoji: "🌿", desc: "慢慢走，慢慢看" },
};

export default function Timeline() {
  const timeline = useStore((s) => s.timeline);
  const stories = useStore((s) => s.stories);
  const photos = useStore((s) => s.photos);
  const addComment = useStore((s) => s.addComment);

  const [activeNode, setActiveNode] = useState<TimelineNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<LifeStage | "全部">("全部");

  const grouped = useMemo(() => {
    const filtered =
      activeFilter === "全部"
        ? timeline
        : timeline.filter((n) => n.stage === activeFilter);
    const map = new Map<LifeStage, TimelineNode[]>();
    STAGE_ORDER.forEach((s) => map.set(s, []));
    filtered.forEach((n) => {
      const arr = map.get(n.stage) ?? [];
      arr.push(n);
      map.set(n.stage, arr);
    });
    return STAGE_ORDER.map((stage) => ({
      stage,
      nodes: (map.get(stage) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)),
    })).filter((g) => g.nodes.length > 0);
  }, [timeline, activeFilter]);

  // 当前活动节点保持同步
  const liveActive = activeNode
    ? timeline.find((n) => n.id === activeNode.id) ?? null
    : null;

  return (
    <Layout>
      <SectionTitle
        eyebrow="家庭记忆档案"
        title="您一生的时光长河"
        subtitle="这里按人生阶段排列着您已记下的每一个重要节点。点开任何一节，都能看见当时的故事、照片和家人的留言。"
      />

      {/* 阶段筛选 */}
      <div className="mt-8 flex items-center gap-2 flex-wrap">
        <span className="text-base text-ink-700/70 font-serif mr-1 inline-flex items-center gap-1">
          <Clock size={16} />
          阶段：
        </span>
        {(["全部", ...STAGE_ORDER] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            className={cn(
              "px-4 py-2 rounded-full font-serif text-base transition-all",
              activeFilter === s
                ? "bg-ochre-500 text-paper-50 shadow-warm"
                : "bg-paper-200/70 text-ink-800 hover:bg-paper-300/70",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 时间轴主体 */}
      <div className="mt-10 relative">
        {/* 中央竖线 */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-gold-500 via-ochre-500 to-sage-500 rounded-full -translate-x-1/2 opacity-30" />

        {grouped.length === 0 && (
          <div className="paper-card p-10 text-center">
            <p className="font-display text-2xl text-ink-800">
              这一阶段还没有记录
            </p>
            <p className="mt-2 text-ink-700/70 font-serif">
              去「讲故事」或「贴老照片」添加一段回忆吧。
            </p>
          </div>
        )}

        <div className="space-y-16">
          {grouped.map((group) => {
            const meta = STAGE_META[group.stage];
            return (
              <section key={group.stage}>
                {/* 阶段标题 */}
                <div className="relative mb-8 flex items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-2xl shadow-warm z-10",
                      meta.color,
                    )}
                  >
                    {meta.emoji}
                  </div>
                  <div>
                    <h3 className="font-display text-3xl text-ink-800">
                      {group.stage}
                    </h3>
                    <p className="text-base text-ink-700/70 font-serif">
                      {meta.desc} · 共 {group.nodes.length} 个节点
                    </p>
                  </div>
                </div>

                {/* 节点列表 */}
                <div className="space-y-6 pl-4 md:pl-0">
                  {group.nodes.map((node, i) => {
                    const story = stories.find((s) => s.id === node.storyId);
                    const photo = photos.find((p) => p.id === node.photoId);
                    const left = i % 2 === 0;
                    return (
                      <div
                        key={node.id}
                        className={cn(
                          "relative grid md:grid-cols-2 gap-4 md:gap-12 items-start",
                        )}
                      >
                        {/* 节点圆点 */}
                        <div className="absolute left-6 md:left-1/2 top-6 w-5 h-5 -translate-x-1/2 rounded-full bg-ochre-500 border-4 border-paper-100 z-10 shadow-warm" />

                        {/* 卡片 */}
                        <button
                          onClick={() => setActiveNode(node)}
                          className={cn(
                            "paper-card p-5 text-left hover:shadow-warm-lg hover:-translate-y-0.5 transition-all group",
                            left ? "md:col-start-1" : "md:col-start-2",
                          )}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-latin text-2xl text-ochre-600">
                              {node.date}
                            </span>
                            <Postmark
                              size="sm"
                              rotate={8}
                              className="ml-auto !w-12 !h-12 !border-ochre-500/40"
                            >
                              <span className="text-[8px] text-center leading-tight">
                                {node.stage}
                              </span>
                            </Postmark>
                          </div>
                          <h4 className="font-display text-xl md:text-2xl text-ink-800 group-hover:text-ochre-600 transition-colors">
                            {node.title}
                          </h4>
                          {story && (
                            <p className="mt-2 text-base text-ink-700/80 font-serif line-clamp-2 leading-relaxed">
                              {story.content}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-3 text-sm text-ink-700/60">
                            {photo && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={14} />
                                含照片
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle size={14} />
                              {node.comments.length} 条留言
                            </span>
                            {photo && (
                              <img
                                src={photo.url}
                                alt={node.title}
                                className="ml-auto w-14 h-14 rounded-lg object-cover filter-vintage shadow-warm"
                              />
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* 节点详情弹层 */}
      {liveActive && (
        <NodeDetailModal
          node={liveActive}
          story={stories.find((s) => s.id === liveActive.storyId) ?? null}
          photo={photos.find((p) => p.id === liveActive.photoId) ?? null}
          onClose={() => setActiveNode(null)}
          onComment={(author, content) =>
            addComment(liveActive.id, { author, content })
          }
        />
      )}
    </Layout>
  );
}

// ============================================================
// 节点详情弹层
// ============================================================
interface NodeDetailModalProps {
  node: TimelineNode;
  story: ReturnType<typeof useStore.getState>["stories"][number] | null;
  photo: ReturnType<typeof useStore.getState>["photos"][number] | null;
  onClose: () => void;
  onComment: (author: string, content: string) => void;
}

function NodeDetailModal({
  node,
  story,
  photo,
  onClose,
  onComment,
}: NodeDetailModalProps) {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");

  function submit() {
    if (!author.trim() || !content.trim()) return;
    onComment(author.trim(), content.trim());
    setAuthor("");
    setContent("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="paper-card max-w-2xl w-full max-h-[88vh] overflow-y-auto scrollbar-thin p-6 md:p-8 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-5">
          <Postmark size="md" rotate={-10}>
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[10px]">{node.stage}</span>
              <span className="text-lg font-latin">{node.date}</span>
            </div>
          </Postmark>
          <div className="flex-1">
            <h3 className="font-display text-2xl md:text-3xl text-ink-800 leading-tight">
              {node.title}
            </h3>
            <p className="text-sm text-ink-700/60 font-serif mt-1">
              {new Date(story?.createdAt ?? Date.now()).toLocaleDateString("zh-CN")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-paper-200 flex items-center justify-center text-ink-700/70 hover:text-ink-800 transition-colors"
            aria-label="关闭"
          >
            <X size={22} />
          </button>
        </div>

        {/* 照片 */}
        {photo && (
          <div className="mb-5 flex justify-center">
            <figure className="bg-paper-50 p-3 pb-4 shadow-photo" style={{ transform: "rotate(-2deg)" }}>
              <img
                src={photo.url}
                alt={photo.era}
                className="w-full max-w-md object-cover filter-vintage"
              />
              <figcaption className="mt-2 text-center text-sm font-serif text-ink-700/70 italic">
                {photo.era}
              </figcaption>
            </figure>
          </div>
        )}

        {/* 故事 */}
        {story && (
          <div className="mb-6">
            <span className="eyebrow mb-2">
              <Quote size={14} />
              故事正文
            </span>
            <div className="mt-2 space-y-3">
              {story.content.split("\n\n").map((p, i) => (
                <p
                  key={i}
                  className="font-serif text-lg text-ink-800 leading-relaxed first-letter:font-display first-letter:text-4xl first-letter:text-ochre-600 first-letter:mr-2 first-letter:float-left first-letter:leading-none"
                >
                  {p}
                </p>
              ))}
            </div>
            {story.keywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {story.keywords.map((k) => (
                  <span
                    key={k}
                    className="text-sm px-3 py-1 rounded-full bg-sage-500/10 text-sage-600 font-serif"
                  >
                    #{k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 留言区 */}
        <div className="pt-5 border-t border-ochre-500/15">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-ochre-600" size={20} />
            <h4 className="font-display text-xl text-ink-800">
              家人留言 · {node.comments.length}
            </h4>
          </div>

          {node.comments.length > 0 ? (
            <ul className="space-y-3 mb-5">
              {node.comments.map((c) => (
                <li
                  key={c.id}
                  className="bg-paper-50/70 rounded-2xl p-4 border border-ochre-500/10"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-base text-ochre-600">
                      {c.author}
                    </span>
                    <span className="text-xs text-ink-700/60 font-serif">
                      {new Date(c.timestamp).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <p className="font-serif text-base text-ink-800 leading-relaxed">
                    {c.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-ink-700/60 font-serif mb-5">
              还没有留言，做第一个回应的人吧。
            </p>
          )}

          {/* 新留言 */}
          <div className="bg-paper-200/40 rounded-2xl p-4 space-y-3">
            <p className="text-sm text-ink-700/70 font-serif">
              以家人身份留下您的话：
            </p>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="您的称呼（如：女儿 · 小敏）"
              className="input-warm !py-2.5 !text-base"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="想对妈妈这段故事说点什么…"
              rows={3}
              className="input-warm resize-none !py-2.5 !text-base"
            />
            <button
              onClick={submit}
              disabled={!author.trim() || !content.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              寄出留言
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
