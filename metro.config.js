const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for TFLite files
config.resolver.assetExts.push('tflite');

module.exports = config;