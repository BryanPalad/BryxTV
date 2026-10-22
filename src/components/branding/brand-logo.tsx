import Image from "next/image";

/** Lossless approved artwork; intrinsic dimensions preserve the full wordmark. */
export function BrandLogo() {
  return (
    <Image
      src="/branding/bryxtv-logo.webp"
      alt="BryxTV"
      width={640}
      height={170}
      className="brand-logo"
      unoptimized
    />
  );
}
