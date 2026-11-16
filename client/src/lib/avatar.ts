export async function compressAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/"))
    throw new Error("Please choose an image file.");
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The image could not be read."));
    };
    image.src = url;
  });
  const size = 320;
  const scale = Math.min(
    1,
    size / Math.max(source.naturalWidth, source.naturalHeight)
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  let quality = 0.78;
  let data = canvas.toDataURL("image/webp", quality);
  while (data.length > 58000 && quality > 0.46) {
    quality -= 0.08;
    data = canvas.toDataURL("image/webp", quality);
  }
  if (data.length > 60000)
    throw new Error("Please choose a smaller or simpler photo.");
  return data;
}
