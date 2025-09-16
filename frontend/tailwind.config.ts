import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          background: "#0d0f1a",
          surface: "#15182a",
          accent: "#1f74ff",
          accentMuted: "#2d7dff",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(31, 116, 255, 0.75)",
      },
    },
  },
  plugins: [typography],
};

export default config;
