export const generateQrCode = async (qrContent: string, description: string): Promise<Blob> => {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-imports */
  const qrCode: typeof import('qrcode') = await import('qrcode');

  const qrDataUrl = await qrCode.toDataURL(qrContent, {
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // Create canvas to add text at the bottom
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load QR code image
  const qrImage = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = reject;
    qrImage.src = qrDataUrl;
  });

  // Calculate optimal font size to fit the QR code width
  const maxWidth = qrImage.width * 0.95; // Use 95% of QR code width
  const minFontSize = 14;
  const maxFontSize = 28;
  let fontSize = maxFontSize;

  // Find the largest font size that fits
  ctx.textAlign = 'center';
  for (let size = maxFontSize; size >= minFontSize; size--) {
    ctx.font = `bold ${size}px Arial`;
    const metrics = ctx.measureText(description);
    if (metrics.width <= maxWidth) {
      fontSize = size;
      break;
    }
  }

  // Calculate text height needed
  const textHeight = fontSize + 30; // Font size + padding

  // Set canvas size (QR code + dynamic text area at bottom)
  canvas.width = qrImage.width;
  canvas.height = qrImage.height + textHeight;

  // Fill background with white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw QR code at the top
  ctx.drawImage(qrImage, 0, 0);

  // Add text at the bottom with calculated font size
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${fontSize}px Arial`; // Reapply font after canvas resize
  ctx.textAlign = 'center';
  ctx.fillText(description, canvas.width / 2, qrImage.height + (textHeight / 2) + (fontSize / 3));

  // Convert canvas to blob and download
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });

  return blob;
};
