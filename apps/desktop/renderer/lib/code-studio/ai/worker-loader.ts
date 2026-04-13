export const createWebGpuWorker = () => {
    return new Worker(new URL('./webgpu-worker.ts', import.meta.url), { type: 'module' });
};

export const createICoreWorker = () => {
    return new Worker(new URL('./i-core-worker', import.meta.url), { type: 'module' });
};
