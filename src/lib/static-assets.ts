import { imagekitAsset } from "@/lib/imagekit-url";

/** Resolved marketing/static asset URLs (ImageKit in production, local `/images` in dev). */
export const staticAssets = {
  heroWoman: imagekitAsset("/images/hero/woman.png"),
  videoCover: imagekitAsset("/images/about/video.jpg"),
  aboutCollage: imagekitAsset("/images/about/collage.png"),
  partners: [
    imagekitAsset("/images/partners/1.png"),
    imagekitAsset("/images/partners/2.png"),
    imagekitAsset("/images/partners/3.png"),
    imagekitAsset("/images/partners/4.png"),
    imagekitAsset("/images/partners/5.png"),
    imagekitAsset("/images/partners/6.png"),
  ],
  courses: [
    imagekitAsset("/images/courses/1.png"),
    imagekitAsset("/images/courses/2.png"),
    imagekitAsset("/images/courses/3.png"),
    imagekitAsset("/images/courses/4.png"),
    imagekitAsset("/images/courses/5.png"),
    imagekitAsset("/images/courses/6.png"),
  ],
  testimonials: [
    imagekitAsset("/images/testimonials/1.png"),
    imagekitAsset("/images/testimonials/2.png"),
    imagekitAsset("/images/testimonials/3.png"),
  ],
  logoRaster: imagekitAsset("/images/logo/mark-raster.png"),
} as const;
