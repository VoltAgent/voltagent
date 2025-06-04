export const DifyLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    height="1em"
    style={{ flex: "none", lineHeight: 1 }}
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby="difyTitle"
  >
    <title id="difyTitle">Dify</title>
    <defs>
      <clipPath id="dify-clip-path">
        <path d="M1 0h10.286c6.627 0 12 5.373 12 12s-5.373 12-12 12H1V0z" />
      </clipPath>
      <linearGradient id="dify-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0222C3" />
        <stop offset="50%" stopColor="#8FB1F4" />
        <stop offset="100%" stopColor="#FFFFFF" />
      </linearGradient>
    </defs>
    <path
      d="M1 0h10.286c6.627 0 12 5.373 12 12s-5.373 12-12 12H1V0z"
      fill="url(#dify-gradient)"
    />
  </svg>
);
