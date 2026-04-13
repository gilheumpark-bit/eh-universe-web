module.exports = {
  mainSrcDir: 'main',
  rendererSrcDir: 'renderer',
  webpack: (config) => {
    // Ensure the main process entry is our TS main + preload.
    config.entry = {
      main: './main/main.ts',
      preload: './main/preload.ts',
    }
    return config
  },
}

