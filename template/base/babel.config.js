module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NativeWind v5 通过 Metro 集成处理 className 导入改写，
    // 不再需要 v4 时代的 'nativewind/babel' 预设。
  };
};
