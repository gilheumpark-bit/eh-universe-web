import { ImageResponse } from 'next/og';
import { EhUniverseHybridIcon } from './_brand/ehUniverseHybridIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <EhUniverseHybridIcon size={size.width} compact />,
    { ...size },
  );
}
