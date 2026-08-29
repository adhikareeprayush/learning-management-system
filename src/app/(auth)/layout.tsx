import { Logo } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-hero-gradient lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,229,202,0.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo inverted />
          <div>
            <h1 className="font-display text-4xl leading-tight">
              Good coaching is good teaching.
            </h1>
            <p className="mt-4 max-w-md text-white/75">
              Sign in to continue your learning path on Edujarr.
            </p>
          </div>
          <p className="text-sm text-white/50">Edujarr LMS</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
