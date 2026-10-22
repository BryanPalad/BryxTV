"use client";

import { BrandLogo } from "@/components/branding/brand-logo";


import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  categories,
  categoryHref,
  type Category,
  site,
} from "@/constants/site";

export function MobileNavigation({ active }: { active: Category }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="icon-button mobile-menu-trigger"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
      </DialogTrigger>
      <DialogContent className="mobile-drawer">
        <DialogHeader>
          <DialogTitle className="brand">
            <BrandLogo />
          </DialogTitle>
          <DialogDescription>{site.tagline}</DialogDescription>
        </DialogHeader>
        <nav aria-label="Mobile navigation">
          {categories.map((category) => (
            <Link
              key={category}
              href={categoryHref(category)}
              aria-current={category === active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {category}
            </Link>
          ))}
        </nav>
        <p className="drawer-note">Your next great story starts here.</p>
      </DialogContent>
    </Dialog>
  );
}
