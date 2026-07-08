import React from "react";

const SPONSORS = [
  {
    name: "Ego Lite",
    description: "Fast browser automation for AI agents.",
    href: "https://lite.ego.app/?utm_campaign=ego-sponsor&utm_source=voltagent&utm_medium=sponsor",
    logo: "https://cdn.voltagent.dev/awesome-repo/ego-lite/logo_wordmark_lite_white.svg",
  },
];

export function SponsorsSection() {
  return (
    <section className="relative w-full overflow-hidden z-10">
      <div className="w-full bg-[#101010] relative z-10 landing-xs:py-10 landing-md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-5xl">
            <p className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-[#b8b3b0] tracking-wide uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-main-emerald inline-block" />
              Sponsors
            </p>
            <p className="mt-1 max-w-5xl landing-md:text-xl landing-xs:text-base text-[#8a8380] mb-0">
              <span className="text-white">VoltAgent is MIT licensed, free and open source.</span>{" "}
              <a
                href="https://sponsors.voltagent.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-main-emerald no-underline transition-colors duration-200 hover:text-main-emerald/80"
              >
                Become a sponsor
                <span aria-hidden="true">-&gt;</span>
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:my-8 landing-md:my-14">
        <div className="flex items-start">
          {SPONSORS.map((sponsor) => (
            <a
              key={sponsor.name}
              href={sponsor.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-fit max-w-full flex-col rounded-lg border border-solid border-white/10 bg-black/20 px-5 py-8 no-underline transition-all duration-200 hover:border-main-emerald hover:bg-black/40"
            >
              <div className="flex items-start gap-4">
                <div>
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className="h-8 w-auto object-contain"
                  />
                  <p className="mt-3 max-w-sm text-sm my-4 mb-0 leading-6 text-[#b8b3b0]">
                    {sponsor.description}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-1 text-main-emerald transition-transform duration-200 group-hover:translate-x-1"
                >
                  -&gt;
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
