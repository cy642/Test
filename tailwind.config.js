/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        lg: "2rem",
      },
    },
    extend: {
      colors: {
        // 暖色主题 token
        paper: {
          50: "#FBF6EC",   // 最浅信纸
          100: "#F8F1E5",  // 信纸主背景
          200: "#F1E4CC",  // 浅米
          300: "#E6D2B0",  // 麦秆
        },
        ochre: {
          400: "#D08760",
          500: "#B5673E",  // 主色 深赭石
          600: "#9A5230",  // 漆封
          700: "#7C3F25",
        },
        sage: {
          400: "#7C9689",
          500: "#5E7A6B",  // 辅色 墨绿
          600: "#4A6155",
        },
        gold: {
          400: "#E6B85C",
          500: "#D9A441",  // 点缀 暮金
          600: "#B8852A",
        },
        ink: {
          700: "#5A4239",
          800: "#3A2A22",  // 文字主色 暖棕黑
          900: "#241813",
        },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', '"Ma Shan Zheng"', "serif"],
        brush: ['"Ma Shan Zheng"', "serif"],
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        latin: ['"DM Serif Display"', "serif"],
      },
      fontSize: {
        // 老年友好的基础字号
        base: ["1.125rem", "1.8"],   // 18px
        lg: ["1.25rem", "1.75"],
        xl: ["1.5rem", "1.7"],
        "2xl": ["1.875rem", "1.6"],
        "3xl": ["2.25rem", "1.5"],
        "4xl": ["3rem", "1.4"],
        "5xl": ["3.75rem", "1.3"],
      },
      boxShadow: {
        warm: "0 10px 30px -10px rgba(122, 75, 43, 0.25), 0 4px 10px -4px rgba(122, 75, 43, 0.15)",
        "warm-lg": "0 25px 60px -15px rgba(122, 75, 43, 0.35), 0 10px 25px -8px rgba(122, 75, 43, 0.2)",
        "warm-inset": "inset 0 2px 8px -2px rgba(122, 75, 43, 0.2)",
        stamp: "0 2px 0 rgba(122,75,43,0.15), 0 6px 18px -6px rgba(122,75,43,0.3)",
        photo: "0 4px 12px -2px rgba(60,40,30,0.35), 0 12px 32px -8px rgba(60,40,30,0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      backgroundImage: {
        "paper-grain":
          "radial-gradient(circle at 1px 1px, rgba(122,75,43,0.06) 1px, transparent 0)",
        "warm-glow":
          "radial-gradient(ellipse at top, rgba(217,164,65,0.18), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "stamp-press": {
          "0%": { transform: "scale(0.6) rotate(-25deg)", opacity: "0" },
          "60%": { transform: "scale(1.08) rotate(-10deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-12deg)", opacity: "1" },
        },
        "flap-open": {
          "0%": { transform: "rotateX(0deg)" },
          "100%": { transform: "rotateX(180deg)" },
        },
        "float-soft": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "wave": {
          "0%,100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "march": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "14" },
        },
        "frame-in": {
          "0%": { opacity: "0", transform: "scale(0.9) rotate(0deg)" },
          "60%": { opacity: "1", transform: "scale(1.03) rotate(-1.5deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-2deg)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scan-brightness": {
          "0%, 100%": { filter: "brightness(1) sepia(0.55) saturate(0.75) contrast(1.08)" },
          "50%": { filter: "brightness(1.2) sepia(0.55) saturate(0.75) contrast(1.08)" },
        },
        "subtitle-fade": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "15%": { opacity: "1", transform: "translateY(0)" },
          "85%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-8px)" },
        },
        "hat-wobble": {
          "0%,100%": { transform: "rotate(-3deg)" },
          "25%": { transform: "rotate(3deg)" },
          "50%": { transform: "rotate(-2deg)" },
          "75%": { transform: "rotate(2deg)" },
        },
        "photo-reveal": {
          "0%": { opacity: "0", filter: "blur(20px)" },
          "100%": { opacity: "1", filter: "blur(0px)" },
        },
        "ripple": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "underline-in": {
          "0%": { backgroundSize: "0% 2px" },
          "100%": { backgroundSize: "100% 2px" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.8s ease-out both",
        "stamp-press": "stamp-press 0.8s cubic-bezier(0.34,1.56,0.64,1) both",
        "float-soft": "float-soft 4s ease-in-out infinite",
        "wave": "wave 1s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "march": "march 0.6s linear infinite",
        "frame-in": "frame-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up": "slide-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "scan-brightness": "scan-brightness 2s ease-in-out infinite",
        "subtitle-fade": "subtitle-fade 3.6s ease-in-out both",
        "hat-wobble": "hat-wobble 1.2s ease-in-out infinite",
        "photo-reveal": "photo-reveal 0.8s ease-out both",
        "ripple": "ripple 1.8s ease-out infinite",
        "underline-in": "underline-in 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
