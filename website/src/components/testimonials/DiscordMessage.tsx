import { DiscordLogo } from "@site/static/img/logos/discord";

interface DiscordMessageProps {
  username: string;
  discriminator?: string;
  avatar?: string;
  message: string;
  timestamp?: string;
}

const truncate = (str: string | null, length: number) => {
  if (!str) return str;

  // Use Array.from to properly count Unicode characters (including emojis and Japanese characters)
  const chars = Array.from(str);
  if (chars.length <= length) return str;

  return `${chars.slice(0, length - 3).join("")}...`;
};

export function DiscordMessage({
  username,
  discriminator,
  avatar,
  message,
  timestamp,
}: DiscordMessageProps) {
  // Truncate message to 181 characters
  const truncatedMessage = truncate(message, 141);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-lg border p-4 backdrop-blur-md border-white/10 border-solid h-[170px]">
        {/* Discord Header - matching TweetHeader structure */}
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
              <div className="w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center border border-transparent">
                <span className="text-white font-semibold text-lg">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* User Info */}
            <div>
              <span className="flex items-center no-decoration no-underline text-[#dcdcdc] whitespace-nowrap font-semibold">
                {username}
                {discriminator && (
                  <span className="ml-1 text-gray-500 text-sm">#{discriminator}</span>
                )}
              </span>
              <div className="flex items-center space-x-1">
                {timestamp && <span className="ml-1 text-gray-500 text-sm">{timestamp}</span>}
              </div>
            </div>
          </div>

          {/* Discord Logo - matching X logo position */}
          <DiscordLogo className="w-5 h-5 text-[#5865F2]" />
        </div>

        {/* Message Content - matching TweetBody structure */}
        <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter text-sm flex-1 overflow-hidden">
          {truncatedMessage}
        </div>
      </div>
    </div>
  );
}
