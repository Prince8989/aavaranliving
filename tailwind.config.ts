import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#241C18",
        walnut: "#704D38",
        gold: "#B89B70",
        // Darker gold for text on light backgrounds (AA contrast on ivory)
        "gold-deep": "#7A6237",
        sandstone: "#E7D7C1",
        ivory: "#F6F0E7",
        ink: "#241C18",
        muted: "#6B5B50",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { label: "0.22em" },
      maxWidth: { site: "88rem" },
      transitionTimingFunction: { luxe: "cubic-bezier(0.22, 1, 0.36, 1)" },
    },
  },
  plugins: [],
};

export default config;
