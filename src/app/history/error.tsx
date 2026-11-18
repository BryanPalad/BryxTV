"use client";
export default function Error({ reset }: { reset: () => void }) { return <main className="browse-page"><h1>History is temporarily unavailable</h1><p>Your saved progress has not been removed.</p><button className="playback-button" onClick={reset}>Try again</button></main>; }
