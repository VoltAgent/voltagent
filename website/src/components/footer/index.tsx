import Link from "@docusaurus/Link";
import { GitHubLogo } from "../../../static/img/logos/github";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { XLogo } from "../../../static/img/logos/x";
import { LinkedInLogo } from "../../../static/img/logos/linkedin";
import { RedditLogo } from "../../../static/img/logos/reddit";
import { BoltIcon } from "@heroicons/react/24/solid";

export function Footer() {
  return (
    <footer className="bg-[#080f11d9] text-[#dcdcdc] font-['Inter'] py-8 md:py-12 relative w-[100vw] left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] border-solid border-b-0 border-l-0 border-r-0 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left section with logo and social links */}
          <div className="flex flex-col items-center lg:items-start">
            {/* Logo and copyright */}
            <div className="flex items-center gap-2 md:gap-2 mb-8 md:mb-6">
              <div className="flex items-center border-solid border-1 border-main-emerald rounded-full p-1">
                <BoltIcon className="w-4 h-4 text-main-emerald" />
              </div>
              <span className="text-2xl md:text-2xl font-bold text-main-emerald">
                voltagent
              </span>
            </div>

            {/* Social links */}
            <div className="flex space-x-6 md:space-x-6 mb-6 md:mb-4">
              <SocialLink
                href="https://github.com/voltagent/voltagent"
                icon={<GitHubLogo className="w-4 h-4 md:w-5 md:h-5" />}
                label="GitHub"
              />
              <SocialLink
                href="https://s.voltagent.dev/discord"
                icon={<DiscordLogo className="w-4 h-4 md:w-5 md:h-5" />}
                label="Discord"
              />
              <SocialLink
                href="https://x.com/voltagent_dev"
                icon={<XLogo className="w-4 h-4 md:w-5 md:h-5" />}
                label="X"
              />
              <SocialLink
                href="https://www.reddit.com/r/VoltAgent/"
                icon={<RedditLogo className="w-4 h-4 md:w-5 md:h-5" />}
                label="Reddit"
              />
              <SocialLink
                href="https://linkedin.com/company/voltagent"
                icon={<LinkedInLogo className="w-4 h-4 md:w-5 md:h-5" />}
                label="LinkedIn"
              />
            </div>

            <div className="text-main-emerald mb-2 text-center lg:text-left text-sm md:text-base">
              info@voltagent.dev
            </div>
            <div className="text-gray-400 text-center lg:text-left text-xs md:text-base">
              VoltAgent Inc. © {new Date().getFullYear()}
            </div>
          </div>

          {/* Main footer links */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="landing-lg:text-xl landing-xs:text-md font-medium text-[#dcdcdc] mb-4 md:mb-3">
              Resources
            </div>
            <ul className="space-y-3 md:space-y-2 list-none pl-0 text-center lg:text-left">
              <li>
                <FooterLink href="/docs/quick-start/">
                  Getting Started
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/blog/">Blog</FooterLink>
              </li>
              <li>
                <FooterLink href="https://github.com/voltagent/voltagent/blob/main/CHANGELOG.md">
                  Changelog
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/docs/">Docs</FooterLink>
              </li>
              <li>
                <FooterLink href="/mcp/">MCP Directory</FooterLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center lg:items-start">
            <div className="landing-lg:text-xl landing-xs:text-md font-medium text-[#dcdcdc] mb-4 md:mb-3">
              Community
            </div>
            <ul className="space-y-3 md:space-y-2 list-none pl-0 text-center lg:text-left">
              <li>
                <FooterLink href="/docs/community/contributing/">
                  Contributing
                </FooterLink>
              </li>
              <li>
                <FooterLink href="/about/">About us</FooterLink>
              </li>
              <li>
                <FooterLink href="/showcase/">Showcase</FooterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

const FooterLink = ({ href, children, ...props }) => (
  <Link
    href={href}
    className="text-gray-400 hover:text-main-emerald text-sm transition-colors duration-200 no-underline"
    {...props}
  >
    {children}
  </Link>
);

const SocialLink = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-400 hover:text-main-emerald transition-colors duration-200"
    aria-label={label}
  >
    {icon}
  </a>
);
