module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "turbo",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "react-hooks"],
  parser: "@typescript-eslint/parser",
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn"],
    "no-unused-vars": "off",
  },
};
