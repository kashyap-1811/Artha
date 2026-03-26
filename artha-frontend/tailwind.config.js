/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        handwritten: ["'Outfit'", "sans-serif"], // I'll use Outfit as a placeholder if 'handwritten' font isn't explicitly provided, or user can load one
      },
    },
  },
  plugins: [],
}
