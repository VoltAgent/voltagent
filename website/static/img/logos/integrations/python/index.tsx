export const PythonLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    height="1em"
    style={{ flex: "none", lineHeight: 1 }}
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby="pythonLogoTitle"
  >
    <title id="pythonLogoTitle">Python</title>
    <defs>
      <linearGradient
        id="paint0_linear_python"
        x1="12.4809"
        y1="2"
        x2="12.4809"
        y2="22.7407"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#327EBD" />
        <stop offset="1" stopColor="#1565A7" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_python"
        x1="19.519"
        y1="9.25928"
        x2="19.519"
        y2="30"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFDA4B" />
        <stop offset="1" stopColor="#F9C600" />
      </linearGradient>
    </defs>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.0164 2C10.8193 2 9.03825 3.72453 9.03825 5.85185V8.51852H15.9235V9.25926H5.97814C3.78107 9.25926 2 10.9838 2 13.1111L2 18.8889C2 21.0162 3.78107 22.7407 5.97814 22.7407H8.27322V19.4815C8.27322 17.3542 10.0543 15.6296 12.2514 15.6296H19.5956C21.4547 15.6296 22.9617 14.1704 22.9617 12.3704V5.85185C22.9617 3.72453 21.1807 2 18.9836 2H13.0164Z"
      fill="url(#paint0_linear_python)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18.9834 30C21.1805 30 22.9616 28.2755 22.9616 26.1482V23.4815L16.0763 23.4815L16.0763 22.7408L26.0217 22.7408C28.2188 22.7408 29.9998 21.0162 29.9998 18.8889V13.1111C29.9998 10.9838 28.2188 9.25928 26.0217 9.25928L23.7266 9.25928V12.5185C23.7266 14.6459 21.9455 16.3704 19.7485 16.3704L12.4042 16.3704C10.5451 16.3704 9.03809 17.8296 9.03809 19.6296L9.03809 26.1482C9.03809 28.2755 10.8192 30 13.0162 30H18.9834Z"
      fill="url(#paint1_linear_python)"
    />
  </svg>
);
