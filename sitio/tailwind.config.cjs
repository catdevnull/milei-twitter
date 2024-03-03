const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config}*/
const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
        gilroy: [
          '"Gilroy"',
          '"Inter Variable"',
          ...defaultTheme.fontFamily.sans,
        ],
      },
      dropShadow: {
        opinionPublica: "-12px 19px 0px #d83926",
        opinionPublicaAzul: "0px 0px 18px #5ea1b4",
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};

module.exports = config;
