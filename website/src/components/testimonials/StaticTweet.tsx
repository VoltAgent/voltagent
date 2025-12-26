import type { Tweet } from "react-tweet/api";
import { MagicTweet } from "../magicui/tweet-card";

interface StaticTweetProps {
  tweet: Tweet | null;
  className?: string;
}

export function StaticTweet({ tweet, className }: StaticTweetProps) {
  // If tweet is null/undefined or missing required fields, don't render anything
  // This prevents "Tweet not found" cards from appearing in the testimonials
  if (!tweet || !tweet.id_str || !tweet.user) {
    return null;
  }

  return <MagicTweet tweet={tweet} className={className} />;
}
