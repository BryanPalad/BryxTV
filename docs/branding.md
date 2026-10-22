# BryxTV approved logo assets

The original supplied artwork is preserved at `public/branding/bryxtv-logo-reference.png` for reference only. It is not rendered as a header or footer logo.

- `bryxtv-logo.png`: native-resolution, tightly cropped transparent full-logo master (1275 × 338).
- `bryxtv-logo.webp`: lossless web derivative (640 × 170), displayed at 128px on desktop, 112px on tablet, and 120px on mobile; sufficient detail for Retina displays.
- `bryxtv-icon.png` and `.webp`: transparent icon-only B/play cutout, from the same artwork as the full logo.
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-192.png`, `favicon-512.png`: square icon derivatives with safe margins.
- `src/app/favicon.ico`: multi-resolution 16/32/48px favicon using Next.js's file convention.
- `apple-touch-icon.png`: 180px icon on the site's Midnight Blue background, avoiding automatic black transparency flattening on Apple devices.

The reusable `BrandLogo` component uses Next.js Image with intrinsic dimensions. The lossless WebP is served without lossy recompression to retain the original white lettering and blue gradients. Header heights remain 76px desktop and 64px mobile.

Image preparation used the built-in imagegen workflow for transparent extraction drafts, followed by cleanup/cropping and web-format preparation against the source artwork. Drafts with edge artifacts were rejected; the final cutout retains the supplied artwork's pixels and letterforms rather than retyping or substituting a font. No approximate SVG recreation is used.

Extraction prompt: “Extract the same full horizontal BryxTV logo onto genuine transparency. Remove only the navy background and detached floor glow. Preserve the original B/play emblem, internal fold, typography, spacing, blue/cyan gradients, and white/blue wordmark. Keep clean antialiased edges; do not redesign or recolor.”
