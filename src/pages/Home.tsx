import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircleHeart,
  BookHeart,
  Image as ImageIcon,
  Clapperboard,
  Clock,
  ArrowRight,
  Sparkles,
  Mail,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import Postmark from "@/components/Postmark";
import Mascot from "@/components/Mascot";
import { useStore } from "@/store/useStore";

const FEATURES = [
  {
    to: "/chat",
    title: "陪您聊天",
    desc: "小光会主动问候、温柔追问，把您随口说的话都收好。",
    icon: MessageCircleHeart,
    accent: "from-gold-400 to-ochre-500",
    rotate: -1.5,
  },
  {
    to: "/story",
    title: "讲个故事",
    desc: "用文字或语音讲讲过去，AI 帮您整理成一篇完整人生故事。",
    icon: BookHeart,
    accent: "from-ochre-500 to-ochre-600",
    rotate: 1.2,
  },
  {
    to: "/photos",
    title: "贴张老照片",
    desc: "上传一张老照片，AI 看图说话，为您写下一段温暖的回忆。",
    icon: ImageIcon,
    accent: "from-sage-400 to-sage-600",
    rotate: -0.8,
  },
  {
    to: "/video",
    title: "生成回忆视频",
    desc: "把照片和故事拼成一段短片，配上字幕和音乐，寄给家人。",
    icon: Clapperboard,
    accent: "from-gold-500 to-ochre-600",
    rotate: 1.6,
  },
  {
    to: "/timeline",
    title: "家庭记忆档案",
    desc: "童年、求学、工作、家庭……一条时间轴，串起您的一生。",
    icon: Clock,
    accent: "from-sage-500 to-sage-600",
    rotate: -1.2,
  },
];

function todayGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，您还醒着呀";
  if (h < 11) return "早上好，今天阳光真好";
  if (h < 14) return "中午好，记得歇一歇";
  if (h < 18) return "下午好，喝杯热茶吧";
  return "晚上好，咱们慢慢聊";
}

/** 信纸上随日期变化的温馨短句 */
function letterLine(date: Date) {
  const lines = [
    "见字如面，展信舒颜",
    "纸短情长，不尽依依",
    "岁月温柔，一切安好",
    "思念如信，穿越时光",
    "每一封信，都是一颗心",
    "时光不老，我们不散",
    "把爱写进字里行间",
  ];
  // 用日期做确定性选取，同一天始终显示同一句
  return lines[date.getDate() % lines.length];
}

export default function Home() {
  const stories = useStore((s) => s.stories);
  const timeline = useStore((s) => s.timeline);
  const photos = useStore((s) => s.photos);

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  // 用日期做种子随机选取，同一天不会变化
  const memoryOfToday = useMemo(() => {
    if (stories.length === 0) return null;
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const idx = seed % stories.length;
    return stories[idx];
  }, [stories, today.getFullYear(), today.getMonth(), today.getDate()]);

  // 信封翻盖动画控制
  const [flapOpen, setFlapOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFlapOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout>
      {/* HERO 信箱封面 — 左60% 右40% */}
      <section className="relative">
        {/* 装饰邮戳 */}
        <Postmark
          size="lg"
          rotate={-14}
          className="absolute right-2 top-2 md:right-8 md:top-0 opacity-70 z-0 hidden sm:block"
        >
          <div className="flex flex-col items-center">
            <span className="text-[10px]">SINCE</span>
            <span className="text-xl font-latin">2026</span>
            <span className="text-[10px]">时光信箱</span>
          </div>
        </Postmark>

        <div className="relative z-10 grid lg:grid-cols-[3fr_2fr] gap-10 lg:gap-16 items-center pt-6 lg:pt-12">
          {/* 左：问候 + 文案 */}
          <div className="animate-fade-up">
            <span className="eyebrow mb-4">
              <Sparkles size={16} />
              {todayGreeting()}
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-ink-800 leading-tight text-balance">
              把您这一生的故事，
              <br />
              <span className="text-ochre-600">寄给未来。</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-ink-700/85 leading-relaxed max-w-xl text-balance">
              这里是一座会倾听的信箱。您说，小光听；您贴一张老照片，小光为您写一段回忆；
              最后把这些都装进一封寄给家人的家书里。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/chat" className="btn-primary text-xl">
                <Mail size={22} />
                打开信箱，开始聊聊
              </Link>
              <Link to="/timeline" className="btn-ghost text-lg">
                翻翻家庭档案
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* 数据小条 */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { label: "已记故事", value: stories.length },
                { label: "老照片", value: photos.length },
                { label: "人生节点", value: timeline.length },
              ].map((s) => (
                <div
                  key={s.label}
                  className="paper-card px-4 py-3 text-center"
                >
                  <div className="font-latin text-3xl text-ochre-600">
                    {s.value}
                  </div>
                  <div className="text-xs text-ink-700/70 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右：信封 + 信使吉祥物 */}
          <div className="relative h-[340px] sm:h-[420px] lg:h-[480px] flex items-center justify-center">
            {/* 暖色光晕 */}
            <div className="absolute inset-0 bg-warm-glow rounded-full blur-3xl opacity-70" />
            {/* 信封 */}
            <div className="relative animate-float-soft group">
              <div
                className="relative w-[280px] sm:w-[340px] lg:w-[380px] aspect-[3:2] rounded-2xl bg-paper-50 shadow-warm-lg overflow-hidden transition-shadow duration-500 group-hover:shadow-warm-lg"
                style={{ transform: "rotate(-3deg)" }}
              >
                {/* 信封翻盖 — 带 3D 翻转动画 */}
                <div
                  className="absolute top-0 left-0 right-0 h-1/2 origin-top transition-transform duration-1000 ease-in-out"
                  style={{
                    background:
                      "linear-gradient(135deg, #fdf8ef 0%, #f1e4cc 100%)",
                    clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                    boxShadow: "0 4px 12px -4px rgba(122,75,43,0.25)",
                    transform: flapOpen ? "rotateX(180deg)" : "rotateX(0deg)",
                    transformOrigin: "top center",
                    perspective: "600px",
                  }}
                />
                {/* 信封中线 */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-ochre-500/15" />
                {/* 信纸内容 — 随日期更新 */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] bg-paper-100 rounded-md shadow-warm p-4 text-center">
                  <div className="font-display text-2xl text-ochre-600">
                    致 · 我爱的家
                  </div>
                  <div className="mt-2 text-xs text-ink-700/70 font-serif">
                    {dateStr}
                  </div>
                  <div className="mt-2 text-sm text-ink-700/60 font-serif italic">
                    {letterLine(today)}
                  </div>
                  <div className="mt-3 flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gold-500"
                        style={{
                          animation: "wave 1s ease-in-out infinite",
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* 邮票 */}
                <div className="absolute top-2 right-2">
                  <Postmark size="sm" rotate={8}>
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-[8px]">寄</span>
                      <span className="text-base font-latin">★</span>
                      <span className="text-[8px]">家</span>
                    </div>
                  </Postmark>
                </div>
              </div>
              {/* 信使吉祥物 */}
              <div className="absolute -bottom-6 -left-6 sm:-left-10">
                <Mascot size={88} talking />
              </div>
              {/* 装饰小星 */}
              <Sparkles
                className="absolute -top-4 -right-2 text-gold-500/80"
                size={28}
              />
              <Sparkles
                className="absolute top-1/3 -right-8 text-gold-500/60"
                size={18}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 今日记忆 — 增强视觉层次 */}
      {memoryOfToday && (
        <section className="mt-16 lg:mt-24">
          <div className="relative paper-card p-6 md:p-10 overflow-hidden bg-gradient-to-br from-paper-100 via-paper-50 to-ochre-500/5">
            {/* 装饰光斑 */}
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-sage-500/8 rounded-full blur-3xl pointer-events-none" />

            <div className="absolute -right-6 -top-6 opacity-50">
              <Postmark size="md" rotate={12}>
                <span className="text-[10px] leading-tight text-center">
                  今日
                  <br />
                  记忆
                </span>
              </Postmark>
            </div>
            <span className="eyebrow mb-3">
              <span className="inline-block w-6 h-px bg-ochre-500/50" />
              今日 · 翻一封旧信
            </span>
            <h3 className="font-display text-3xl md:text-4xl text-ink-800 leading-snug">
              {memoryOfToday.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm px-3 py-1.5 rounded-full bg-ochre-500/15 text-ochre-600 font-serif border border-ochre-500/10">
                {memoryOfToday.stage}
              </span>
              {memoryOfToday.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="text-sm px-3 py-1.5 rounded-full bg-sage-500/12 text-sage-600 font-serif border border-sage-500/10"
                >
                  #{k}
                </span>
              ))}
            </div>
            <p className="mt-5 text-lg md:text-xl text-ink-700/85 leading-relaxed line-clamp-3 max-w-3xl font-serif">
              {memoryOfToday.content}
            </p>
            <Link
              to="/timeline"
              className="link-warm mt-5 inline-flex items-center gap-1 text-lg"
            >
              在时间轴里读完整故事 <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {/* 功能入口卡 — 交错动画 + 悬停浮起 */}
      <section className="mt-16 lg:mt-24">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <span className="eyebrow mb-2">
              <span className="inline-block w-6 h-px bg-ochre-500/50" />
              今天想做的事
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-ink-800">
              五件小事，慢慢来
            </h2>
          </div>
          <p className="text-base text-ink-700/70 max-w-md font-serif">
            不急，一天做一件就好。每做完一件，您的家庭档案就会厚一点。
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.to}
                to={f.to}
                className={cn(
                  "group paper-card p-6 md:p-7 flex flex-col gap-4",
                  "hover:-translate-y-2.5 hover:shadow-warm-lg transition-all duration-300",
                  "animate-fade-up",
                )}
                style={{
                  transform: `rotate(${f.rotate}deg)`,
                  animationDelay: `${i * 120}ms`,
                }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.accent} flex items-center justify-center shadow-warm`}
                >
                  <Icon className="text-paper-50" size={28} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-ink-800">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-base text-ink-700/80 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
                <div className="mt-auto pt-3 flex items-center gap-2 text-ochre-600 font-serif group-hover:gap-3 transition-all">
                  <span className="text-base">去看看</span>
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}

          {/* 第六格：社会价值卡 */}
          <div
            className="paper-card p-6 md:p-7 bg-gradient-to-br from-sage-500/15 to-gold-500/10 flex flex-col justify-center animate-fade-up"
            style={{ animationDelay: `${FEATURES.length * 120}ms` }}
          >
            <span className="eyebrow mb-3 text-sage-600">
              <span className="inline-block w-6 h-px bg-sage-500/50" />
              社会价值
            </span>
            <p className="font-serif text-lg text-ink-800 leading-relaxed">
              中国有 <span className="font-latin text-2xl text-ochre-600">2.8 亿</span> 老年人，
              很多故事还没来得及讲，就被时间带走了。
            </p>
            <p className="mt-3 font-serif text-base text-ink-700/80">
              我们希望 AI 不只是效率工具，更是一座温柔的信箱，替每个家庭把爱留下。
            </p>
          </div>
        </div>
      </section>

      {/* 一段话总结 — 产品理念 */}
      <section className="mt-16 lg:mt-24 mb-4">
        <div className="relative paper-card px-8 py-10 md:px-14 md:py-14 text-center bg-gradient-to-br from-paper-50 via-paper-100 to-gold-500/8 overflow-hidden">
          {/* 装饰 */}
          <div className="absolute left-1/2 -top-10 -translate-x-1/2 w-72 h-72 bg-ochre-500/6 rounded-full blur-3xl pointer-events-none" />
          <Heart
            className="mx-auto text-ochre-500/30 mb-5"
            size={36}
            strokeWidth={1.5}
          />
          <p className="font-display text-2xl md:text-3xl text-ink-800 leading-relaxed max-w-2xl mx-auto">
            每个人的故事，都值得被好好记住。
          </p>
          <p className="mt-4 text-lg md:text-xl text-ink-700/75 leading-relaxed max-w-xl mx-auto font-serif">
            AI 时光信箱相信：技术最温柔的样子，不是替人做事，而是陪人说话、帮人留心——
            让每一位长辈都能轻松地，把一生的温暖，寄给最爱的人。
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/chat" className="btn-primary text-lg">
              <Mail size={20} />
              写下第一封信
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
