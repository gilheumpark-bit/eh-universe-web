// ============================================================
// Code Studio — Device Frames for Preview
// ============================================================

export interface DeviceFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'phone' | 'tablet' | 'desktop' | 'watch';
  bezelRadius: number;
  statusBarHeight: number;
  scale: number;
}

export const DEVICE_FRAMES: DeviceFrame[] = [
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, category: 'phone', bezelRadius: 47, statusBarHeight: 54, scale: 1 },
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', width: 430, height: 932, category: 'phone', bezelRadius: 55, statusBarHeight: 54, scale: 1 },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, category: 'phone', bezelRadius: 0, statusBarHeight: 20, scale: 1 },
  { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, category: 'phone', bezelRadius: 28, statusBarHeight: 48, scale: 1 },
  { id: 'galaxy-s24', name: 'Galaxy S24', width: 360, height: 780, category: 'phone', bezelRadius: 25, statusBarHeight: 40, scale: 1 },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, category: 'tablet', bezelRadius: 18, statusBarHeight: 24, scale: 1 },
  { id: 'ipad-mini', name: 'iPad mini', width: 744, height: 1133, category: 'tablet', bezelRadius: 18, statusBarHeight: 24, scale: 1 },
  { id: 'macbook-14', name: 'MacBook Pro 14"', width: 1512, height: 982, category: 'desktop', bezelRadius: 10, statusBarHeight: 0, scale: 1 },
  { id: 'desktop-1080', name: 'Desktop 1080p', width: 1920, height: 1080, category: 'desktop', bezelRadius: 0, statusBarHeight: 0, scale: 1 },
  { id: 'desktop-1440', name: 'Desktop 1440p', width: 2560, height: 1440, category: 'desktop', bezelRadius: 0, statusBarHeight: 0, scale: 1 },
];

export function getFrame(id: string): DeviceFrame | undefined {
  return DEVICE_FRAMES.find((d) => d.id === id);
}

export function getFramesByCategory(category: DeviceFrame['category']): DeviceFrame[] {
  return DEVICE_FRAMES.filter((d) => d.category === category);
}

export function getFrameCSS(frame: DeviceFrame, containerScale = 0.5): {
  width: string;
  height: string;
  borderRadius: string;
  transform: string;
} {
  return {
    width: `${frame.width}px`,
    height: `${frame.height}px`,
    borderRadius: `${frame.bezelRadius}px`,
    transform: `scale(${containerScale * frame.scale})`,
  };
}

// IDENTITY_SEAL: role=DeviceFrames | inputs=none | outputs=DeviceFrame[]
