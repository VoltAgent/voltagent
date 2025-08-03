export const AutoGPTLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby="autogptTitle"
  >
    <title id="autogptTitle">AutoGPT</title>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" fill="currentColor" />
  </svg>
);
