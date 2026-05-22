/** HTTP başlıkları yalnızca ASCII kabul eder; Türkçe dosya adı için filename* kullanılır. */
export function contentDisposition(
  filename: string,
  disposition: "inline" | "attachment" = "inline"
): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 180) || "bilet.png";
  const utf8 = encodeURIComponent(filename);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
