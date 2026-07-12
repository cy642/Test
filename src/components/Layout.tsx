import type { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
  /** 是否启用容器与垂直内边距 */
  contained?: boolean;
}

export default function Layout({ children, contained = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {contained ? (
          <div className="container max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      <footer className="border-t border-ochre-500/15 bg-paper-100/60 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-ink-700/70 font-serif">
          <span>AI 时光信箱 · 写给未来的家书</span>
          <span className="tracking-widest">TRAE AI 创造力大赛 · 示意 Demo</span>
        </div>
      </footer>
    </div>
  );
}
