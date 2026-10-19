/** Ilustración de marca: micrófono Tuki con ondas y destellos. */
export function MicIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 420" aria-hidden="true">
      <defs>
        <clipPath id="mic-clip">
          <rect x="150" y="70" width="120" height="250" rx="60" />
        </clipPath>
      </defs>
      <circle cx="210" cy="250" r="190" fill="#14175a" />
      <path d="M90 250a120 120 0 0 0 240 0" fill="none" stroke="#f2efe8" strokeWidth="14" strokeLinecap="round" />
      <path d="M210 370v40M150 410h120" stroke="#f2efe8" strokeWidth="14" strokeLinecap="round" />
      <rect x="150" y="70" width="120" height="250" rx="60" fill="#d63d17" stroke="#f2efe8" strokeWidth="10" />
      <g clipPath="url(#mic-clip)" fill="#f2efe8">
        <rect x="150" y="120" width="62" height="13" rx="3" />
        <rect x="150" y="148" width="62" height="13" rx="3" />
        <rect x="150" y="176" width="62" height="13" rx="3" />
      </g>
      <g stroke="#f0623a" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M352 150c18 22 18 58 0 80" />
        <path d="M382 128c30 36 30 88 0 124" />
        <path d="M68 150c-18 22-18 58 0 80" />
        <path d="M38 128c-30 36-30 88 0 124" />
      </g>
    </svg>
  );
}

export function Sparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 300" aria-hidden="true" fill="#f2efe8">
      <path d="M80 20c6 34 16 44 50 50-34 6-44 16-50 50-6-34-16-44-50-50 34-6 44-16 50-50Z" />
      <path d="M200 110c4 22 10 28 32 32-22 4-28 10-32 32-4-22-10-28-32-32 22-4 28-10 32-32Z" fill="#f0623a" />
      <path d="M120 190c3 16 8 21 24 24-16 3-21 8-24 24-3-16-8-21-24-24 16-3 21-8 24-24Z" />
    </svg>
  );
}

export function AuthIcons() {
  return (
    <div className="auth-icons" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="2.5" width="8" height="13" rx="4" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0" />
      </svg>
    </div>
  );
}
