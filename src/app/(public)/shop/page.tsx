import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";

export default function ShopPage() {
  return (
    <div className="bg-[#fafbfc] pb-20">
      <PageHero
        eyebrow="Store"
        title={
          <>
            Shop <span className="text-brand-mint">coming later</span>
          </>
        }
        description="Merch and bundles aren't part of this portfolio build — learning is."
        icon={ShoppingBag}
      />
      <div className="mx-auto max-w-lg px-5 py-16 text-center md:px-10">
        <p className="text-muted leading-relaxed">
          The shop route exists in the nav for layout completeness. Focus on
          courses and roadmaps — that&apos;s where the real functionality lives.
        </p>
        <Button href="/courses" className="mt-8">
          Browse courses
        </Button>
      </div>
    </div>
  );
}
