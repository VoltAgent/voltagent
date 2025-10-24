import {
  ABBLogo,
  AccentureLogo,
  AdobeLogo,
  AmazonLogo,
  BayerLogo,
  BroadcomLogo,
  CarrefourLogo,
  CognizantLogo,
  DeutscheBankLogo,
  FiverrLogo,
  GoDaddyLogo,
  HSBCLogo,
  HuaweiLogo,
  InfosysLogo,
  MicrosoftCorpLogo,
  NissanLogo,
  OracleLogo,
  SamsungLogo,
  StellantisLogo,
  TacoBellLogo,
  TataLogo,
  VerizonLogo,
  WellsFargoLogo,
} from "@site/static/img/logos/companies";
import type React from "react";

type LogoItem = {
  key: string;
  Component: React.ComponentType<{ className?: string }>;
  label: string;
  wrapperClassName?: string;
  svgClassName?: string;
};

const ROW1_LOGOS: LogoItem[] = [
  { key: "samsung", Component: SamsungLogo, label: "Samsung", wrapperClassName: "w-32" },
  { key: "tata", Component: TataLogo, label: "Tata", wrapperClassName: "w-36" },
  { key: "infosys", Component: InfosysLogo, label: "Infosys", wrapperClassName: "w-32" },
  { key: "cognizant", Component: CognizantLogo, label: "Cognizant", wrapperClassName: "w-32" },
  { key: "wellsfargo", Component: WellsFargoLogo, label: "Wells Fargo", wrapperClassName: "w-22" },
  { key: "bayer", Component: BayerLogo, label: "Bayer", wrapperClassName: "w-32" },
  { key: "oracle", Component: OracleLogo, label: "Oracle", wrapperClassName: "w-36" },
  { key: "huawei", Component: HuaweiLogo, label: "Huawei", wrapperClassName: "w-32" },
  {
    key: "microsoft",
    Component: MicrosoftCorpLogo,
    label: "Microsoft",
    wrapperClassName: "w-32",
  },
];

const ROW2_LOGOS: LogoItem[] = [
  { key: "abb", Component: ABBLogo, label: "ABB", wrapperClassName: "w-28" },
  { key: "amazon", Component: AmazonLogo, label: "Amazon", wrapperClassName: "w-22" },
  { key: "stellantis", Component: StellantisLogo, label: "Stellantis", wrapperClassName: "w-32" },
  { key: "verizon", Component: VerizonLogo, label: "Verizon", wrapperClassName: "w-32" },
  { key: "carrefour", Component: CarrefourLogo, label: "Carrefour", wrapperClassName: "w-32" },

  { key: "godaddy", Component: GoDaddyLogo, label: "GoDaddy", wrapperClassName: "w-32" },
  { key: "broadcom", Component: BroadcomLogo, label: "Broadcom", wrapperClassName: "w-32" },
  { key: "accenture", Component: AccentureLogo, label: "Accenture", wrapperClassName: "w-32" },

  { key: "nissan", Component: NissanLogo, label: "Nissan", wrapperClassName: "w-28" },

  { key: "adobe", Component: AdobeLogo, label: "Adobe", wrapperClassName: "w-28" },
  { key: "fiverr", Component: FiverrLogo, label: "Fiverr", wrapperClassName: "w-28" },
];

export const CompaniesMarquee = () => {
  const renderRow = (logos: LogoItem[], reverse = false) => {
    const duplicated = [...logos, ...logos, ...logos];
    return (
      <div className="relative mb-4 sm:mb-6">
        <div
          className="flex overflow-hidden"
          style={{
            maxWidth: "100%",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
          }}
        >
          <div
            className={`flex space-x-4 sm:space-x-6 py-2 ${
              reverse ? "scroll-right-animation" : "scroll-left-animation"
            }`}
          >
            {duplicated.map(({ key, Component, label }, idx) => {
              const baseLogo = logos[idx % logos.length];
              return (
                <div
                  key={`${key}-${idx}-${reverse ? "reverse" : "normal"}`}
                  className={`flex-shrink-0 flex items-center justify-center h-14 sm:h-16 ${
                    baseLogo.wrapperClassName ?? "w-32"
                  }`}
                >
                  <Component className={baseLogo.svgClassName ?? "max-h-full max-w-full"} />
                  <span className="sr-only">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes scrollLeft {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }

        @keyframes scrollRight {
          0% {
            transform: translateX(-33.33%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .scroll-left-animation {
          animation: scrollLeft 40s linear infinite;
        }

        .scroll-right-animation {
          animation: scrollRight 40s linear infinite;
        }

        .companies-marquee svg,
        .companies-marquee svg * {
        }
      `}</style>
      <div className="companies-marquee relative max-w-7xl xs:px-4 lg:px-8 mx-auto landing-xs:mb-16 landing-md:mb-36">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            Used and Tested by Developers at
          </h2>
        </div>
        {renderRow(ROW1_LOGOS, false)}
        {renderRow(ROW2_LOGOS, true)}
      </div>
    </>
  );
};
