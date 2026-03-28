// ============================================================
// Code Studio — Image Input
// ============================================================
// 클립보드에서 이미지 붙여넣기, base64 변환, AI 컨텍스트용 리사이즈, 드래그앤드롭.

export interface ProcessedImage {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  originalSize: number;
  resizedSize: number;
}

const MAX_DIMENSION = 1024;
const MAX_SIZE_BYTES = 500_000; // 500KB for AI context

/** Handle paste event and extract image if present */
export async function handleImagePaste(event: ClipboardEvent): Promise<ProcessedImage | null> {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      return processImageFile(file);
    }
  }

  return null;
}

/** Handle image drag-drop */
export async function handleImageDrop(event: DragEvent): Promise<ProcessedImage | null> {
  const files = event.dataTransfer?.files;
  if (!files) return null;

  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      return processImageFile(file);
    }
  }

  return null;
}

/** Process a File object into base64 with resizing */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });

  // Create image to get dimensions
  const img = await createImageBitmap(blob);
  let { width, height } = img;

  // Resize if needed
  let base64: string;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || originalSize > MAX_SIZE_BYTES) {
    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(img, 0, 0, width, height);

    const resizedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    base64 = await blobToBase64(resizedBlob);
  } else {
    base64 = await blobToBase64(blob);
  }

  return {
    base64,
    mimeType: file.type,
    width,
    height,
    originalSize,
    resizedSize: Math.ceil(base64.length * 0.75), // approximate decoded size
  };
}

/** Convert Blob to base64 data URL */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/** Extract base64 data from data URL (strip prefix) */
export function extractBase64Data(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { data: dataUrl, mimeType: 'image/png' };
  return { data: match[2], mimeType: match[1] };
}

/** Check if a string looks like a base64 image data URL */
export function isImageDataUrl(str: string): boolean {
  return /^data:image\/[a-z]+;base64,/.test(str);
}

// IDENTITY_SEAL: role=ImageInput | inputs=ClipboardEvent,DragEvent,File | outputs=ProcessedImage
