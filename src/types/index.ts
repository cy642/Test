// 人生阶段
export type LifeStage = "童年" | "求学" | "工作" | "家庭" | "旅行" | "晚年";

// 故事
export interface Story {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  stage: LifeStage;
  createdAt: string;
  source?: "chat" | "story" | "photo";
}

// 老照片
export interface Photo {
  id: string;
  url: string;
  aiDescription: string;
  memory: string;
  era: string;
  createdAt: string;
  // 是否使用占位图（即未上传真实图片）
  placeholder?: boolean;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  emotion?: "happy" | "sad" | "nostalgic" | "neutral";
  timestamp: string;
  // 该消息是否已收藏为故事
  savedAsStory?: boolean;
}

// 家庭留言
export interface FamilyComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

// 时间轴节点
export interface TimelineNode {
  id: string;
  stage: LifeStage;
  title: string;
  date: string;
  storyId?: string;
  photoId?: string;
  comments: FamilyComment[];
}

// 视频素材
export interface VideoClip {
  id: string;
  type: "photo" | "story";
  refId: string;
  title: string;
  subtitle: string;
}

// 回忆文章（AI 根据口述故事生成的文学化散文）
export interface MemoryArticle {
  id: string;
  storyId: string;
  title: string;
  opening: string;       // 散文开头（场景描写/氛围渲染）
  body: string;          // 主体叙事（2~3 段，文学化改写）
  reflection: string;    // 感悟收尾
  motto?: string;        // 可选：一句话点题
  stage: LifeStage;
  createdAt: string;
}

// 视频脚本场景
export interface ScriptScene {
  index: number;
  type: "opening" | "photo" | "story" | "transition" | "closing";
  narration: string;     // 旁白文字
  visual: string;        // 画面描述
  music?: string;        // 音乐提示
  duration: number;      // 预估秒数
  photoRefId?: string;   // 关联照片 id
  storyRefId?: string;   // 关联故事 id
}

// 视频脚本（AI 根据故事+照片生成的完整脚本）
export interface VideoScript {
  id: string;
  title: string;
  theme: string;          // 主题一句话
  scenes: ScriptScene[];
  totalDuration: number;  // 总秒数
  createdAt: string;
}
