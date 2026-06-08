/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'], // Usaremos Lato para todo el texto de datos
        heading: ['Poppins', 'sans-serif'], // Poppins solo para títulos
      },
      letterSpacing: {
        widest: '.025em', // Ligero respiro entre letras para evitar lo "compacto"
      }
    },
  },
  plugins: [],
}