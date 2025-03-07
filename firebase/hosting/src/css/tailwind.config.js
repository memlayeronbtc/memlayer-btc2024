module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        hkgrotesk: ["HK Grotesk", "sans-serif"],
        bangers: ["Bangers"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5715" }],
        base: ["1rem", { lineHeight: "1.5", letterSpacing: "0.03em" }],
        lg: ["1.125rem", { lineHeight: "1.5", letterSpacing: "0.03em" }],
        xl: ["1.25rem", { lineHeight: "1.5", letterSpacing: "0.03em" }],
        "2xl": ["1.5rem", { lineHeight: "1.415", letterSpacing: "0.03em" }],
        "3xl": ["1.875rem", { lineHeight: "1.333", letterSpacing: "0.03em" }],
        "4xl": ["2.25rem", { lineHeight: "1.277", letterSpacing: "0.03em" }],
        "5xl": ["3rem", { lineHeight: "1.2", letterSpacing: "0.03em" }],
        "6xl": ["3.75rem", { lineHeight: "1", letterSpacing: "0.03em" }],
        "7xl": ["5rem", { lineHeight: "1", letterSpacing: "0.03em" }],
      },
      letterSpacing: {
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.01em",
        wider: "0.02em",
        widest: "0.4em",
      },
    },
  },
  plugins: [
    // eslint-disable-next-line global-require
    require("@tailwindcss/forms"),
  ],
};
