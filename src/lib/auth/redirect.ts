/** Only known local browsing routes may be used after authentication. */
export function safeReturnTo(value: unknown): string {
  const fallback = "/profile";
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://bryxtv.invalid");
    if (url.origin !== "https://bryxtv.invalid") return fallback;
    const path = decodeURIComponent(url.pathname);
    if (
      !/^\/(?:|profile|my-list|history|movies|tv|disney|anime|k-drama|search|credits|demos|(?:movie|tv)\/[1-9]\d*|watch\/(?:movie|tv)\/[1-9]\d*|watch\/demo\/[a-z0-9-]+|title\/[a-zA-Z0-9:-]+)$/.test(
        path,
      )
    )
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
