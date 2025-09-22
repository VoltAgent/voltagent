import { Suspense } from "react";
import type { EnrichedTweet, TweetProps, TwitterComponents } from "react-tweet";
import { type Tweet, getTweet } from "react-tweet/api";

import { cn } from "@site/src/utils/index";
import { XLogo } from "@site/static/img/logos/x";

interface TwitterIconProps {
  className?: string;
  [key: string]: unknown;
}

const Verified = ({ className, ...props }: TwitterIconProps) => (
  <svg aria-label="Verified Account" viewBox="0 0 24 24" className={className} {...props}>
    <title>Verified Account</title>
    <g fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

export const truncate = (str: string | null, length: number) => {
  if (!str) return str;

  // Use Array.from to properly count Unicode characters (including emojis and Japanese characters)
  const chars = Array.from(str);
  if (chars.length <= length) return str;

  return `${chars.slice(0, length - 3).join("")}...`;
};

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("rounded-md bg-primary/10", className)} {...props} />;
};

export const TweetSkeleton = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn(
      "flex size-full max-h-max min-w-72 flex-col gap-2 rounded-lg border p-4",
      className,
    )}
    {...props}
  >
    <div className="flex flex-row gap-2">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

export const TweetNotFound = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: unknown;
}) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-2 rounded-lg border p-4",
      className,
    )}
    {...props}
  >
    <h3>Tweet not found</h3>
  </div>
);

export const TweetHeader = ({ tweet }: { tweet: EnrichedTweet }) => {
  if (!tweet || !tweet.user) {
    return null;
  }

  const tweetUrl =
    tweet.url || `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;

  return (
    <div className="flex flex-row justify-between tracking-tight">
      <div className="flex items-center space-x-2 ">
        <img
          title={`Profile picture of ${tweet.user.name}`}
          alt={tweet.user.screen_name}
          height={48}
          width={48}
          src={tweet.user.profile_image_url_https}
          className="overflow-hidden rounded-full border border-transparent"
        />
        <div>
          <span className="flex items-center no-decoration no-underline text-[#dcdcdc] whitespace-nowrap font-semibold">
            {truncate(tweet.user.name, 12)}
            {tweet.user.verified ||
              (tweet.user.is_blue_verified && (
                <Verified className="ml-1 inline size-4 text-blue-500" />
              ))}
          </span>
          <div className="flex items-center space-x-1">
            <span
              rel="noreferrer"
              className="text-sm text-gray-500 transition-all no-underline duration-75"
            >
              @{truncate(tweet.user.screen_name, 12)}
            </span>
          </div>
        </div>
      </div>
      <a href={tweetUrl} target="_blank" rel="noreferrer">
        <XLogo className="w-5 h-5 text-white" />
      </a>
    </div>
  );
};

export const TweetBody = ({ tweet }: { tweet: EnrichedTweet }) => {
  // Check if entities is iterable, fallback to text if not
  if (!tweet.entities || !Array.isArray(tweet.entities)) {
    const text = tweet.text || "";
    const truncatedText = truncate(text, 150);
    return (
      <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter">
        <span className="text-sm font-normal no-underline">{truncatedText}</span>
      </div>
    );
  }

  // Truncate the full tweet text to 165 characters
  const fullText = tweet.entities.map((entity) => entity.text).join("");
  const shouldTruncate = fullText.length > 150;

  if (shouldTruncate) {
    const truncatedText = truncate(fullText, 150);
    return (
      <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter">
        <span className="text-sm font-normal no-underline">{truncatedText}</span>
      </div>
    );
  }

  return (
    <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter">
      {tweet.entities.map((entity, idx) => {
        // Create a more meaningful key using entity type and content
        const key = `${entity.type}-${idx}-${entity.text.slice(0, 10)}`;

        switch (entity.type) {
          case "url":
          case "symbol":
          case "hashtag":
          case "mention":
            return (
              <span key={key} className="text-sm font-normal no-underline text-emerald-500">
                <span>{entity.text}</span>
              </span>
            );
          case "text":
            return (
              <span key={key} className="text-sm font-normal no-underline">
                {entity.text}
              </span>
            );
        }
      })}
    </div>
  );
};

export const TweetMedia = ({ tweet }: { tweet: EnrichedTweet }) => {
  if (!tweet.video && !tweet.photos) return null;
  return (
    <div className="flex flex-1 items-center justify-center">
      {tweet.video && (
        <video
          poster={tweet.video.poster}
          autoPlay
          loop
          muted
          playsInline
          className="rounded-xl border shadow-sm"
        >
          <source src={tweet.video.variants[0].src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      {tweet.photos && (
        <div className="relative flex transform-gpu snap-x snap-mandatory gap-4 overflow-x-auto">
          <div className="shrink-0 snap-center sm:w-2" />
          {tweet.photos.map((photo) => (
            <img
              key={photo.url}
              src={photo.url}
              title={`Photo by ${tweet.user.name}`}
              alt={tweet.text}
              className="h-64 w-5/6 shrink-0 snap-center snap-always rounded-xl border object-cover shadow-sm"
            />
          ))}
          <div className="shrink-0 snap-center sm:w-2" />
        </div>
      )}
      {!tweet.video &&
        !tweet.photos &&
        // @ts-ignore
        tweet?.card?.binding_values?.thumbnail_image_large?.image_value.url && (
          <img
            src={
              // @ts-ignore
              tweet.card.binding_values.thumbnail_image_large.image_value.url
            }
            className="h-64 rounded-xl border object-cover shadow-sm"
            alt={tweet.text}
          />
        )}
    </div>
  );
};

export const MagicTweet = ({
  tweet,
  components,
  className,
  ...props
}: {
  tweet: Tweet;
  components?: TwitterComponents;
  className?: string;
}) => {
  try {
    console.log("MagicTweet received tweet:", tweet);

    if (!tweet || !tweet.id_str || !tweet.user) {
      console.log("Tweet missing required fields, showing TweetNotFound");
      return <TweetNotFound className={className} {...props} />;
    }

    // Skip enrichTweet and use tweet data directly
    const tweetUrl = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;

    return (
      <a href={tweetUrl} target="_blank" className="no-underline no-decoration" rel="noreferrer">
        <div
          className={cn(
            "relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-lg border p-4 backdrop-blur-md border-white/10 border-solid hover:border-emerald-500 transition-colors duration-200 h-[210px]",
            className,
          )}
          {...props}
        >
          <div className="flex flex-row justify-between tracking-tight">
            <div className="flex items-center space-x-2 ">
              <img
                title={`Profile picture of ${tweet.user.name}`}
                alt={tweet.user.screen_name}
                height={48}
                width={48}
                src={tweet.user.profile_image_url_https}
                className="overflow-hidden rounded-full border border-transparent"
              />
              <div>
                <span className="flex items-center no-decoration no-underline text-[#dcdcdc] whitespace-nowrap font-semibold">
                  {truncate(tweet.user.name, 12)}
                  {(tweet.user.verified || tweet.user.is_blue_verified) && (
                    <Verified className="ml-1 inline size-4 text-blue-500" />
                  )}
                </span>
                <div className="flex items-center space-x-1">
                  <span
                    rel="noreferrer"
                    className="text-sm text-gray-500 transition-all no-underline duration-75"
                  >
                    @{truncate(tweet.user.screen_name, 12)}
                  </span>
                </div>
              </div>
            </div>
            <a href={tweetUrl} target="_blank" rel="noreferrer">
              <XLogo className="w-5 h-5 text-white" />
            </a>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="break-words text-[#dcdcdc] leading-normal tracking-tighter">
              <span className="text-sm font-normal no-underline">{truncate(tweet.text, 150)}</span>
            </div>
          </div>
          {/*  <TweetMedia tweet={enrichedTweet} /> */}
        </div>
      </a>
    );
  } catch (error) {
    console.error("Error in MagicTweet:", error, "Tweet data:", tweet);
    return <TweetNotFound className={className} {...props} />;
  }
};

/**
 * TweetCard (Server Side Only)
 */
export const TweetCard = async ({
  id,
  components,
  fallback = <TweetSkeleton />,
  onError,
  ...props
}: TweetProps & {
  className?: string;
}) => {
  const tweet = id
    ? await getTweet(id).catch((err) => {
        if (onError) {
          onError(err);
        } else {
          console.error(err);
        }
      })
    : undefined;

  if (!tweet) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound {...props} />;
  }

  return (
    <Suspense fallback={fallback}>
      <MagicTweet tweet={tweet} {...props} />
    </Suspense>
  );
};
