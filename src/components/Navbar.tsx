import { NavLink, Link } from "react-router-dom";
import {
  Home,
  MessageCircleHeart,
  BookHeart,
  Image,
  Clapperboard,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "信箱", icon: Home, end: true },
  { to: "/chat", label: "陪聊", icon: MessageCircleHeart },
  { to: "/story", label: "故事", icon: BookHeart },
  { to: "/photos", label: "照片", icon: Image },
  { to: "/video", label: "视频", icon: Clapperboard },
  { to: "/timeline", label: "档案", icon: Clock },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40">
      <div className="backdrop-blur-md bg-paper-100/80 border-b border-ochre-500/15">
        <nav className="container max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
          {/* 品牌 */}
          <Link
            to="/"
            className="flex items-center gap-3 group shrink-0"
            aria-label="返回首页"
          >
            <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-ochre-500 shadow-warm group-hover:shadow-warm-lg transition-shadow">
              <span className="font-display text-paper-50 text-xl">光</span>
            </span>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display text-xl text-ink-800">AI 时光信箱</span>
              <span className="text-xs text-ink-700/70 tracking-widest">
                TIME · MAILBOX
              </span>
            </div>
          </Link>

          {/* 导航 */}
          <ul className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-thin">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-2xl font-serif text-base md:text-lg transition-all duration-300 whitespace-nowrap",
                        isActive
                          ? "bg-ochre-500 text-paper-50 shadow-warm"
                          : "text-ink-800 hover:bg-paper-200/70",
                      )
                    }
                  >
                    <Icon size={20} strokeWidth={2.2} />
                    <span className="hidden md:inline">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
