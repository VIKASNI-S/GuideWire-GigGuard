export function Shield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Zm0 2.2 6 2.25v4.55c0 3.8-2.4 7.2-6 8.65-3.6-1.45-6-4.85-6-8.65V6.45l6-2.25Z" />
    </svg>
  );
}
