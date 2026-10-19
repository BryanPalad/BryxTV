"use client";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CatalogTitle } from "@/types/catalog";
export function MovieCard({
  title,
  index,
}: {
  title: CatalogTitle;
  index: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="movie-card group"
            aria-label={`View details for ${title.title}`}
          >
            <div className="poster">
              <Image
                src={title.artwork}
                alt={`Illustrated landscape for ${title.title}`}
                width={600}
                height={900}
              />
              <span className="poster-tag">{title.category}</span>
              <span className="card-open">
                <ArrowUpRight aria-hidden="true" size={22} />
              </span>
            </div>
            <h3>{title.title}</h3>
            <p>
              {title.year}
              <span>·</span>
              {title.genre}
              <span className="rating">{title.rating}</span>
            </p>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title.title}</DialogTitle>
            <DialogDescription>
              {title.year} · {title.category} · {title.rating}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-7 text-muted-foreground">
            {title.description}
          </p>
          <Button disabled>Playback coming in a future release</Button>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}
