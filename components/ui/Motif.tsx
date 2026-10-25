/**
 * Original geometric motif (an eight-petalled rosette within a lattice) used as a placeholder
 * wherever licensed photography has not yet been supplied. It is clearly a graphic, not a product photo.
 */
export function Motif({
  className = "",
  tone = "dark",
  label = "Photography forthcoming",
  caption = "Photography forthcoming",
  showLabel = true,
  seed = 0,
}: {
  className?: string;
  tone?: "dark" | "light" | "walnut";
  label?: string; // accessible name
  caption?: string; // short visible text
  showLabel?: boolean;
  seed?: number;
}) {
  const bg = tone === "dark" ? "#241C18" : tone === "walnut" ? "#704D38" : "#E7D7C1";
  const line = tone === "light" ? "#704D38" : "#B89B70";
  const rotate = (seed * 22.5) % 90;
  const id = `m${seed}${tone}`;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: bg }} role="img" aria-label={label}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <pattern id={id} width="80" height="80" patternUnits="userSpaceOnUse" patternTransform={`rotate(${rotate})`}>
            <g fill="none" stroke={line} strokeOpacity="0.35" strokeWidth="1">
              <circle cx="40" cy="40" r="14" />
              {Array.from({ length: 8 }).map((_, i) => (
                <ellipse key={i} cx="40" cy="22" rx="5" ry="12" transform={`rotate(${i * 45} 40 40)`} />
              ))}
              <path d="M0 0 L80 80 M80 0 L0 80" strokeOpacity="0.15" />
              <rect x="0.5" y="0.5" width="79" height="79" strokeOpacity="0.2" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div className="absolute inset-6 border" style={{ borderColor: `${line}55` }} aria-hidden="true" />
      {showLabel && (
        <span
          aria-hidden="true"
          className="label absolute inset-x-4 bottom-4 truncate text-center"
          style={{ color: tone === "light" ? "#704D38" : "#E7D7C1", opacity: 0.75 }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
