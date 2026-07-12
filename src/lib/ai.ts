import type { LifeStage } from "@/types";

// ============================================================
// 通用流式输出工具：把一段文字按字符慢慢"打"出来
// ============================================================

export interface StreamHandlers {
  onChunk: (partial: string) => void;
  onDone?: (full: string) => void;
  signal?: AbortSignal;
}

export async function streamText(
  text: string,
  handlers: StreamHandlers,
  opts: { speed?: number; jitter?: number } = {},
) {
  const { speed = 35, jitter = 25 } = opts;
  let acc = "";
  for (const ch of text) {
    if (handlers.signal?.aborted) break;
    acc += ch;
    handlers.onChunk(acc);
    // 标点稍微停顿一下，更像真人
    const pause = /[，。！？；：、…]/.test(ch) ? speed * 6 : speed;
    await sleep(pause + Math.random() * jitter);
  }
  handlers.onDone?.(acc);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// AI 陪伴聊天：根据用户输入生成温暖回应
// ============================================================

export type Emotion = "happy" | "sad" | "nostalgic" | "neutral";

interface ChatReply {
  content: string;
  emotion: Emotion;
  followUp?: string; // AI 接下来想继续追问的
}

interface Topic {
  keywords: string[];
  reply: string;
  emotion: Emotion;
  followUp?: string;
}

const TOPIC_LIBRARY: Topic[] = [
  {
    keywords: ["童年", "小时候", "上学", "课本", "零食", "味道", "糍粑", "糖"],
    reply:
      "听起来真是一段又甜又暖的回忆呢。小时候的味道，好像总能记得特别清楚。您愿意多和我说说，那时候是谁陪着您尝到这个味道的吗？",
    emotion: "nostalgic",
    followUp: "您还记得那天吃饭时，桌边坐着谁吗？",
  },
  {
    keywords: ["父亲", "母亲", "爸", "妈", "外婆", "外婆", "爷爷", "奶奶", "姥姥"],
    reply:
      "听您说起家人，我都能感觉到那份暖意。亲人的一举一动，常常在多年以后才看清分量。那位长辈，后来还有让您最惦记的瞬间吗？",
    emotion: "nostalgic",
    followUp: "如果现在能再见到 ta，您最想说的第一句话会是什么？",
  },
  {
    keywords: ["学校", "老师", "教书", "学生", "课堂", "讲台"],
    reply:
      "原来您是一位老师呀，太了不起了！讲台上一定有讲不完的故事。您还记得自己上第一堂课时的心情吗？",
    emotion: "happy",
    followUp: "那一年您教的第一批学生，后来还有联系吗？",
  },
  {
    keywords: ["结婚", "爱人", "老伴", "对象", "对象", "初遇", "相亲"],
    reply:
      "哈哈，那真是一段可爱的缘分呢。当年那种小心翼翼的心动，现在想起来还会脸红吧？您还记得第一次见面那天，对方穿了什么衣服吗？",
    emotion: "happy",
    followUp: "您当时心里第一反应，是不是觉得这个人挺老实？",
  },
  {
    keywords: ["孩子", "儿子", "女儿", "宝宝", "出生", "怀孕"],
    reply:
      "孩子来到这个世界的那一刻，一定让全家人都欢喜坏了吧。您还记得第一次抱起 ta 时，心里是什么感觉吗？",
    emotion: "happy",
    followUp: "ta 第一声叫的是'妈妈'还是'爸爸'？",
  },
  {
    keywords: ["旅行", "火车", "北京", "出门", "第一次", "远方"],
    reply:
      "第一次出远门，那种新奇感真的会记一辈子。您还记得那趟火车上，窗外是什么风景吗？",
    emotion: "nostalgic",
    followUp: "那次旅行里最让您意外的，是什么呢？",
  },
  {
    keywords: ["难过", "想念", "想", "去世", "走了", "不在", "遗憾", "后悔"],
    reply:
      "听您这样说，我心里也跟着一紧。有些想念，时间越久反而越深。您愿意的话，多和我说说 ta 吧——那些让您最舍不得忘掉的小事。",
    emotion: "sad",
    followUp: "如果 ta 现在能听见，您最想让 ta 知道的是哪件事？",
  },
  {
    keywords: ["退休", "晚年", "现在", "每天", "今天"],
    reply:
      "退休以后的日子，节奏一下子就慢下来了吧。慢慢走、慢慢看，也是一种福气呢。您现在每天最期待的一件事是什么呀？",
    emotion: "happy",
    followUp: "如果让您给年轻时的自己带句话，您会说什么？",
  },
];

const FALLBACK_REPLIES: ChatReply[] = [
  {
    content:
      "您说的这些，我都认真听着呢。每一个细节，都是您人生里独一无二的脚印。您愿意再多告诉我一些吗？",
    emotion: "neutral",
    followUp: "那一刻，您心里最先想到的人是谁？",
  },
  {
    content:
      "我陪您慢慢讲，不着急。讲出来的每一句，都会被这小小的信箱好好收着。您还记得当时是几岁吗？",
    emotion: "neutral",
    followUp: "那一年，家里还有什么特别的事吗？",
  },
  {
    content:
      "真好，听您讲就像翻开了一本老相册。再多和我说说吧，您觉得那段日子里，最甜的是什么？",
    emotion: "happy",
    followUp: "如果给那段日子起个小标题，您会叫它什么？",
  },
];

const GREETING: ChatReply = {
  content:
    "您好呀，我是您的时光信使小光。今天咱们不急，慢慢聊聊。您愿意先跟我说说，最近常常想起的一件事是什么吗？",
  emotion: "happy",
  followUp: "可以是一段味道、一个人，也可以是一个年代。",
};

export function generateChatReply(userInput: string): ChatReply {
  const input = userInput.trim();
  if (!input) return GREETING;

  // 关键词匹配
  for (const topic of TOPIC_LIBRARY) {
    if (topic.keywords.some((k) => input.includes(k))) {
      return {
        content: topic.reply,
        emotion: topic.emotion,
        followUp: topic.followUp,
      };
    }
  }
  // 没匹配上则用兜底
  const fb = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  return fb;
}

// 主动开启的话题气泡
export const SUGGESTED_TOPICS = [
  "童年最难忘的味道",
  "第一次坐火车",
  "和爱人第一次见面",
  "讲台上的第一堂课",
  "您给孩子起名字的故事",
  "退休那天的心情",
];

// ============================================================
// 故事 AI：把口述整理成结构化人生故事
// ============================================================

export interface StructuredStory {
  title: string;
  content: string;
  keywords: string[];
  stage: LifeStage;
}

const STAGE_HINTS: { stage: LifeStage; words: string[] }[] = [
  { stage: "童年", words: ["小时候", "外婆", "奶奶", "糍粑", "灶台", "乡下", "玩耍", "七岁", "八岁"] },
  { stage: "求学", words: ["上学", "师范", "学校", "老师", "课本", "考试", "同学", "录取"] },
  { stage: "工作", words: ["工作", "上班", "讲台", "教书", "工资", "同事", "单位", "退休"] },
  { stage: "家庭", words: ["结婚", "爱人", "老伴", "孩子", "儿子", "女儿", "家", "对象"] },
  { stage: "旅行", words: ["旅行", "火车", "北京", "出门", "远方", "第一次去", "旅游"] },
  { stage: "晚年", words: ["退休", "晚年", "现在", "最近", "今天", "每天", "孙子"] },
];

function detectStage(text: string): LifeStage {
  let best: LifeStage = "童年";
  let bestScore = 0;
  for (const hint of STAGE_HINTS) {
    const score = hint.words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = hint.stage;
    }
  }
  return best;
}

function extractKeywords(text: string): string[] {
  const candidates = [
    "外婆", "奶奶", "爷爷", "父亲", "母亲", "爱人", "老伴", "儿子", "女儿",
    "糍粑", "灶台", "乡下", "师范", "讲台", "自行车", "火车", "北京",
    "结婚", "退休", "过年", "学校", "课堂", "锦旗", "天安门", "红糖",
  ];
  const matched = candidates.filter((c) => text.includes(c));
  // 加上出现的年份
  const yearMatches = text.match(/(19[5-9]\d|20[0-2]\d)年?/g) || [];
  const unique = Array.from(new Set([...matched, ...yearMatches.slice(0, 1)]));
  return unique.slice(0, 5);
}

function composeTitle(text: string, stage: LifeStage): string {
  const kws = extractKeywords(text);
  // 找一句带情感的话
  const sentences = text.split(/[，。！？；]/).map((s) => s.trim()).filter((s) => s.length >= 4 && s.length <= 18);
  if (sentences.length) {
    const pick = sentences[Math.floor(sentences.length / 2)];
    return pick.length <= 16 ? pick : `${stage}的故事 · ${kws[0] ?? "旧时光"}`;
  }
  return kws.length ? `${stage}的回忆 · ${kws.slice(0, 2).join("与")}` : `${stage}的故事`;
}

function composeContent(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  // 按句号分两段，让 AI 整理看起来更"结构化"
  const sentences = trimmed.split(/(?<=[。！？])/g).filter(Boolean);
  if (sentences.length <= 1) return trimmed;
  const mid = Math.ceil(sentences.length / 2);
  const part1 = sentences.slice(0, mid).join("");
  const part2 = sentences.slice(mid).join("");
  return `${part1}\n\n${part2}`;
}

export function structureStory(raw: string): StructuredStory {
  const stage = detectStage(raw);
  return {
    title: composeTitle(raw, stage),
    content: composeContent(raw),
    keywords: extractKeywords(raw),
    stage,
  };
}

// 把整理结果格式化为可流式输出的"AI 整理卡片"文字
export function formatStoryForStream(s: StructuredStory): string {
  return [
    `【标题】${s.title}`,
    "",
    `【人生阶段】${s.stage}`,
    "",
    "【正文】",
    s.content,
    "",
    `【关键词】${s.keywords.join(" · ") || "（待补充）"}`,
  ].join("\n");
}

// ============================================================
// 老照片 AI：根据图片生成解读与回忆文字
// ============================================================

export interface PhotoAnalysis {
  description: string;
  era: string;
  memory: string;
}

const PHOTO_TEMPLATES: PhotoAnalysis[] = [
  {
    description:
      "画面色调温暖偏黄，应是一张家庭老照片。前景人物站位自然，背景可见年代感明显的建筑轮廓与陈设，符合上世纪七八十年代的家庭留影风格。",
    era: "约 1970—1980 年代",
    memory:
      "看着这张照片，仿佛能听见当时快门'咔嚓'一响后，旁边有人喊'再来一张'的声音。那时候拍照是件大事，全家人都会换上最体面的衣服。",
  },
  {
    description:
      "光影柔和，画面构图居中，人物神情安详。背景的物件与服饰细节透露出浓郁的旧时光气息，整张照片呈现出胶片特有的颗粒感。",
    era: "约 1980—1990 年代",
    memory:
      "那一年家里还没有相机，是请了镇上照相馆的师傅来拍的。师傅会让我们'笑一笑，别动'，那一瞬间就被定格了一辈子。",
  },
  {
    description:
      "画面边缘略有磨损，整体呈暖棕色，人物服饰为典型时代款式。背景中的物件排列整齐，可见当时人们对待合影的郑重。",
    era: "约 1960—1970 年代",
    memory:
      "那个年代拍一张照片要等好几天才能洗出来。照片洗好那天，全家人围着看了一整晚，谁也舍不得先放进相册。",
  },
];

export function analyzePhoto(): PhotoAnalysis {
  return PHOTO_TEMPLATES[Math.floor(Math.random() * PHOTO_TEMPLATES.length)];
}

export function formatPhotoForStream(a: PhotoAnalysis): string {
  return [
    "【画面解读】",
    a.description,
    "",
    `【年代推测】${a.era}`,
    "",
    "【为您写下的回忆】",
    a.memory,
  ].join("\n");
}

// ============================================================
// 视频生成：模拟生成进度
// ============================================================

export interface VideoProgressHandlers {
  onProgress: (percent: number, stage: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

const VIDEO_STAGES = [
  { until: 20, text: "正在挑选最美的照片…" },
  { until: 45, text: "正在为每张照片撰写旁白…" },
  { until: 70, text: "正在配上温暖的背景音乐…" },
  { until: 90, text: "正在合成胶片质感画面…" },
  { until: 100, text: "正在为视频盖上邮戳…" },
];

export async function generateVideo(
  handlers: VideoProgressHandlers,
  totalMs = 4500,
) {
  const step = 80;
  const steps = Math.ceil(totalMs / step);
  for (let i = 1; i <= steps; i++) {
    if (handlers.signal?.aborted) break;
    const percent = Math.round((i / steps) * 100);
    const stageText = VIDEO_STAGES.find((s) => percent <= s.until)?.text ?? "即将完成…";
    handlers.onProgress(percent, stageText);
    await sleep(step);
  }
  handlers.onProgress(100, "完成啦，您可以播放了");
  handlers.onDone?.();
}

// 视频字幕轮播文案
export const VIDEO_SUBTITLES = [
  "时光是一条慢河，把我们带回每一个被爱过的瞬间。",
  "那年灶台前的红糖糍粑，甜了整个童年。",
  "父亲挑箱送我求学的那条山路，至今还在脚下。",
  "讲台上的四十年，粉笔灰落成了满头白发。",
  "我们一家三口的绿皮火车，开向了北京，也开向了未来。",
  "愿这些被记下的故事，替我们把爱说给后代听。",
];
