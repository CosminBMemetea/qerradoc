import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          dark: "#4338ca",
        },
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
