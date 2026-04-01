import html2canvas from 'html2canvas';

/**
 * Capture a DOM element as a PNG blob.
 */
export async function captureElement(element: HTMLElement): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0a', // dark bg
      scale: 2, // retina
      useCORS: true,
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
    });
  } catch (err) {
    console.error('[Share] Capture error:', err);
    return null;
  }
}

/**
 * Share an image blob (with Web Share API fallback to download).
 */
export async function shareImage(blob: Blob, title: string, text?: string): Promise<void> {
  const file = new File([blob], 'progress.png', { type: 'image/png' });

  // Try Web Share API with files
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: text || title,
        files: [file],
      });
      return;
    } catch (err) {
      // User cancelled or error — fall through to download
      if ((err as Error).name === 'AbortError') return;
      console.warn('[Share] Web Share failed, falling back to download:', err);
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `progress-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Capture a DOM element and share it.
 */
export async function captureAndShare(
  element: HTMLElement,
  title: string,
  text?: string,
): Promise<boolean> {
  const blob = await captureElement(element);
  if (!blob) return false;
  await shareImage(blob, title, text);
  return true;
}
