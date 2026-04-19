module.exports = function (api) {
  api.cache(true);
  return {
    // SDK 55 + NativeWind v4: babel-preset-expo handles the className transform
    // itself when given jsxImportSource: 'nativewind'. The standalone
    // `nativewind/babel` preset (from v2/v3) is no longer needed and would
    // double-register the transform.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
  };
};
