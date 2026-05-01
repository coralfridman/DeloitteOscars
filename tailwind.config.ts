import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#161821",
        fog: "#F5F7FB",
        kahootRed: "#E53E3E",
        kahootBlue: "#2563EB",
        kahootYellow: "#F59E0B",
        kahootGreen: "#16A34A",
        deloitteGreen: "#86BC25"
      },
      boxShadow: {
        soft: "0 18px 48px rgba(18, 24, 38, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
