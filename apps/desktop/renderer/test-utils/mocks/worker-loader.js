module.exports = {
  createWebGpuWorker: () => ({ postMessage: () => {}, onmessage: null, terminate: () => {} }),
  createICoreWorker: () => ({ postMessage: () => {}, onmessage: null, terminate: () => {} })
};
