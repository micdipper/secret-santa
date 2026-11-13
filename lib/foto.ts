// Riduce una foto del telefono (che può pesare molti MB) a max 1200px in JPEG.
export async function riduciFoto(file: File): Promise<{ blob: Blob; rapporto: number }> {
  const img = await createImageBitmap(file);
  const scala = Math.min(1, 1200 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scala);
  c.height = Math.round(img.height * scala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.82));
  return { blob, rapporto: img.width / img.height };
}
