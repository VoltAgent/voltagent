import { YouTubeLogo } from "@site/static/img/logos/integrations/youtube";

interface ArticleCardProps {
  title: string;
  coverImage?: string;
  excerpt?: string;
  author?: string;
  publication?: string;
  date?: string;
  url?: string;
  readTime?: string;
  // YouTube specific props
  type?: "article" | "youtube";
  videoId?: string;
  channel?: string;
  views?: string;
  duration?: string;
}

export function ArticleCard({
  title,
  coverImage,
  author,
  publication,
  url,
  type = "article",
  videoId,
  channel,
}: ArticleCardProps) {
  const isYouTube = type === "youtube";
  const thumbnailUrl =
    isYouTube && videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : coverImage;

  const CardContent = () => (
    <div className="relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-lg border p-4 backdrop-blur-md border-white/10 border-solid">
      {/* Cover Image / YouTube Thumbnail */}
      {thumbnailUrl && (
        <div className="w-full h-48 mb-2 rounded-lg overflow-hidden border border-gray-700/30 relative group">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* YouTube Play Button */}
          {isYouTube && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors duration-300">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
                <svg
                  className="w-6 h-6 text-white "
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Play video"
                >
                  <title>Play video</title>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-row justify-between tracking-tight">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <span className="flex items-center no-decoration no-underline text-[#dcdcdc] whitespace-nowrap font-semibold">
              {isYouTube ? channel || "YouTube" : publication || "Article"}
              {author && !isYouTube && (
                <span className="ml-1 text-gray-500 text-sm">by {author}</span>
              )}
            </span>
          </div>
        </div>

        {/* Icon */}
        <div className="flex-shrink-0">
          {isYouTube ? (
            <YouTubeLogo className="w-5 h-5" />
          ) : (
            <svg
              className="w-5 h-5 text-main-emerald"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-label="Article"
            >
              <title>Article</title>
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter">
        <h3 className="font-semibold text-lg mb-2 text-white line-clamp-2">
          {title}
        </h3>
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
          className="no-underline no-decoration block hover:scale-[1.02] transition-transform duration-200"
        >
          <CardContent />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <CardContent />
    </div>
  );
}
