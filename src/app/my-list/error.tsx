"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="browse-page"><h1>My List is temporarily unavailable</h1><p>Your saved titles are safe. Please try again.</p><button className="header-sign-in" onClick={reset}>Try again</button></main>;
}
