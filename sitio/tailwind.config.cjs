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
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};

module.exports = config;
