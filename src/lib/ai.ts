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

// ============================================================
// AI 回忆文章生成：根据口述故事生成文学化散文
// ============================================================

import type { MemoryArticle, VideoScript, ScriptScene } from "@/types";

// 每个阶段的文章模板库
const ARTICLE_TEMPLATES: Record<LifeStage, {
  openings: string[];
  reflections: string[];
  mottos: string[];
}> = {
  童年: {
    openings: [
      "那时候的日子，像灶膛里慢炖的一锅粥，咕嘟咕嘟冒着热气，日子虽清贫，却都是甜的。",
      "童年的记忆，总带着一种说不清的暖。大概是因为那些画面里，总有一个人在灶台前、在田埂上、在大门边等着我们回家。",
      "如果闭上眼睛，最先浮上来的不是画面，而是一种味道——那是只有小时候才闻得到的、被阳光晒过的棉被的香气。",
    ],
    reflections: [
      "那些年不懂什么是幸福，只觉得每天有人喊吃饭、有人给擦眼泪，就是天经地义。如今才明白，那便是最厚的福气。",
      "小时候以为大人的世界很大，长大了才发现，自己的世界再大，也装不下一个回不去的童年。",
      "岁月带走了那条小巷、那棵老树，可带不走的，是那一口甜味、那一声呼唤。",
    ],
    mottos: [
      "童年是人生第一封写给自己的信，字迹歪歪扭扭，却字字千金。",
      "最甜的不是糖，是有人偷偷塞给你的那颗心。",
    ],
  },
  求学: {
    openings: [
      "走出家门的那一刻，才知道身后那条路有多长。每一步都是离家的距离，也是靠近梦想的距离。",
      "那年的书包很重，重得不像少年该扛的分量。但书包里装着的不只是书，还有一家人省吃俭用攒下的期望。",
      "求学路上的风总是很大，吹得人睁不开眼，却也把一些东西吹进了骨子里——比如倔强，比如不服输。",
    ],
    reflections: [
      "许多年后才读懂，那些送我出门时什么也没说的人，其实把千言万语都藏在了沉默里。",
      "文凭不过一张纸，可那张纸背后，是三代人的托举。",
      "后来我站在讲台上教别人读书，才真正明白——当年那个挑箱送我的人，教给我的是最深的课本。",
    ],
    mottos: [
      "读书的路，是一个人替一家人走的远路。",
      "最难的不是考卷上的题，是出门时没敢回头的那一眼。",
    ],
  },
  工作: {
    openings: [
      "第一份工作报到那天，我比太阳起得还早，比闹钟还紧张。那种忐忑，像是第一次走上人生的舞台。",
      "干了一辈子的行当，说起来不过是两个字：教书。可这两个字里，装着四十年晨昏、一千多个孩子、和一辆骑烂的自行车。",
      "年轻时候不知道，自己正在做的事会成为一辈子。等回头看，才发现路已经走了这么远，每一步都是实打实的。",
    ],
    reflections: [
      "当年觉得稀松平常的日子——早起、赶路、上课、改作业——如今想来，每一帧都闪着光。",
      "工资从二十八块涨到两千，日子从紧巴到宽裕，不变的是每天清晨五点起床的闹钟，和那股子'还有学生等着'的劲。",
      "有人问我干了一辈子累不累，我说不累。那些孩子后来回来看我的时候，我觉得这辈子值了。",
    ],
    mottos: [
      "一辈子做一件事，是平凡人最了不起的倔强。",
      "讲台不高，却看得见最远的风景。",
    ],
  },
  家庭: {
    openings: [
      "缘分这东西，说来就来。那年春天，他调来我们学校，谁知道一次家常饭，就吃出了一辈子。",
      "成立一个家，不需要多大的房子，只需要两个人坐在一起，说一声'往后就咱俩了'。",
      "日子是柴米油盐堆出来的，可堆着堆着，就堆成了一座小山，山上开满了花。",
    ],
    reflections: [
      "年轻时觉得浪漫是花前月下，老了才知道，浪漫是他把最后一口菜夹到你碗里。",
      "我们那个年代不兴说爱，可他把筷子掉了三次这件事，我记了一辈子。",
      "家不是一个地址，是每次推开门，有人喊你一声'回来了'。",
    ],
    mottos: [
      "最好的爱情，不是轰轰烈烈，是筷子掉了还替你捡起来。",
      "家的温度，不在屋顶，在人心。",
    ],
  },
  旅行: {
    openings: [
      "第一次出远门，心里装的不是风景，是害怕。可一回头看见家人就在身边，什么都敢了。",
      "那年绿皮火车咣当咣当开了一整夜，窗外的麦田从黑变成金，我们就这样从家乡开到了北京。",
      "旅行最难忘的不是风景，是路上那些笑到肚子疼、累到走不动、然后又互相打气的瞬间。",
    ],
    reflections: [
      "后来又去过很多地方，可再也没有一趟火车，比那十六个小时的硬座更让我想念。",
      "天安门广场很大，可在孩子眼里，全世界就那么大——跑一圈就回来了，回到妈妈身边。",
      "每次翻出那张旅行照片，我都不看风景，只看身边的人。他们才是最好的风景。",
    ],
    mottos: [
      "最美的旅途，不在远方，在身边有家人的路上。",
      "火车开往哪里不重要，重要的是谁坐在你旁边。",
    ],
  },
  晚年: {
    openings: [
      "退休那天，我把闹钟收进了抽屉。第二天早上五点，我还是醒了——有些习惯，是刻在骨头里的。",
      "晚年不意味着停下，只是换了一种走法。慢一点，可每一步都踩得更实。",
      "日子慢下来以后，才发现以前走过路边的花，原来开得这么好看。",
    ],
    reflections: [
      "如果给年轻时的自己带句话，我会说：别急，慢慢来，好日子都在后头。",
      "人这一辈子，到头来留不住什么东西，可那些被记住的瞬间，一个都不少。",
      "如今最大的心愿，不是别的，就是这些故事有人听、有人记、有人替我传下去。",
    ],
    mottos: [
      "晚年是人生最后的落款，不急，慢慢写。",
      "最好的时光，不在过去，在每一个还能讲故事的当下。",
    ],
  },
};

/**
 * 根据口述故事生成文学化回忆文章
 */
export function generateMemoryArticle(
  storyTitle: string,
  storyContent: string,
  storyStage: LifeStage,
  storyKeywords: string[],
): MemoryArticle {
  const tpl = ARTICLE_TEMPLATES[storyStage];

  // 根据内容关键词选择最匹配的开头
  const opening = pickBest(tpl.openings, storyContent);
  // 主体叙事：在原文基础上文学化润色
  const body = literaryRewrite(storyContent, storyStage, storyKeywords);
  // 感悟收尾
  const reflection = pickBest(tpl.reflections, storyContent);
  // 点题一句话
  const motto = tpl.mottos[Math.floor(Math.random() * tpl.mottos.length)];

  // 文章标题比故事标题更具文学性
  const articleTitle = literaryTitle(storyTitle, storyStage, storyKeywords);

  return {
    id: `article-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    storyId: "",
    title: articleTitle,
    opening,
    body,
    reflection,
    motto,
    stage: storyStage,
    createdAt: new Date().toISOString(),
  };
}

// 把回忆文章格式化为流式输出文本
export function formatArticleForStream(article: MemoryArticle): string {
  return [
    `【文章标题】${article.title}`,
    "",
    "【开篇·场景描写】",
    article.opening,
    "",
    "【正文·往事如昨】",
    article.body,
    "",
    "【感悟·岁月留痕】",
    article.reflection,
    "",
    `【点题】「${article.motto ?? ""}」`,
  ].join("\n");
}

// --- 回忆文章内部工具函数 ---

function pickBest(candidates: string[], _context: string): string {
  // 简单策略：随机选一条（Demo 用，真实场景可用语义匹配）
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function literaryTitle(rawTitle: string, stage: LifeStage, keywords: string[]): string {
  // 如果原标题已经有文学感，稍作修改；否则根据阶段和关键词拟一个
  const stagePrefix: Record<LifeStage, string> = {
    童年: "那些年的甜",
    求学: "出门的那条路",
    工作: "一辈子的事",
    家庭: "两个人的家",
    旅行: "一起走过的远方",
    晚年: "慢慢走，慢慢看",
  };
  if (keywords.length >= 2) {
    return `${stagePrefix[stage]} · ${keywords.slice(0, 2).join("与")}`;
  }
  return `${stagePrefix[stage]} · ${rawTitle}`;
}

function literaryRewrite(content: string, stage: LifeStage, keywords: string[]): string {
  const sentences = content
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[。！？])/g)
    .filter(Boolean);

  if (sentences.length <= 2) return content;

  // 分 2~3 段，中间插入文学化过渡句
  const transitions: Record<LifeStage, string[]> = {
    童年: ["那是一段被阳光浸透的日子。", "如今想来，那些微不足道的小事，反而是最重的。"],
    求学: ["从此，脚下的路不再只是田埂。", "书页翻过的声音，至今还在耳边。"],
    工作: ["日子就在日复一日里，慢慢铺开。", "后来我才明白，坚持本身就是一种了不起。"],
    家庭: ["日子越过越平淡，可平淡里藏着最深的甜。", "家就是这样，不说爱，却处处是爱。"],
    旅行: ["路上的风景很多，可最难忘的是身边人的笑。", "那一趟旅途，成了我们家最珍贵的共同记忆。"],
    晚年: ["日子慢下来以后，回忆反而更清晰了。", "人生走到这一程，回望比远望更让人心安。"],
  };

  const mid = Math.ceil(sentences.length / 2);
  const p1 = sentences.slice(0, mid).join("");
  const trans1 = transitions[stage][0];
  const p2 = sentences.slice(mid).join("");

  if (sentences.length > 4) {
    const mid2 = Math.ceil(sentences.length * 0.7);
    const trans2 = transitions[stage][1];
    const pa = sentences.slice(0, mid).join("");
    const pb = sentences.slice(mid, mid2).join("");
    const pc = sentences.slice(mid2).join("");
    return `${pa}\n\n${trans1}\n\n${pb}\n\n${trans2}\n\n${pc}`;
  }

  return `${p1}\n\n${trans1}\n\n${p2}`;
}

// ============================================================
// AI 视频脚本生成：根据故事+照片生成完整视频脚本
// ============================================================

export function generateVideoScript(
  storyTitles: string[],
  storyContents: string[],
  storyStages: string[],
  photoEras: string[],
  photoMemories: string[],
): VideoScript {
  const scenes: ScriptScene[] = [];
  let duration = 0;
  let sceneIndex = 0;

  // 开场
  const themeWords = storyStages.length > 0
    ? storyStages[0]
    : "回忆";
  scenes.push({
    index: sceneIndex++,
    type: "opening",
    narration: `这是一封来自${themeWords}的信。信里写着一个人走过的大半辈子，和那些舍不得忘记的小事。`,
    visual: "黑屏渐亮，旧信纸缓缓铺开，暖色光晕从画面中央散开",
    music: "钢琴独奏，轻柔缓慢",
    duration: 5,
  });
  duration += 5;

  // 照片场景
  photoEras.forEach((era, i) => {
    const memory = photoMemories[i] ?? "一张承载着岁月记忆的老照片";
    scenes.push({
      index: sceneIndex++,
      type: "photo",
      narration: memory.length > 40 ? memory.slice(0, 40) + "…" : memory,
      visual: `老照片缓缓浮现，${era}的年代感扑面而来，画面微微泛黄`,
      music: "弦乐加入，温暖低沉",
      duration: 6,
      photoRefId: undefined,
    });
    duration += 6;

    // 照片之间加过渡
    if (i < photoEras.length - 1) {
      scenes.push({
        index: sceneIndex++,
        type: "transition",
        narration: "",
        visual: "胶片划痕闪过，画面淡入淡出",
        music: "短暂停顿",
        duration: 2,
      });
      duration += 2;
    }
  });

  // 故事场景
  storyContents.forEach((content, i) => {
    const title = storyTitles[i] ?? "一段往事";
    // 取故事的核心句子作为旁白
    const sentences = content.split(/[。！？]/).map((s) => s.trim()).filter((s) => s.length >= 6);
    const narration = sentences.length > 2
      ? sentences.slice(0, 3).join("。") + "。"
      : content.slice(0, 60) + (content.length > 60 ? "…" : "");

    scenes.push({
      index: sceneIndex++,
      type: "story",
      narration,
      visual: `画面缓缓推移，配以手绘插画风格展现「${title}」的场景`,
      music: "弦乐渐强，如诉说般悠扬",
      duration: 8,
      storyRefId: undefined,
    });
    duration += 8;

    // 故事之间加过渡
    if (i < storyContents.length - 1) {
      scenes.push({
        index: sceneIndex++,
        type: "transition",
        narration: "",
        visual: "墨渍晕染转场，时光流转",
        music: "轻轻的钢琴过门",
        duration: 2,
      });
      duration += 2;
    }
  });

  // 结尾
  scenes.push({
    index: sceneIndex++,
    type: "closing",
    narration: "愿这些被记下的故事，替我们把爱说给后代听。",
    visual: "画面缓缓拉远，信封合上，邮戳盖下——「时光信箱」",
    music: "弦乐与钢琴合奏，温暖渐收",
    duration: 6,
  });
  duration += 6;

  return {
    id: `script-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${themeWords}的回忆 · 家庭短片脚本`,
    theme: storyTitles.length > 0 ? `关于${storyTitles[0]}与那些年的温暖记忆` : "一段关于家的温暖记忆",
    scenes,
    totalDuration: duration,
    createdAt: new Date().toISOString(),
  };
}

// 把视频脚本格式化为流式输出文本
export function formatScriptForStream(script: VideoScript): string {
  const sceneLines = script.scenes.map((s) => {
    const label =
      s.type === "opening" ? "【开场】"
      : s.type === "photo" ? `【场景${s.index}·照片】`
      : s.type === "story" ? `【场景${s.index}·故事】`
      : s.type === "transition" ? `【过渡】`
      : "【结尾】";
    return [
      label,
      s.narration ? `旁白：「${s.narration}」` : "（无旁白）",
      `画面：${s.visual}`,
      s.music ? `音乐：${s.music}` : "",
      `时长：${s.duration}秒`,
    ].filter(Boolean).join("\n");
  });

  return [
    `【脚本标题】${script.title}`,
    `【主题】${script.theme}`,
    `【总时长】${script.totalDuration}秒`,
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    ...sceneLines.join("\n\n").split("\n"),
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    `共 ${script.scenes.length} 个场景 · 预计 ${script.totalDuration} 秒`,
  ].join("\n");
}

// 为视频脚本动态生成字幕（替代固定文案）
export function generateSubtitlesFromScript(script: VideoScript): string[] {
  return script.scenes
    .filter((s) => s.narration)
    .map((s) => s.narration);
}
