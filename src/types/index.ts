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
