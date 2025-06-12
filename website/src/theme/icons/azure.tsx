import type React from "react";

export const AzureIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 128"
    width={22}
    height={22}
    {...props}
    fill="none"
  >
    <title>Azure</title>
    <defs>
      <linearGradient
        id="a"
        gradientUnits="userSpaceOnUse"
        x1="9"
        y1="16.97"
        x2="9"
        y2="1.03"
        gradientTransform="scale(7.11111)"
      >
        <stop offset="0" stopColor="#0078d4" />
        <stop offset=".16" stopColor="#1380da" />
        <stop offset=".53" stopColor="#3c91e5" />
        <stop offset=".82" stopColor="#559cec" />
        <stop offset="1" stopColor="#5ea0ef" />
      </linearGradient>
    </defs>
    <path
      fill="url(#a)"
      d="M120.89 28.445v69.262l-28.445 23.324-44.09-16.07v15.93L23.395 88.25l72.746 5.688V31.574ZM96.64 31.93 55.82 7.11v16.285L18.348 34.418 7.109 48.852v32.785l16.075 7.11V46.718Zm0 0"
    />
  </svg>
);
