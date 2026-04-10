/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050B14",
        surface: "#0A1221",
        "surface-container": "#111B2F",
        primary: "#00A3FF",
        secondary: "#00E5FF",
        accent: "#007BFF",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    }
  },
  plugins: []
};
