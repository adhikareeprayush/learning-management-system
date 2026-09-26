import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getInstituteProfile } from "@/lib/institute";

// No segment-wide `dynamic` here: pages that read the session or search params
// render per request on their own, while faq/privacy/terms can be prerendered.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const institute = await getInstituteProfile();

  return (
    <>
      <Navbar brandName={institute.name} logoUrl={institute.logoUrl} />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      <Footer institute={institute} />
    </>
  );
}
