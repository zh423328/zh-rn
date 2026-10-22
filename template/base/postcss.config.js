// Tailwind CSS v4 通过 PostCSS 插件接入。
// Expo 会自动发现 postcss.config.js，无需额外在 metro.config.js 中注册。
// 注意：文件名必须是 postcss.config.js 或 postcss.config.mjs，不能是 .cjs。
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
