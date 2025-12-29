import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  CloudArrowUpIcon,
  CogIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon, ChevronDownIcon, StarIcon } from "@heroicons/react/24/solid";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import SearchBar from "@theme/SearchBar";
import clsx from "clsx";
import React, { useState } from "react";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";

// Santa Claus Icon Component
const SantaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Face */}
    <circle cx="12" cy="13" r="8" fill="#FDBF6F" />
    {/* Hat */}
    <path d="M4 11C4 11 5 4 12 4C19 4 20 11 20 11L12 9L4 11Z" fill="#CC0000" />
    <ellipse cx="12" cy="11" rx="9" ry="2" fill="white" />
    {/* Hat pom-pom */}
    <circle cx="19" cy="5" r="2.5" fill="white" />
    {/* Hat tip curve */}
    <path d="M12 4C12 4 16 3 19 5" stroke="#CC0000" strokeWidth="3" strokeLinecap="round" />
    {/* Eyes */}
    <circle cx="9" cy="12" r="1" fill="#333" />
    <circle cx="15" cy="12" r="1" fill="#333" />
    {/* Rosy cheeks */}
    <circle cx="7" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="17" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    {/* Nose */}
    <circle cx="12" cy="14" r="1.2" fill="#E88" />
    {/* Beard */}
    <path
      d="M4 15C4 15 4 22 12 22C20 22 20 15 20 15C20 15 18 16 12 16C6 16 4 15 4 15Z"
      fill="white"
    />
    {/* Mustache */}
    <path
      d="M7 15.5C7 15.5 9 16.5 12 16.5C15 16.5 17 15.5 17 15.5C17 15.5 15 17 12 17C9 17 7 15.5 7 15.5Z"
      fill="white"
    />
  </svg>
);
import { useGitHubStars } from "../../contexts/GitHubStarsContext";
import useCasesData from "../usecases/usecases.json";
import styles from "./styles.module.css";

// Docs page tab configuration
const docTabs = [
  { label: "VoltAgent", href: "/docs/", match: "/docs/" },
  { label: "Observability", href: "/observability-docs/", match: "/observability-docs/" },
  {
    label: "Actions & Triggers",
    href: "/actions-triggers-docs/",
    match: "/actions-triggers-docs/",
  },
  { label: "Evaluation", href: "/evaluation-docs/", match: "/evaluation-docs/" },
  {
    label: "Prompt Engineering",
    href: "/prompt-engineering-docs/",
    match: "/prompt-engineering-docs/",
  },
  { label: "Deployment", href: "/deployment-docs/", match: "/deployment-docs/" },
  { label: "Recipes & Guides", href: "/recipes-and-guides/", match: "/recipes-and-guides/" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isUseCasesOpen, setIsUseCasesOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
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

  // Check if current page is a docs page
  const isDocsPage =
    location.pathname.includes("/docs") ||
    location.pathname.includes("/observability-docs") ||
    location.pathname.includes("/evaluation-docs") ||
    location.pathname.includes("/prompt-engineering-docs") ||
    location.pathname.includes("/deployment-docs") ||
    location.pathname.includes("/actions-triggers-docs") ||
    location.pathname.startsWith("/recipes-and-guides/");

  // Render docs navbar for documentation pages
  if (isDocsPage) {
    return (
      <nav className={styles.docsNavbar}>
        {/* Top Row: Logo + Search + Version + Actions */}
        <div className={styles.docsNavbarTop}>
          <div className={styles.docsLeftSection}>
            <Link to="/docs/" className={styles.docsLogoLink}>
              <SantaIcon className={styles.docsLogoIcon} />
              <span className={styles.docsLogoText}>voltagent</span>
              <span className={styles.docsDocsText}>Docs</span>
            </Link>
          </div>
          <div className={styles.docsCenterSection}>
            <div className={styles.docsVersionBadge}>v2.0.x</div>
            <div className={styles.docsSearchWrapper}>
              {/* Hidden SearchBar - triggers on button click */}
              <div className={styles.docsSearchHidden}>
                <SearchBar />
              </div>
              <button
                type="button"
                className={styles.docsSearchButton}
                onClick={() => {
                  // Click the hidden DocSearch button
                  const searchButton = document.querySelector(
                    ".DocSearch-Button",
                  ) as HTMLButtonElement;
                  if (searchButton) {
                    searchButton.click();
                  }
                }}
                aria-label="Search"
              >
                <MagnifyingGlassIcon className={styles.docsSearchIcon} />
                <span className={styles.docsSearchText}>Search</span>
                <span className={styles.docsSearchShortcut}>⌘K</span>
              </button>
            </div>
          </div>
          <div className={styles.docsRightSection}>
            <Link
              to="https://console.voltagent.dev/"
              className={clsx(styles.docsSocialButton, styles.docsCtaButton)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Try VoltOps"
            >
              <span>Try VoltOps</span>
              <ArrowRightIcon className={styles.docsCtaIcon} />
            </Link>
            <Link to="/" className={styles.docsSocialButton} aria-label="Home">
              <HomeIcon className={styles.docsSocialIconHome} />
            </Link>
            <Link
              to="https://s.voltagent.dev/discord"
              className={styles.docsSocialButton}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <DiscordLogo className={styles.docsSocialIconDiscord} />
            </Link>
            <Link
              to="https://github.com/voltagent/voltagent"
              className={styles.docsSocialButton}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <GitHubLogo className={styles.docsSocialIconGitHub} />
            </Link>
          </div>
        </div>
        {/* Bottom Row: Tabs */}
        <div className={styles.docsNavbarBottom}>
          <div className={styles.docsTabList} role="tablist" aria-label="Documentation sections">
            {docTabs.map((tab) => (
              <Link
                key={tab.href}
                to={tab.href}
                className={clsx(
                  styles.docsTab,
                  location.pathname.startsWith(tab.match) && styles.docsTabActive,
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // Default navbar for non-docs pages
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarInner}>
        <div className={styles.navbarLeft}>
          <Link to="/" className={styles.logoLink}>
            <SantaIcon className="w-5 h-5" />
            <span className={styles.logoText}>voltagent</span>
          </Link>
          <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ""}`}>
            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                Products
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-white" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0a0f14] border border-solid border-gray-600 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(148,163,184,0.1)_inset] w-[580px] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[8px] before:bg-transparent">
                <div className="grid grid-cols-2 gap-0">
                  {/* Left Column - VoltOps */}
                  <div className="p-4 border-r border-gray-700/30">
                    <h3 className="text-sm font-semibold text-white mb-3 px-2 pb-3 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50 font-['Inter']">
                      VoltOps
                    </h3>
                    <Link to="/voltops-llm-observability/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <ComputerDesktopIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Observability
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Monitor LLM calls and agent behavior
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/voltops/actions-triggers" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <ArrowPathIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Actions & Triggers
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Triggers and actions for workflows
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/voltops/evals" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <ChartBarIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Evals
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Evaluate and improve your agents
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/voltops/prompt-management" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Prompt Management
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Manage and version your prompts
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/voltops/deployment/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <CloudArrowUpIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Deployment
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Deploy AI agents to production
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/voltops/rag" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <CircleStackIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            RAG
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Retrieval Augmented Generation
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Right Column - Open Source Framework */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 px-2 pb-3 border-b border-solid border-t-0 border-l-0 border-r-0  border-gray-700/50 font-['Inter']">
                      Open Source Framework
                    </h3>
                    <Link to="/docs/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <BoltIcon className="w-4 h-4 !text-emerald-500 group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            VoltAgent
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Build AI agents with TypeScript
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/ai-agent-marketplace/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-center justify-between transition-all duration-200 rounded-lg mb-2">
                        <div className="flex items-start">
                          <ShoppingCartIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                              Marketplace
                            </span>
                            <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                              Discover and share AI agents
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal flex-shrink-0">
                          Soon
                        </span>
                      </div>
                    </Link>
                    <div className="group/item p-1 cursor-pointer flex items-center justify-between transition-all duration-200 rounded-lg mb-2">
                      <div className="flex items-start">
                        <PuzzlePieceIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Agent Builder
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Build no-code agents
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal flex-shrink-0">
                        Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Link to="/docs/" className={`${styles.navLink}  `}>
              Docs
            </Link>

            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                Use Cases
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-white" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0a0f14] border border-solid border-gray-600 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(148,163,184,0.1)_inset] w-[460px] max-h-[500px] overflow-y-auto opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[8px] before:bg-transparent">
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0">
                    {useCasesData.map((useCase) => {
                      const Icon = useCaseIcons[useCase.slug] || BoltIcon;
                      return (
                        <Link
                          key={useCase.slug}
                          to={`/use-cases/${useCase.slug}`}
                          className="no-underline"
                        >
                          <div className="group/item py-1.5 px-1 cursor-pointer flex items-center transition-all duration-200 rounded-lg">
                            <Icon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-2 flex-shrink-0" />
                            <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200">
                              {useCase.title}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                Resources
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-white" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0a0f14] border border-solid border-gray-600 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(148,163,184,0.1)_inset] w-[580px] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 z-50 before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-[8px] before:bg-transparent">
                <div className="grid grid-cols-2 gap-0">
                  {/* Left Column - Learn */}
                  <div className="p-4 border-r border-gray-700/30">
                    <h3 className="text-sm font-semibold text-white mb-3 px-2 pb-3 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50 font-['Inter']">
                      Learn
                    </h3>
                    <Link to="/tutorial/introduction" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <BookOpenIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            5 Steps Tutorial
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Learn AI agent development in 5 steps
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="https://voltagent.dev/examples/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <CommandLineIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Examples
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Explore sample projects and code
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Right Column - Connect */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 px-2 pb-3 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50 font-['Inter']">
                      Connect
                    </h3>
                    <Link to="/blog/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <PencilSquareIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Blog
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Read the technical blog
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/about/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <InformationCircleIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            About Us
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Learn more about VoltAgent
                          </span>
                        </div>
                      </div>
                    </Link>
                    <Link to="/launch-week-november-25/" className="no-underline">
                      <div className="group/item p-1 cursor-pointer flex items-start transition-all duration-200 rounded-lg mb-2">
                        <RocketLaunchIcon className="w-4 h-4 !text-white group-hover/item:!text-emerald-500 transition-all duration-200 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-['Inter'] font-normal !text-white group-hover/item:!text-emerald-500 transition-all duration-200 block">
                            Launch Week #2
                          </span>
                          <span className="text-xs font-normal text-gray-500 font-['Inter'] leading-[1.2]">
                            Explore our product launch updates
                          </span>
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
            className={`${styles.navbarButton} group relative no-underline flex hover:border-slate-600  hover:text-emerald-500 items-center border-solid border-1 border-[#DCDCDC] rounded-3xl p-1 rounded-full text-[#DCDCDC] hover:text-emerald-500`}
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
              <DiscordLogo className="w-6 h-6 text-[#5865F2] hover:text-emerald-500" />
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
              className="flex items-center justify-between px-0 w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => setIsProductsOpen(!isProductsOpen)}
            >
              <span className="font-['Inter'] font-normal">Products</span>
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isProductsOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className={`${isProductsOpen ? "block" : "hidden"} mt-4 mb-2`}>
              <h4 className="text-sm font-normal text-gray-400 uppercase tracking-wider pb-2 mb-2 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50">
                VoltOps
              </h4>
              <Link to="/voltops-llm-observability/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <ComputerDesktopIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Observability
                  </span>
                </div>
              </Link>
              <Link to="/voltops/actions-triggers" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <ArrowPathIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Actions & Triggers
                  </span>
                </div>
              </Link>
              <Link to="/voltops/evals" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <ChartBarIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Evals
                  </span>
                </div>
              </Link>
              <Link to="/voltops/prompt-management" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Prompt Management
                  </span>
                </div>
              </Link>
              <Link to="/voltops/deployment/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <CloudArrowUpIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Deployment
                  </span>
                </div>
              </Link>
              <Link to="/voltops/rag" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <CircleStackIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    RAG
                  </span>
                </div>
              </Link>
              <h4 className="text-sm font-normal text-gray-400 uppercase tracking-wider pb-2 mt-4 mb-2 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50">
                Open Source Framework
              </h4>
              <Link to="/docs/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <BoltIcon className="w-5 h-5 mr-2 text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    VoltAgent
                  </span>
                </div>
              </Link>
              <Link to="/ai-agent-marketplace/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <ShoppingCartIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Marketplace
                  </span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal">
                    Soon
                  </span>
                </div>
              </Link>
              <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                <PuzzlePieceIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                  Agent Builder
                </span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full font-['Inter'] font-normal">
                  Soon
                </span>
              </div>
            </div>
          </div>
          <Link to="/docs/" className={`${styles.mobileNavLink}`}>
            Docs
          </Link>
          <Link to="/recipes-and-guides/" className={`${styles.mobileNavLink}`}>
            Recipes & Guides
          </Link>

          <div className={styles.mobileNavLink}>
            <button
              type="button"
              className="flex items-center justify-between px-0 w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => setIsUseCasesOpen(!isUseCasesOpen)}
            >
              <span className="font-['Inter'] font-normal">Use Cases</span>
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isUseCasesOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className={`${isUseCasesOpen ? "block" : "hidden"} mt-4 mb-2`}>
              {useCasesData.map((useCase) => {
                const Icon = useCaseIcons[useCase.slug] || BoltIcon;
                return (
                  <Link
                    key={useCase.slug}
                    to={`/use-cases/${useCase.slug}`}
                    className="no-underline"
                  >
                    <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                      <Icon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                      <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                        {useCase.title}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className={styles.mobileNavLink}>
            <button
              type="button"
              className="flex items-center justify-between px-0 w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => setIsResourcesOpen(!isResourcesOpen)}
            >
              <span className="font-['Inter'] font-normal">Resources</span>
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isResourcesOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className={`${isResourcesOpen ? "block" : "hidden"} mt-4 mb-2`}>
              <h4 className="text-sm font-normal text-gray-400 uppercase tracking-wider pb-2 mb-2 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50">
                Learn
              </h4>
              <Link to="/tutorial/introduction" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <BookOpenIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    5 Steps Tutorial
                  </span>
                </div>
              </Link>
              <Link to="https://voltagent.dev/examples/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <CommandLineIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Examples
                  </span>
                </div>
              </Link>
              <h4 className="text-sm font-normal text-gray-400 uppercase tracking-wider pb-2 mt-4 mb-2 border-b border-solid border-t-0 border-l-0 border-r-0 border-gray-700/50">
                Connect
              </h4>
              <Link to="/blog/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <PencilSquareIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Blog
                  </span>
                </div>
              </Link>
              <Link to="/about/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <InformationCircleIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    About Us
                  </span>
                </div>
              </Link>
              <Link to="/launch-week-november-25/" className="no-underline">
                <div className="group p-3 cursor-pointer flex items-center transition-all duration-200">
                  <RocketLaunchIcon className="w-5 h-5 mr-2 text-white group-hover:text-emerald-500 transition-all duration-200" />
                  <span className="text-base font-['Inter'] font-normal text-white group-hover:text-emerald-500 transition-colors duration-200">
                    Launch Week #2
                  </span>
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
