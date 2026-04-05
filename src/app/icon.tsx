import { ImageResponse } from 'next/og';
import { EhUniverseHybridIcon } from './_brand/ehUniverseHybridIcon';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <EhUniverseHybridIcon size={size.width} />,
    { ...size },
  );
}
