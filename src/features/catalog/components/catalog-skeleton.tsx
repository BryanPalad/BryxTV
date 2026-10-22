export function CatalogSkeleton({
  hero = false,
  detail = false,
}: {
  hero?: boolean;
  detail?: boolean;
}) {
  return (
    <div
      className="catalog-skeleton"
      role="status"
      aria-label="Loading catalog"
    >
      <span className="sr-only">Loading titles…</span>
      {hero && <div className="skeleton skeleton-hero" />}
      {detail ? (
        <div className="skeleton-detail">
          <div className="skeleton skeleton-poster" />
          <div>
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      ) : (
        <div className="skeleton-content">
          <div className="skeleton skeleton-heading" />
          <div className="browse-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index}>
                <div className="skeleton skeleton-poster" />
                <div className="skeleton skeleton-line" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
