import type { Tweet } from "react-tweet/api";
import { MagicTweet, TweetNotFound } from "../magicui/tweet-card";

interface StaticTweetProps {
  tweet: Tweet | null;
  className?: string;
}

export function StaticTweet({ tweet, className }: StaticTweetProps) {
  console.log("StaticTweet received tweet:", tweet);

  if (!tweet) {
    console.log("Tweet is null/undefined, showing TweetNotFound");
    return <TweetNotFound />;
  }

  return <MagicTweet tweet={tweet} className={className} />;
}
