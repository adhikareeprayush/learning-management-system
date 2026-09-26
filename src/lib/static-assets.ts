import { imagekitAsset } from "@/lib/imagekit-url";

/** Resolved marketing/static asset URLs (ImageKit in production, local `/images` in dev). */
export const staticAssets = {
  heroWoman: imagekitAsset("/images/hero/woman.png"),
} as const;
