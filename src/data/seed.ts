import type { Story, Photo, TimelineNode, ChatMessage } from "@/types";

// 生成稳定 id
export const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// 初始故事库（一位 70 岁老人已记录的故事）
export const seedStories: Story[] = [
  {
    id: "story-seed-1",
    title: "外婆的红糖糍粑",
    content:
      "我小时候住在乡下，每逢过年，外婆都会在灶台前打糍粑。木槌落在石臼里发出'咚、咚'的声响，整个院子都弥漫着糯米的香气。外婆会把第一块糍粑蘸上红糖，偷偷塞进我嘴里，笑着说'这是咱们家的秘密'。那时我不懂事，只觉得甜。如今外婆已经走了二十年，可那口红糖的甜味，还留在舌尖上。",
    keywords: ["童年", "外婆", "红糖糍粑", "过年", "乡下的灶台"],
    stage: "童年",
    createdAt: "2025-11-12T09:30:00.000Z",
    source: "story",
  },
  {
    id: "story-seed-2",
    title: "父亲送我去读师范",
    content:
      "1972 年秋天，父亲挑着两口旧木箱，送我去县城读师范。三十里山路，他一句话也没说，只是在过河时把裤腿卷得更高，怕水溅湿了我的新鞋。临别时他从怀里掏出一个用手帕包着的煮鸡蛋，说'好好念书，别惦记家里'。那枚鸡蛋我一直没舍得吃，揣在口袋里揣了三天。",
    keywords: ["求学", "父亲", "师范", "三十里山路", "煮鸡蛋"],
    stage: "求学",
    createdAt: "2025-12-03T14:10:00.000Z",
    source: "chat",
  },
  {
    id: "story-seed-3",
    title: "讲台上的四十年",
    content:
      "我在乡村小学教了四十年书。第一年工资每月 28 块，攒了三个月才买得起一辆二手凤凰牌自行车。每天清晨五点骑车翻过两座山去学校，后座绑着一摞学生作业本。最难忘的是 1985 年，我带的毕业班有六个孩子考上了县中，那是村里头一遭。家长们凑钱送来一面锦旗，上面绣着'山里也飞出金凤凰'，那面锦旗我挂了一辈子。",
    keywords: ["工作", "乡村教师", "凤凰牌自行车", "毕业生", "锦旗"],
    stage: "工作",
    createdAt: "2026-01-08T08:00:00.000Z",
    source: "story",
  },
  {
    id: "story-seed-4",
    title: "和你爸的第一次见面",
    content:
      "1978 年的春天，你爸从邻县调来我们学校教书。他第一次来我家吃饭，紧张得把筷子掉在地上三次。我妈在厨房偷笑，说这小伙子实在。后来他每天下班都绕路经过我家门口，假装去供销社买东西。其实我早就看出来啦，供销社根本不在那个方向。",
    keywords: ["家庭", "初遇", "爱人", "1978 年春天", "筷子"],
    stage: "家庭",
    createdAt: "2026-02-14T19:20:00.000Z",
    source: "chat",
  },
  {
    id: "story-seed-5",
    title: "我们一家的第一次旅行",
    content:
      "1990 年暑假，你爸攒了半年的奖金，带我和七岁的你坐绿皮火车去北京。硬座坐了十六个小时，你趴在窗边看了一路的麦田。在天安门广场你举着小红旗跑了一圈，跑回来抱着我的腿说'妈，原来北京这么大'。那张照片至今还在客厅挂着，你笑得露出刚掉的门牙。",
    keywords: ["旅行", "北京", "绿皮火车", "天安门", "1990 年"],
    stage: "旅行",
    createdAt: "2026-03-20T16:45:00.000Z",
    source: "story",
  },
];

// 初始老照片（使用占位插画 SVG，避免外链失效）
const makeVintagePhoto = (hue: number, label: string) => {
  // 生成一张怀旧色调的 SVG 占位图
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 35%, 65%)"/>
      <stop offset="0.6" stop-color="hsl(${hue + 12}, 30%, 50%)"/>
      <stop offset="1" stop-color="hsl(${hue - 10}, 25%, 28%)"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.4" r="0.7">
      <stop offset="0" stop-color="rgba(255,240,210,0.3)"/>
      <stop offset="1" stop-color="rgba(40,25,15,0.55)"/>
    </radialGradient>
  </defs>
  <rect width="600" height="450" fill="url(#g)"/>
  <circle cx="200" cy="180" r="60" fill="rgba(255,230,200,0.45)"/>
  <rect x="320" y="120" width="180" height="240" rx="8" fill="rgba(60,40,30,0.35)"/>
  <rect x="335" y="140" width="150" height="120" fill="rgba(255,235,200,0.25)"/>
  <rect x="80" y="260" width="200" height="140" rx="6" fill="rgba(40,28,20,0.4)"/>
  <rect width="600" height="450" fill="url(#v)"/>
  <text x="300" y="420" text-anchor="middle" font-family="serif" font-size="20" fill="rgba(255,235,200,0.7)" font-style="italic">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const seedPhotos: Photo[] = [
  {
    id: "photo-seed-1",
    url: makeVintagePhoto(28, "1972 · 乡村小学"),
    aiDescription:
      "画面中是一处青砖瓦房的乡村小学，木门半开，门口立着一块黑板，操场上隐约可见几名学生身影。整体色调泛黄，符合上世纪七十年代胶片质感。",
    memory:
      "这是我教书的第二年开始时拍的。学校只有三间教室，五十六个孩子从一年级到五年级挤在一起上课。黑板是刷了黑漆的木板，粉笔要省着用。",
    era: "约 1972 年",
    createdAt: "2025-11-20T10:00:00.000Z",
    placeholder: true,
  },
  {
    id: "photo-seed-2",
    url: makeVintagePhoto(45, "1978 · 我们结婚那天"),
    aiDescription:
      "一张黑白结婚照，男女主人公身着中山装与碎花衬衫，胸前别着红花，背景是一面挂有'囍'字的土墙，照片边缘略有磨损。",
    memory:
      "这是我们结婚那天的照片。你爸借了同事的中山装，我穿的是我妈陪嫁的碎花衬衫改的。那天没办酒席，只请了学校的几位同事吃了顿面条。",
    era: "1978 年冬",
    createdAt: "2025-12-25T12:00:00.000Z",
    placeholder: true,
  },
  {
    id: "photo-seed-3",
    url: makeVintagePhoto(15, "1990 · 天安门广场"),
    aiDescription:
      "阳光下，一位母亲牵着小孩站在广场上，孩子手中挥舞小红旗，远处城楼的轮廓清晰可辨。照片略带过曝，呈现家庭相册常见的暖色质感。",
    memory:
      "那年你七岁，第一次出远门。你在广场上跑了一圈回来抱我的腿，说'妈，原来北京这么大'。这张照片后来洗了五张，分给了你姥姥、姑姑、还有你爸的师傅。",
    era: "1990 年夏",
    createdAt: "2026-03-20T17:00:00.000Z",
    placeholder: true,
  },
];

export const seedTimeline: TimelineNode[] = [
  {
    id: "tl-seed-1",
    stage: "童年",
    title: "乡下的灶台与红糖糍粑",
    date: "1958",
    storyId: "story-seed-1",
    comments: [
      {
        id: "c-1",
        author: "女儿 · 小敏",
        content: "妈，外婆的糍粑我也吃过！我记得您后来也给我做过一次。",
        timestamp: "2025-11-13T08:00:00.000Z",
      },
    ],
  },
  {
    id: "tl-seed-2",
    stage: "求学",
    title: "父亲挑箱送我去师范",
    date: "1972",
    storyId: "story-seed-2",
    comments: [],
  },
  {
    id: "tl-seed-3",
    stage: "工作",
    title: "讲台四十年 · 第一辆自行车",
    date: "1973",
    storyId: "story-seed-3",
    photoId: "photo-seed-1",
    comments: [
      {
        id: "c-2",
        author: "学生 · 老李",
        content: "老师，我是您 85 届的学生！那面锦旗我们几个老同学前年还提起。",
        timestamp: "2026-01-09T20:30:00.000Z",
      },
    ],
  },
  {
    id: "tl-seed-4",
    stage: "家庭",
    title: "与你爸的初遇 · 1978",
    date: "1978",
    storyId: "story-seed-4",
    photoId: "photo-seed-2",
    comments: [],
  },
  {
    id: "tl-seed-5",
    stage: "旅行",
    title: "一家人第一次去北京",
    date: "1990",
    storyId: "story-seed-5",
    photoId: "photo-seed-3",
    comments: [
      {
        id: "c-3",
        author: "儿子 · 阿哲",
        content: "妈，那张照片就在我客厅挂着呢。我现在还记得那趟绿皮火车。",
        timestamp: "2026-03-21T09:10:00.000Z",
      },
    ],
  },
  {
    id: "tl-seed-6",
    stage: "晚年",
    title: "退休后开始写毛笔字",
    date: "2010",
    comments: [
      {
        id: "c-4",
        author: "女儿 · 小敏",
        content: "妈退休那年说要把毛笔字捡起来，现在写得比我都好啦！",
        timestamp: "2026-04-01T15:00:00.000Z",
      },
    ],
  },
];

export const seedChat: ChatMessage[] = [
  {
    id: "chat-seed-1",
    role: "ai",
    content:
      "您好呀，我是您的时光信使小光。今天天气不错，您愿意跟我聊聊小时候最难忘的味道吗？",
    emotion: "happy",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];
