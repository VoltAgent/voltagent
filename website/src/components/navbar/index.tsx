import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import {
  AcademicCapIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  ChatBubbleLeftRightIcon,
  CloudArrowUpIcon,
  CogIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon,
  InformationCircleIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon, ChevronDownIcon, StarIcon } from "@heroicons/react/24/solid";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import React, { useState } from "react";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import { useGitHubStars } from "../../contexts/GitHubStarsContext";
import useCasesData from "../usecases/usecases.json";
import styles from "./styles.module.css";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)", { defaultValue: true });

  const location = useLocation();
  const { stars, recent_stargazers, loading: isLoadingStars, error: starsError } = useGitHubStars();

  // Icon mapping for use cases
  const useCaseIcons = {
    "hr-agent": UserGroupIcon,
    "customer-support-agent": ChatBubbleLeftRightIcon,
    "sales-teams": BriefcaseIcon,
    "finance-agent": CurrencyDollarIcon,
    "development-agent": CogIcon,
    "marketing-agent": MegaphoneIcon,
    "legal-agent": ScaleIcon,
    "insurance-agent": ShieldCheckIcon,
    "industrial-agent": WrenchScrewdriverIcon,
    "education-agent": AcademicCapIcon,
    "government-agent": BuildingLibraryIcon,
    "documentation-agent": DocumentTextIcon,
  };

  const _isActive = (path: string) => {
    const currentPath = location.pathname.endsWith("/")
      ? location.pathname
      : `${location.pathname}/`;
    const checkPath = path.endsWith("/") ? path : `${path}/`;
    return currentPath.startsWith(checkPath);
  };

  // Helper function to format star count
  const formatStarCount = (count: number | null | undefined): string => {
    if (count === null || count === undefined) return "✨";
    try {
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(count);
    } catch (error) {
      console.error("Error formatting star count:", error);
      return count.toString();
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarInner}>
        <div className={styles.navbarLeft}>
          <Link to="/" className={styles.logoLink}>
            {/* <div className="flex items-center border-solid border-1 border-main-emerald rounded-full  p-1">
              <BoltIcon className="w-4 h-4  text-main-emerald" />
            </div> */}
            🎃<span className={styles.logoText}>voltagent</span>
          </Link>
          <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ""}`}>
            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                Products
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-white" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0a0f14] border border-solid border-emerald-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(148,163,184,0.1)_inset] w-[280px] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[8px] before:bg-transparent">
                <div className="p-3">
                  <Link to="/docs/" className="no-underline">
                    <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                      <CubeIcon className="w-5 h-5 mr-3 ml-1 text-[#00d992]  transition-all duration-200" />
                      <span className="text-sm font-['Inter'] font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                        VoltAgent Core Framework
                      </span>
                    </div>
                  </Link>
                  <Link to="/voltops-llm-observability/" className="no-underline">
                    <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                      <ComputerDesktopIcon className="w-5 h-5 mr-3 ml-1 text-[#00d992]  transition-all duration-200" />
                      <span className="text-sm font-['Inter'] font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                        VoltOps LLM Observability
                      </span>
                    </div>
                  </Link>
                  <Link to="/ai-agent-marketplace/" className="no-underline">
                    <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                      <ShoppingCartIcon className="w-5 h-5 mr-3 ml-1 text-[#00d992]  transition-all duration-200" />
                      <span className="text-sm font-['Inter'] font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                        Marketplace
                      </span>
                    </div>
                  </Link>
                  <div className="group p-3 -mx-1 hover:bg-slate-800 text-[#DCDCDC] flex items-center justify-between transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                    <div className="flex items-center font-['Inter']">
                      <CloudArrowUpIcon className="w-5 h-5 mr-3 ml-1 text-[#00d992]  transition-all duration-200" />
                      <span className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                        Deployment
                      </span>
                    </div>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal">
                      Soon
                    </span>
                  </div>

                  <div className="group p-3 -mx-1 hover:bg-slate-800 text-[#DCDCDC] flex items-center justify-between transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20">
                    <div className="flex items-center font-['Inter']">
                      <PuzzlePieceIcon className="w-5 h-5 mr-3 ml-1 text-[#00d992]  transition-all duration-200" />
                      <span className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                        Agentic App Builder
                      </span>
                    </div>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal">
                      Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Link to="/docs/" className={`${styles.navLink}  `}>
              VoltAgent Docs
            </Link>
            <Link to="/voltops-llm-observability-docs/" className={`${styles.navLink}  `}>
              VoltOps Docs
            </Link>
            <Link to="/customers/" className={`${styles.navLink}`}>
              Customers
            </Link>

            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                Use Cases
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-white" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0a0f14] border border-solid border-emerald-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(148,163,184,0.1)_inset] w-[580px] max-h-[500px] overflow-y-auto opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[8px] before:bg-transparent">
                <div className="grid grid-cols-2 gap-1 p-3">
                  {useCasesData.map((useCase) => {
                    const Icon = useCaseIcons[useCase.slug] || BoltIcon;
                    return (
                      <Link
                        key={useCase.slug}
                        to={`/use-cases/${useCase.slug}`}
                        className="no-underline"
                      >
                        <div className="group p-2 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20">
                          <Icon className="w-5 h-5 mr-3 text-[#00d992] flex-shrink-0  transition-all duration-200" />
                          <div className="min-w-0">
                            <div className="text-sm font-['Inter'] font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                              {useCase.title}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                Resources
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-white" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0a0f14] border border-solid border-emerald-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(148,163,184,0.1)_inset] w-[600px] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[8px] before:bg-transparent">
                <div className="grid grid-cols-2 gap-0">
                  {/* Left Column - LEARN */}
                  <div className="p-4 border-r border-slate-700/30">
                    <Link to="/tutorial/introduction" className="no-underline">
                      <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                        <BookOpenIcon className="w-5 h-5 mr-3 ml-1 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                        <div className="min-w-0 font-['Inter']">
                          <div className="text-sm font-semibold whitespace-nowrap !text-white group-hover:!text-white transition-colors duration-200">
                            5 Steps Tutorial
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            Learn AI agent development in 5 steps
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link to="https://voltagent.dev/examples/" className="no-underline">
                      <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                        <CommandLineIcon className="w-5 h-5 mr-3 ml-1 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                        <div className="min-w-0 font-['Inter']">
                          <div className="text-sm font-semibold whitespace-nowrap !text-white group-hover:!text-white transition-colors duration-200">
                            Examples
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            Explore sample projects and code
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link to="/mcp/" className="no-underline">
                      <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20">
                        <ServerIcon className="w-5 h-5 mr-3 ml-1 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                        <div className="min-w-0 font-['Inter']">
                          <div className="text-sm font-semibold whitespace-nowrap !text-white group-hover:!text-white transition-colors duration-200">
                            MCP Directory
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            Browse Model Context Protocol services
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Right Column - CONNECT */}
                  <div className="p-4">
                    <Link to="/blog/" className="no-underline">
                      <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                        <PencilSquareIcon className="w-5 h-5 mr-3 ml-1 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                        <div className="min-w-0 font-['Inter']">
                          <div className="text-sm font-semibold whitespace-nowrap !text-white group-hover:!text-white transition-colors duration-200">
                            Blog
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            Read the technical blog
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link to="/about/" className="no-underline">
                      <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 mb-2">
                        <InformationCircleIcon className="w-5 h-5 mr-3 ml-1 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                        <div className="min-w-0 font-['Inter']">
                          <div className="text-sm font-semibold whitespace-nowrap !text-white group-hover:!text-white transition-colors duration-200">
                            About Us
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            Learn more about VoltAgent
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link to="/launch-week-june-25/" className="no-underline">
                      <div className="group p-3 -mx-1 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20">
                        <RocketLaunchIcon className="w-5 h-5 mr-3 ml-1 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                        <div className="min-w-0 font-['Inter']">
                          <div className="text-sm font-semibold whitespace-nowrap !text-white group-hover:!text-white transition-colors duration-200">
                            Launch Week #1
                          </div>
                          <div className="text-xs font-normal text-gray-500 whitespace-nowrap">
                            Explore our product launch updates
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.navbarRight}>
          <Link
            to="https://github.com/voltagent/voltagent/"
            target="_blank"
            className={`${styles.navbarButton} group relative no-underline flex hover:border-slate-600  hover:text-[#00d992] items-center border-solid border-1 border-[#DCDCDC] rounded-3xl p-1 rounded-full text-[#DCDCDC] hover:text-[#00d992]`}
            rel="noopener noreferrer"
          >
            <GitHubLogo className="w-6 h-6 " />

            {/* Stargazer Avatars Container - Only show on non-mobile */}
            {!isMobile && (
              <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 group-hover:translate-x-[-80%] transition-all duration-300 pointer-events-none">
                {/* Display only if not loading, no error, and stargazers exist */}
                {!isLoadingStars &&
                  !starsError &&
                  recent_stargazers &&
                  recent_stargazers.length > 0 && (
                    <>
                      <span className="text-xs text-emerald-400 cursor-pointer px-2 py-1 rounded whitespace-nowrap mr-1">
                        Thank you!
                      </span>
                      <div className="flex space-x-[-10px]">
                        {recent_stargazers.slice(0, 5).map((stargazer, index) => (
                          <a
                            key={stargazer.login}
                            href="https://github.com/voltagent/voltagent/stargazers/"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={stargazer.login}
                            className="block w-6 h-6 rounded-full overflow-hidden border border-gray-600 hover:scale-110 transition-transform duration-200 pointer-events-auto"
                            style={{ zIndex: 3 - index }}
                          >
                            <img
                              src={stargazer.avatar_url}
                              alt={`${stargazer.login} avatar`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </>
                  )}
              </div>
            )}

            <div className="flex items-center ml-2 font-medium text-sm">
              <span className="">
                {isLoadingStars ? "✨" : starsError ? "-" : formatStarCount(stars)}
              </span>
              <StarIcon className="w-4 h-4 ml-1 text-yellow-400 group-hover:animate-bounce" />
            </div>
          </Link>
          {!isMobile && (
            <Link
              to="https://s.voltagent.dev/discord/"
              className={`${styles.navbarButton} group relative flex items-center`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DiscordLogo className="w-6 h-6 text-[#5865F2] hover:text-[#00d992]" />
            </Link>
          )}

          <button
            type="button"
            className={`${styles.menuButton} ${isMenuOpen ? styles.menuButtonOpen : ""}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 30 30"
              aria-hidden="true"
              className={styles.menuIcon}
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeMiterlimit="10"
                strokeWidth="2"
                d="M4 7h22M4 15h22M4 23h22"
              />
            </svg>
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileNavLink}>
            <button
              type="button"
              className="flex items-center px-0  w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => {
                const elem = document.getElementById("mobile-products-dropdown");
                if (elem) {
                  elem.classList.toggle("hidden");
                }
              }}
            >
              <span className="font-['IBM_Plex_Mono'] font-semibold">Products</span>
              <ChevronDownIcon className="w-5 h-5 ml-1" />
            </button>
            <div id="mobile-products-dropdown" className="hidden  mt-4 mb-2 ">
              <Link to="/voltops-llm-observability/" className="no-underline">
                <div className="group p-3 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-t-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20">
                  <ComputerDesktopIcon className="w-5 h-5 mr-2 text-[#00d992]  transition-all duration-200" />
                  <span className="text-sm font-['Inter'] font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                    VoltOps LLM Observability
                  </span>
                </div>
              </Link>
              <div className="p-3 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center justify-between transition-all border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.02] hover:shadow-md hover:shadow-slate-900/20 rounded-b-lg">
                <div className="flex items-center font-['Inter']">
                  <CloudArrowUpIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <span className="text-sm font-semibold">Deployment</span>
                </div>
                <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal">
                  Soon
                </span>
              </div>

              <div className="p-3 hover:bg-slate-800/50 cursor-pointer text-[#DCDCDC] flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-slate-600 rounded-b-md">
                <div className="flex items-center font-['Inter']">
                  <ShoppingCartIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <Link
                    to="/ai-agent-marketplace/"
                    className="text-sm no-underline text-inherit font-['Inter'] font-semibold"
                  >
                    Marketplace
                  </Link>
                </div>
              </div>
              <div className="p-3 hover:bg-slate-800/50 cursor-pointer text-[#DCDCDC] flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-slate-600">
                <div className="flex items-center font-['Inter']">
                  <PuzzlePieceIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <span className="text-sm font-semibold">Agentic App Builder</span>
                </div>
                <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal">
                  Soon
                </span>
              </div>
            </div>
          </div>
          <Link to="/docs/" className={`${styles.mobileNavLink}`}>
            VoltAgent Docs
          </Link>
          <Link to="/voltops-llm-observability-docs/" className={`${styles.mobileNavLink}`}>
            VoltOps Docs
          </Link>

          <Link to="/customers/" className={`${styles.mobileNavLink}`}>
            Customers
          </Link>
          <div className={styles.mobileNavLink}>
            <button
              type="button"
              className="flex items-center px-0 w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => {
                const elem = document.getElementById("mobile-usecases-menu");
                if (elem) {
                  elem.classList.toggle("hidden");
                }
              }}
            >
              <span className="font-['IBM_Plex_Mono'] font-semibold">Use Cases</span>
              <ChevronDownIcon className="w-5 h-5 ml-1" />
            </button>
            <div id="mobile-usecases-menu" className="hidden mt-4 mb-2">
              {useCasesData.map((useCase, index) => {
                const Icon = useCaseIcons[useCase.slug] || BoltIcon;
                const isFirst = index === 0;
                const isLast = index === useCasesData.length - 1;
                return (
                  <Link
                    key={useCase.slug}
                    to={`/use-cases/${useCase.slug}`}
                    className="no-underline"
                  >
                    <div
                      className={`group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center ${
                        isFirst ? "rounded-t-lg" : ""
                      } ${
                        isLast ? "rounded-b-lg" : ""
                      } transition-all duration-200 border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20`}
                    >
                      <Icon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                      <div className="min-w-0 flex-1 font-['Inter']">
                        <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200 break-words line-clamp-2">
                          {useCase.title}
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-2">
                          {useCase.hero?.subtext || "Automate with intelligent agents"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className={styles.mobileNavLink}>
            <button
              type="button"
              className="flex items-center px-0 w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => {
                const elem = document.getElementById("mobile-resources-menu");
                if (elem) {
                  elem.classList.toggle("hidden");
                }
              }}
            >
              <span className="font-['IBM_Plex_Mono'] font-semibold">Resources</span>
              <ChevronDownIcon className="w-5 h-5 ml-1" />
            </button>
            <div id="mobile-resources-menu" className="hidden mt-4 mb-2">
              <Link to="/tutorial/introduction" className="no-underline">
                <div className="group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center rounded-t-lg transition-all duration-200 border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20">
                  <BookOpenIcon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                  <div className="min-w-0 font-['Inter']">
                    <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                      5 Steps Tutorial
                    </div>
                    <div className="text-xs text-gray-400">
                      Learn AI agent development in 5 steps
                    </div>
                  </div>
                </div>
              </Link>
              <Link
                to="https://github.com/voltagent/voltagent/tree/main/examples/"
                className="no-underline"
              >
                <div className="group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20">
                  <CommandLineIcon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                  <div className="min-w-0 font-['Inter']">
                    <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                      Examples
                    </div>
                    <div className="text-xs text-gray-400">Explore sample projects and code</div>
                  </div>
                </div>
              </Link>
              <Link to="/mcp/" className="no-underline">
                <div className="group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20">
                  <ServerIcon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                  <div className="min-w-0 font-['Inter']">
                    <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                      MCP Directory
                    </div>
                    <div className="text-xs text-gray-400">
                      Browse Model Context Protocol services
                    </div>
                  </div>
                </div>
              </Link>
              <Link to="/blog/" className="no-underline">
                <div className="group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20">
                  <PencilSquareIcon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                  <div className="min-w-0 font-['Inter']">
                    <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                      Blog
                    </div>
                    <div className="text-xs text-gray-400">Read the technical blog</div>
                  </div>
                </div>
              </Link>
              <Link to="/about/" className="no-underline">
                <div className="group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20">
                  <InformationCircleIcon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                  <div className="min-w-0 font-['Inter']">
                    <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                      About Us
                    </div>
                    <div className="text-xs text-gray-400">Learn more about VoltAgent</div>
                  </div>
                </div>
              </Link>
              <Link to="/launch-week-june-25/" className="no-underline">
                <div className="group p-3 pl-8 hover:bg-slate-800 cursor-pointer text-[#DCDCDC] flex items-center transition-all duration-200 rounded-b-lg border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-slate-600 hover:scale-[1.01] hover:shadow-md hover:shadow-slate-900/20">
                  <RocketLaunchIcon className="w-5 h-5 mr-2 flex-shrink-0 text-[#00d992]  transition-all duration-200" />
                  <div className="min-w-0 font-['Inter']">
                    <div className="text-sm font-semibold !text-white group-hover:!text-white transition-colors duration-200">
                      Launch Week #1
                    </div>
                    <div className="text-xs font-normal text-gray-400">
                      Explore our product launch updates
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          <div className={styles.mobileButtons}>
            <Link to="https://console.voltagent.dev/demo" className={styles.mobileLoginButton}>
              Log in to VoltOps
            </Link>
            <Link
              to="https://s.voltagent.dev/discord/"
              className={styles.mobileDiscordButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DiscordLogo className="w-5 h-5" />
              <span>Discord Community</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
