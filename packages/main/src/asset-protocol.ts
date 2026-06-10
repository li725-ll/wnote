export function filePathFromAssetUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "wnote-asset:") throw new Error("Unsupported asset URL protocol");

  if (url.hostname === "local") {
    return decodeURIComponent(url.pathname.replace(/^\//, ""));
  }

  const legacyPath = decodeURIComponent(url.pathname);
  if (/^[a-z]$/i.test(url.hostname) && legacyPath.startsWith("/")) {
    return `${url.hostname}:${legacyPath}`;
  }
  return legacyPath;
}

export function assetMimeFromPath(filePath: string): string {
  const ext = filePath
    .split(/[./\\]/)
    .pop()
    ?.toLowerCase();
  switch (ext) {
    case "apng":
      return "image/apng";
    case "avif":
      return "image/avif";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
