"use client";

import { useState } from "react";
import { googleAvatarURL } from "@/lib/auth/google";

export function ProfileAvatar({ name, image, compact = false }: { name: string; image?: string | null; compact?: boolean }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const avatar = googleAvatarURL(image);
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((word) => Array.from(word)[0]).join("").toUpperCase();
  return (
    <div className={compact ? "account-avatar" : "profile-avatar"} aria-label={`Profile picture for ${name}`}>
      {avatar && failedImage !== avatar ? (
        // Google hosts these small avatars directly; no image proxy or resizing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" width={compact ? 34 : 72} height={compact ? 34 : 72}
          referrerPolicy="no-referrer" onError={() => setFailedImage(avatar)} />
      ) : initials || "B"}
    </div>
  );
}
