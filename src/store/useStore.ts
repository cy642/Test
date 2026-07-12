import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Story,
  Photo,
  ChatMessage,
  TimelineNode,
  FamilyComment,
  VideoClip,
  MemoryArticle,
} from "@/types";
import { seedStories, seedPhotos, seedTimeline, seedChat, uid } from "@/data/seed";

interface AppState {
  stories: Story[];
  photos: Photo[];
  chat: ChatMessage[];
  timeline: TimelineNode[];
  videoClips: VideoClip[];
  memoryArticles: MemoryArticle[];

  // 聊天
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  saveChatAsStory: (messageId: string, stage: Story["stage"]) => Story | null;

  // 故事
  addStory: (story: Omit<Story, "id" | "createdAt">) => Story;

  // 照片
  addPhoto: (photo: Omit<Photo, "id" | "createdAt">) => Photo;

  // 时间轴
  addTimelineNode: (node: Omit<TimelineNode, "id" | "comments">) => TimelineNode;
  addComment: (nodeId: string, comment: Omit<FamilyComment, "id" | "timestamp">) => void;

  // 视频素材
  toggleVideoClip: (clip: Omit<VideoClip, "id">) => void;
  removeVideoClip: (id: string) => void;
  clearVideoClips: () => void;

  // 回忆文章
  addMemoryArticle: (article: Omit<MemoryArticle, "id" | "createdAt">) => MemoryArticle;

  // 重置演示
  resetAll: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      stories: seedStories,
      photos: seedPhotos,
      chat: seedChat,
      timeline: seedTimeline,
      videoClips: [],
      memoryArticles: [],

      addChatMessage: (msg) => set((s) => ({ chat: [...s.chat, msg] })),

      clearChat: () =>
        set({
          chat: [
            {
              id: uid("chat"),
              role: "ai",
              content:
                "我们重新开始吧。您最近常常想起的人是谁呀？",
              emotion: "happy",
              timestamp: new Date().toISOString(),
            },
          ],
        }),

      saveChatAsStory: (messageId, stage) => {
        const msg = get().chat.find((m) => m.id === messageId);
        if (!msg || msg.role !== "user") return null;
        const story: Story = {
          id: uid("story"),
          title: `一段${stage}的回忆`,
          content: msg.content,
          keywords: [],
          stage,
          createdAt: new Date().toISOString(),
          source: "chat",
        };
        set((s) => ({
          stories: [story, ...s.stories],
          chat: s.chat.map((m) =>
            m.id === messageId ? { ...m, savedAsStory: true } : m,
          ),
        }));
        return story;
      },

      addStory: (story) => {
        const full: Story = {
          ...story,
          id: uid("story"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ stories: [full, ...s.stories] }));
        // 自动加入时间轴
        get().addTimelineNode({
          stage: story.stage,
          title: story.title,
          date: new Date().getFullYear().toString(),
          storyId: full.id,
        });
        return full;
      },

      addPhoto: (photo) => {
        const full: Photo = {
          ...photo,
          id: uid("photo"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ photos: [full, ...s.photos] }));
        return full;
      },

      addTimelineNode: (node) => {
        const full: TimelineNode = {
          ...node,
          id: uid("tl"),
          comments: [],
        };
        set((s) => ({ timeline: [...s.timeline, full] }));
        return full;
      },

      addComment: (nodeId, comment) => {
        const full: FamilyComment = {
          ...comment,
          id: uid("c"),
          timestamp: new Date().toISOString(),
        };
        set((s) => ({
          timeline: s.timeline.map((n) =>
            n.id === nodeId ? { ...n, comments: [...n.comments, full] } : n,
          ),
        }));
      },

      toggleVideoClip: (clip) => {
        const exists = get().videoClips.find(
          (c) => c.refId === clip.refId,
        );
        if (exists) {
          set((s) => ({
            videoClips: s.videoClips.filter((c) => c.refId !== clip.refId),
          }));
        } else {
          set((s) => ({
            videoClips: [...s.videoClips, { ...clip, id: uid("clip") }],
          }));
        }
      },

      removeVideoClip: (id) =>
        set((s) => ({ videoClips: s.videoClips.filter((c) => c.id !== id) })),

      clearVideoClips: () => set({ videoClips: [] }),

      addMemoryArticle: (article) => {
        const full: MemoryArticle = {
          ...article,
          id: uid("article"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ memoryArticles: [full, ...s.memoryArticles] }));
        return full;
      },

      resetAll: () =>
        set({
          stories: seedStories,
          photos: seedPhotos,
          chat: seedChat,
          timeline: seedTimeline,
          videoClips: [],
          memoryArticles: [],
        }),
    }),
    {
      name: "ai-time-mailbox-v1",
      version: 1,
    },
  ),
);
