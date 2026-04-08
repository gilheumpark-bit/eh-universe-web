module.exports = {
  mainSrcDir: 'main',
  rendererSrcDir: 'renderer',
  webpack: (config) => {
    // Ensure the main process entry is our TS main.
    config.entry = { main: './main/main.ts' }
    return config
  },
}

