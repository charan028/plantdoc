import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        moss: "#4f7c50",
        pine: "#264b2f",
        sand: "#f3e9d2",
        bark: "#70553a"
      }
    }
  },
  plugins: []
};

export default config;
