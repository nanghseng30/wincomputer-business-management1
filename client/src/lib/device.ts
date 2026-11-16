export type DeviceType = "phone" | "tablet" | "laptop" | "desktop";
export function getBrowserDevice(): { type: DeviceType; label: string } {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  if (
    /ipad|tablet|android(?!.*mobile)/i.test(ua) ||
    (width >= 600 && width < 1024)
  )
    return { type: "tablet", label: "Tablet" };
  if (/mobi|iphone|ipod|android/i.test(ua) || width < 600)
    return { type: "phone", label: "Phone" };
  if (/macintosh|windows nt|cros/i.test(ua))
    return { type: "laptop", label: "Laptop / PC" };
  return { type: "desktop", label: "Desktop" };
}
