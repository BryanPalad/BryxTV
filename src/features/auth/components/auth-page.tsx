import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RouteTransition } from "@/components/layout/route-transition";
import { BrandLogo } from "@/components/branding/brand-logo";
export function AuthPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <RouteTransition>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader active="Home" />
      <main id="main" className="auth-page">
        <section className="auth-panel" aria-labelledby="auth-heading">
          <Link href="/" className="brand auth-brand" aria-label="BryxTV home">
            <BrandLogo />
          </Link>
          <h1 id="auth-heading">{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </section>
      </main>
      <SiteFooter />
    </RouteTransition>
  );
}
