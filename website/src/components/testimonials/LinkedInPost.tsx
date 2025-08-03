import { LinkedInLogo } from "@site/static/img/logos/linkedin";

interface LinkedInPostProps {
  profileImage: string;
  name: string;
  title?: string;
  content: string;
  url?: string;
}

const truncate = (str: string | null, length: number) => {
  if (!str) return str;

  // Use Array.from to properly count Unicode characters (including emojis and Japanese characters)
  const chars = Array.from(str);
  if (chars.length <= length) return str;

  return `${chars.slice(0, length - 3).join("")}...`;
};

export function LinkedInPost({ profileImage, name, title, content, url }: LinkedInPostProps) {
  // Truncate content to 165 characters
  const truncatedContent = truncate(content, 165);

  const PostContent = () => (
    <div className="relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-lg border p-4 backdrop-blur-md border-white/10 border-solid hover:border-emerald-500 transition-colors duration-200 h-[210px]">
      {/* LinkedIn Header - matching TweetHeader structure */}
      <div className="flex flex-row justify-between tracking-tight">
        <div className="flex items-center space-x-2">
          <img
            title={`Profile picture of ${name}`}
            alt={name}
            height={48}
            width={48}
            src={profileImage}
            className="overflow-hidden rounded-full border border-transparent"
          />
          <div>
            <span className="flex items-center no-decoration no-underline text-[#dcdcdc] whitespace-nowrap font-semibold">
              {truncate(name, 20)}
            </span>
            {title && (
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-500 transition-all no-underline duration-75">
                  {truncate(title, 30)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* LinkedIn Logo - matching X logo position */}
        <LinkedInLogo className="w-5 h-5 text-[#0077b5]" />
      </div>

      {/* Post Content - matching TweetBody structure */}
      <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter flex-1 overflow-hidden">
        <span className="text-sm font-normal no-underline">{truncatedContent}</span>
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
          <PostContent />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <PostContent />
    </div>
  );
}
