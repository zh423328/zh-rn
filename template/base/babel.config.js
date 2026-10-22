module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NativeWind v5 由 Metro 集成处理 className 改写，
    // 不再需要 v4 时代的 'nativewind/babel' 预设与 jsxImportSource。
  };
};
