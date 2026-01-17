import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // <-- AJOUTE CETTE LIGNE
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        neon: "var(--neon)",
        card: "var(--card-bg)",
        borderSoft: "var(--border-soft)",
        muted: "var(--muted)",
        soft: "var(--soft)",
      },
    },
  },
  plugins: [],
};

export default config;