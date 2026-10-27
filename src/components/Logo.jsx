export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M8 16h16M16 8c3 2.6 3 13.4 0 16M16 8c-3 2.6-3 13.4 0 16" fill="none" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}
