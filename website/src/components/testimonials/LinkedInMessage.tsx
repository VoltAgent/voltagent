import { LinkedInLogo } from "@site/static/img/logos/linkedin";

interface LinkedInMessageProps {
  username: string;
  title?: string;
  avatar?: string;
  message: string;
  timestamp?: string;
  url?: string;
}

const truncate = (str: string | null, length: number) => {
  if (!str) return str;

  // Use Array.from to properly count Unicode characters (including emojis and Japanese characters)
  const chars = Array.from(str);
  if (chars.length <= length) return str;

  return `${chars.slice(0, length - 3).join("")}...`;
};

export function LinkedInMessage({
  username,
  title,
  avatar,
  message,
  timestamp,
  url,
}: LinkedInMessageProps) {
  // Truncate message to 181 characters
  const truncatedMessage = truncate(message, 181);

  const MessageContent = () => (
    <div className="relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-lg border p-4 backdrop-blur-md border-white/10 border-solid h-[170px] hover:border-emerald-500 transition-colors duration-200">
      {/* LinkedIn Header - matching DiscordMessage structure */}
      <div className="flex flex-row justify-between tracking-tight">
        <div className="flex items-center space-x-2">
          {/* Avatar */}
          {avatar ? (
            <img
              title={`Profile picture of ${username}`}
              alt={username}
              height={38}
              width={38}
              src={avatar}
              className="overflow-hidden rounded-full border border-transparent"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#0077b5] flex items-center justify-center border border-transparent">
              <span className="text-white font-semibold text-lg">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* User Info */}
          <div>
            <span className="flex items-center no-decoration no-underline text-[#dcdcdc] whitespace-nowrap font-semibold">
              {username}
            </span>
            <div className="flex items-center space-x-1">
              {title && <span className="text-xs text-gray-500 truncate">{title}</span>}
              {timestamp && <span className="ml-1 text-gray-500 text-xs">{timestamp}</span>}
            </div>
          </div>
        </div>

        {/* LinkedIn Logo - matching Discord logo position */}
        <LinkedInLogo className="w-5 h-5 text-[#0077b5]" />
      </div>

      {/* Message Content - matching DiscordMessage structure */}
      <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter text-sm flex-1 overflow-hidden">
        {truncatedMessage}
      </div>
    </div>
  );

  if (url) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline no-decoration block"
        >
          <MessageContent />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <MessageContent />
    </div>
  );
}
