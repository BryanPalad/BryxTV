import type { NextConfig } from "next";
import { playbackFrameOrigins, playbackMediaOrigins } from "./src/features/playback/providers/registry";
const nextConfig: NextConfig = {
  // OAuth callbacks contain short-lived codes; omit them from dev access logs.
  logging: {
    incomingRequests: { ignore: [/\/api\/auth\/callback(?:\/|\?|$)/] },
  },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    const policy = [
      "default-src 'self'",
      // Next's inline hydration scripts and the player's inline styles require these.
      `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://image.tmdb.org https://*.googleusercontent.com",
      "font-src 'self'",
      `media-src 'self' blob: ${playbackMediaOrigins.join(" ")}`,
      `connect-src 'self' ${playbackMediaOrigins.join(" ")}${development ? " ws: wss:" : ""}`,
      "worker-src 'self' blob:",
      `frame-src ${playbackFrameOrigins.join(" ") || "'none'"}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: policy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/playback/:path*.m3u8",
        headers: [
          { key: "Content-Type", value: "application/vnd.apple.mpegurl" },
        ],
      },
      {
        source: "/playback/:path*.m4s",
        headers: [{ key: "Content-Type", value: "video/iso.segment" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
        search: "",
      },
    ],
  },
};
export default nextConfig;
