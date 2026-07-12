import { useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Save,
  RefreshCw,
  ScanLine,
  Camera,
  CheckCircle2,
} from "lucide-react";
import Layout from "@/components/Layout";
import SectionTitle from "@/components/SectionTitle";
import PhotoFrame from "@/components/PhotoFrame";
import Postmark from "@/components/Postmark";
import { useStore } from "@/store/useStore";
import {
  analyzePhoto,
  formatPhotoForStream,
  streamText,
  type PhotoAnalysis,
} from "@/lib/ai";
import { cn } from "@/lib/utils";

export default function Photos() {
  const addPhoto = useStore((s) => s.addPhoto);
  const addTimelineNode = useStore((s) => s.addTimelineNode);
  const photos = useStore((s) => s.photos);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "scanning" | "streaming" | "done">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [streamedText, setStreamedText] = useState("");
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setFileName(file.name);
      setPhase("idle");
      setAnalysis(null);
      setStreamedText("");
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  async function analyze() {
    if (!imageUrl || phase !== "idle") return;
    setPhase("scanning");
    setProgress(0);

    // 模拟识别进度
    for (let p = 0; p <= 100; p += 4) {
      setProgress(p);
      await new Promise((r) => setTimeout(r, 60));
    }

    const result = analyzePhoto();
    setAnalysis(result);
    setPhase("streaming");
    setStreamedText("");

    abortRef.current = new AbortController();
    await streamText(
      formatPhotoForStream(result),
      {
        onChunk: (partial) => setStreamedText(partial),
        onDone: () => setPhase("done"),
        signal: abortRef.current.signal,
      },
      { speed: 26, jitter: 16 },
    );
  }

  function save() {
    if (!analysis || !imageUrl) return;
    const photo = addPhoto({
      url: imageUrl,
      aiDescription: analysis.description,
      memory: analysis.memory,
      era: analysis.era,
    });
    addTimelineNode({
      stage: "家庭",
      title: fileName ? `一张老照片 · ${analysis.era}` : `老照片 · ${analysis.era}`,
      date: new Date().getFullYear().toString(),
      photoId: photo.id,
    });
    setSaved(true);
  }

  function reset() {
    abortRef.current?.abort();
    setImageUrl(null);
    setFileName("");
    setAnalysis(null);
    setStreamedText("");
    setPhase("idle");
    setSaved(false);
  }

  return (
    <Layout>
      <SectionTitle
        eyebrow="老照片 · AI 解读"
        title="贴一张老照片，让 AI 替您回忆"
        subtitle="挑一张您珍藏多年的老照片，小光会看图说话，写下一段专属于您的回忆文字，再一起收进家庭档案。"
      />

      <div className="mt-10 grid lg:grid-cols-2 gap-8">
        {/* 左：上传 + 预览 */}
        <div className="paper-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <Camera className="text-ochre-600" size={26} />
            <h3 className="font-display text-2xl text-ink-800">您的老照片</h3>
          </div>

          {!imageUrl ? (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-ochre-500/40 rounded-3xl py-16 px-6 text-center cursor-pointer hover:bg-paper-200/40 hover:border-ochre-500 transition-all group"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gold-500/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="text-ochre-600" size={36} />
              </div>
              <p className="font-display text-2xl text-ink-800 mb-2">
                把照片拖到这里
              </p>
              <p className="text-base text-ink-700/70 font-serif">
                或者点一下，从相册里挑一张
              </p>
              <p className="mt-3 text-xs text-ink-700/50 font-serif">
                支持 JPG / PNG · 照片只存在您本地浏览器里
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <PhotoFrame
                src={imageUrl}
                alt={fileName || "老照片"}
                caption={fileName || "您上传的老照片"}
                rotate={-2}
              />
              <button
                onClick={reset}
                className="btn-ghost text-base !py-2"
              >
                <RefreshCw size={16} />
                换一张
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {imageUrl && phase === "idle" && (
            <button onClick={analyze} className="btn-primary mt-6 w-full">
              <Sparkles size={20} />
              让小光解读这张照片
            </button>
          )}
        </div>

        {/* 右：AI 解读结果 */}
        <div className="paper-card p-6 md:p-8 relative overflow-hidden min-h-[480px]">
          <div className="absolute -top-4 -right-4 opacity-30">
            <Postmark size="md" rotate={14}>
              <span className="text-[10px] leading-tight text-center">
                AI
                <br />
                解读
              </span>
            </Postmark>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="text-ochre-600" size={26} />
            <h3 className="font-display text-2xl text-ink-800">小光的解读</h3>
          </div>

          {phase === "idle" && !analysis && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-paper-200/70 flex items-center justify-center mb-4">
                <ImageIcon className="text-ochre-500/60" size={36} />
              </div>
              <p className="text-lg text-ink-700/70 font-serif">
                解读结果会出现在这里。
                <br />
                您先上传一张老照片。
              </p>
            </div>
          )}

          {phase === "scanning" && (
            <div className="py-10">
              <div className="relative w-full aspect-video bg-paper-200/50 rounded-2xl overflow-hidden mb-6">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="识别中"
                    className="w-full h-full object-cover filter-vintage-strong opacity-80"
                  />
                )}
                {/* 扫描线 */}
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent shadow-[0_0_20px_4px_rgba(217,164,65,0.5)]"
                  style={{
                    top: `${progress}%`,
                    transition: "top 60ms linear",
                  }}
                />
                <div className="absolute inset-0 bg-ochre-600/10" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-paper-50">
                  <span className="inline-flex items-center gap-2 font-serif text-sm bg-ink-900/60 px-3 py-1 rounded-full">
                    <ScanLine size={14} />
                    正在识别画面…
                  </span>
                  <span className="font-latin text-2xl text-gold-400">
                    {progress}%
                  </span>
                </div>
              </div>
              <p className="text-center text-base text-ink-700/70 font-serif">
                小光正在看清照片里的每一个细节…
              </p>
            </div>
          )}

          {(phase === "streaming" || phase === "done") && analysis && (
            <div className="space-y-5">
              {phase === "streaming" ? (
                <pre className="font-serif text-lg text-ink-800 leading-relaxed whitespace-pre-wrap font-[inherit]">
                  {streamedText}
                  <span className="inline-block w-1 h-5 ml-0.5 bg-ochre-500/70 animate-pulse align-middle" />
                </pre>
              ) : (
                <PhotoResultCard
                  analysis={analysis}
                  saved={saved}
                  onSave={save}
                  onReset={reset}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 已收藏的照片墙 */}
      {photos.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
            <h3 className="font-display text-2xl md:text-3xl text-ink-800">
              相册里已收录的照片
            </h3>
            <span className="text-base text-ink-700/70 font-serif">
              共 {photos.length} 张
            </span>
          </div>
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {photos.slice(0, 8).map((p, i) => (
              <PhotoFrame
                key={p.id}
                src={p.url}
                alt={p.aiDescription}
                caption={p.era}
                rotate={i % 2 === 0 ? -3 : 2.5}
                className="w-40 md:w-48"
              />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

// ============================================================
// 照片解读结果卡片
// ============================================================
function PhotoResultCard({
  analysis,
  saved,
  onSave,
  onReset,
}: {
  analysis: PhotoAnalysis;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <span className="eyebrow mb-2">
          <ScanLine size={14} />
          画面解读
        </span>
        <p className="font-serif text-lg text-ink-800 leading-relaxed mt-1">
          {analysis.description}
        </p>
      </div>

      <div className="paper-card !shadow-warm-inset p-4 bg-gold-500/5">
        <span className="eyebrow mb-1 text-gold-600">
          <Camera size={14} />
          年代推测
        </span>
        <p className="font-display text-2xl text-ochre-600">{analysis.era}</p>
      </div>

      <div>
        <span className="eyebrow mb-2">
          <Sparkles size={14} />
          为您写下的回忆
        </span>
        <p className="font-serif text-lg text-ink-800 leading-relaxed mt-1 italic">
          「{analysis.memory}」
        </p>
      </div>

      <div className="pt-5 border-t border-ochre-500/15 flex items-center gap-3 flex-wrap">
        {saved ? (
          <span className="inline-flex items-center gap-2 text-sage-600 font-serif text-lg">
            <CheckCircle2 size={20} />
            已收入家庭档案
          </span>
        ) : (
          <button onClick={onSave} className="btn-primary">
            <Save size={20} />
            收入家庭档案
          </button>
        )}
        <button onClick={onReset} className="btn-ghost">
          <RefreshCw size={18} />
          换一张
        </button>
      </div>
    </div>
  );
}
