/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0a1628",
          800: "#0f2240",
          700: "#162d50",
          600: "#1e3a5f",
          500: "#2a4a72"
        }
      }
    }
  },
  plugins: []
};
