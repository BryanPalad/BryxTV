"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const [{ query, lastServerQuery }, setSearch] = useState({
    query: initialQuery,
    lastServerQuery: initialQuery,
  });
  const [composing, setComposing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // Keep browser back/forward in sync without remounting the focused input.
  if (lastServerQuery !== initialQuery) {
    setSearch((current) => ({
      query: current.query === lastServerQuery ? initialQuery : current.query,
      lastServerQuery: initialQuery,
    }));
  }
  function navigate(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    startTransition(() =>
      router.replace(
        normalized ? `/search?q=${encodeURIComponent(normalized)}` : "/search",
        { scroll: false },
      ),
    );
  }
  useEffect(() => {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized === initialQuery || composing) return;
    const timeout = setTimeout(() => {
      startTransition(() =>
        router.replace(
          normalized ? `/search?q=${encodeURIComponent(normalized)}` : "/search",
          { scroll: false },
        ),
      );
    }, 450);
    return () => clearTimeout(timeout);
  }, [query, initialQuery, router, composing]);
  return (
    <form
      action="/search"
      role="search"
      aria-label="Search movies and TV series"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(query);
      }}
    >
      <label className="search-label" htmlFor="catalog-search">
        Search movies and TV series
      </label>
      <div className="search-form">
        <div className="search-input-wrap">
          <Search size={19} aria-hidden="true" />
          <input
            id="catalog-search"
            name="q"
            type="search"
            value={query}
            onChange={(event) =>
              setSearch((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            placeholder="Find a movie or series…"
            maxLength={100}
          />
        </div>
        <Button className="primary-action" type="submit">
          Search
        </Button>
      </div>
      <span className="search-feedback" role="status">
        {pending ? "Searching the catalog…" : "Search powered by TMDB"}
      </span>
    </form>
  );
}
