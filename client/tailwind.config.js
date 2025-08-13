/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { kh: ['"Noto Sans Khmer"','ui-sans-serif','system-ui'] },
      boxShadow: { soft: "0 6px 24px rgba(15,23,42,0.06)" }
    },
  },
  plugins: [],
}
