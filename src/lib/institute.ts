import type { Metadata } from "next";
import { cache } from "react";
import { readOrganizationSettings } from "@/app/api/admin/organization/organization-settings";
import { getDefaultOrganization } from "@/lib/default-org";
import { parseMediaUrl } from "@/lib/media-url";

/** Product name shown when the institute record can't be read. */
export const PRODUCT_NAME = "Convolution LMS";

export type InstituteProfile = {
  name: string;
  /** Only URLs this app serves or uploaded (so the CSP and image optimizer allow them). */
  logoUrl: string | null;
  supportEmail: string | null;
  contactPhone: string | null;
};

const FALLBACK_PROFILE: InstituteProfile = {
  name: PRODUCT_NAME,
  logoUrl: null,
  supportEmail: null,
  contactPhone: null,
};

/**
 * Public branding for the default institute. Never throws: metadata, the site
 * chrome and statically rendered pages must still render when the database is
 * unreachable (e.g. during a build without DATABASE_URL).
 */
export const getInstituteProfile = cache(async (): Promise<InstituteProfile> => {
  try {
    const org = await getDefaultOrganization();
    if (!org) return FALLBACK_PROFILE;

    const settings = readOrganizationSettings(org);
    const logo = parseMediaUrl(settings.logoUrl, "image");
    return {
      name: settings.name.trim() || PRODUCT_NAME,
      logoUrl: logo.ok ? logo.url : null,
      supportEmail: settings.supportEmail || null,
      contactPhone: settings.contactPhone || null,
    };
  } catch (error) {
    console.warn(
      "[institute] falling back to default branding:",
      error instanceof Error ? error.message : error,
    );
    return FALLBACK_PROFILE;
  }
});

/**
 * Page-level share image. A page's `openGraph` replaces the root one wholesale,
 * so the site-wide fields are repeated; with no image the root card is kept.
 */
export async function shareImageMetadata(
  image: string | null | undefined,
  alt: string,
): Promise<Pick<Metadata, "openGraph">> {
  if (!image) return {};
  const { name } = await getInstituteProfile();
  return {
    openGraph: {
      type: "website",
      siteName: name,
      locale: "en_US",
      images: [{ url: image, alt }],
    },
  };
}

/**
 * Title for a dashboard section layout. A layout's own title drops the root
 * "%s · name" template for its nested pages, so the template is repeated.
 */
export async function sectionTitleMetadata(
  section: string,
): Promise<Pick<Metadata, "title">> {
  const { name } = await getInstituteProfile();
  return { title: { default: section, template: `%s · ${name}` } };
}
