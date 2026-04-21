/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#06111E",
        surface: "#0D1A2E",
        "surface-container": "#12233D",
        primary: "#00A3FF",
        secondary: "#00E5FF",
        accent: "#34D399"
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};
