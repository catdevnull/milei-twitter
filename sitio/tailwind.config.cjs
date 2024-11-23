const defaultTheme = require("tailwindcss/defaultTheme");
const { addDynamicIconSelectors } = require("@iconify/tailwind");

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

      animation: {
        marquee: "marquee var(--duration, 25s) linear infinite",
        "marquee-vertical":
          "marquee-vertical var(--duration, 25s) linear infinite",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
    },
  },

  plugins: [require("@tailwindcss/typography"), addDynamicIconSelectors()],
};

module.exports = config;
