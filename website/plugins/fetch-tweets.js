const { getTweet } = require("react-tweet/api");
const fs = require("node:fs");
const path = require("node:path");

const pick = (source, keys) => {
  if (!source) {
    return undefined;
  }

  const result = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const sanitizeArray = (items, mapper) => {
  if (!Array.isArray(items)) {
    return undefined;
  }

  const sanitized = items.map((item) => mapper(item)).filter((item) => item !== undefined);

  return sanitized.length > 0 ? sanitized : undefined;
};

const compactObject = (object) => {
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) {
      continue;
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const sanitizeUser = (user) =>
  pick(user, [
    "id_str",
    "name",
    "screen_name",
    "profile_image_url_https",
    "profile_image_shape",
    "verified",
    "is_blue_verified",
  ]);

const sanitizeEntities = (entities) => {
  if (!entities) {
    // Return a properly structured empty entities object
    return {
      hashtags: [],
      urls: [],
      user_mentions: [],
      symbols: [],
      media: [],
    };
  }

  // Ensure each entity type has indices field
  const ensureIndices = (item) => {
    if (!item.indices) {
      // Create default indices if missing
      return { ...item, indices: [0, 0] };
    }
    return item;
  };

  return {
    hashtags:
      sanitizeArray(entities.hashtags, (item) => {
        const withIndices = ensureIndices(item);
        return pick(withIndices, ["indices", "text"]);
      }) || [],
    urls:
      sanitizeArray(entities.urls, (item) => {
        const withIndices = ensureIndices(item);
        return pick(withIndices, ["indices", "url", "display_url", "expanded_url"]);
      }) || [],
    user_mentions:
      sanitizeArray(entities.user_mentions, (item) => {
        const withIndices = ensureIndices(item);
        return pick(withIndices, ["indices", "id_str", "name", "screen_name"]);
      }) || [],
    symbols:
      sanitizeArray(entities.symbols, (item) => {
        const withIndices = ensureIndices(item);
        return pick(withIndices, ["indices", "text"]);
      }) || [],
    media:
      sanitizeArray(entities.media, (item) => {
        const withIndices = ensureIndices(item);
        return pick(withIndices, ["indices", "url", "display_url", "expanded_url"]);
      }) || [],
  };
};

const sanitizePhoto = (photo) =>
  pick(photo, ["url", "width", "height", "expandedUrl", "backgroundColor"]);

const sanitizeVideo = (video) => {
  if (!video) {
    return undefined;
  }

  const variants = sanitizeArray(video.variants, (variant) => pick(variant, ["src", "type"]));

  return compactObject({
    poster: video.poster,
    variants,
  });
};

const sanitizeTweet = (tweet) => {
  if (!tweet) {
    return undefined;
  }

  const sanitized =
    compactObject({
      __typename: tweet.__typename,
      id_str: tweet.id_str,
      text: tweet.text,
      created_at: tweet.created_at,
      lang: tweet.lang,
      display_text_range: Array.isArray(tweet.display_text_range)
        ? tweet.display_text_range
        : undefined,
      entities: sanitizeEntities(tweet.entities),
      user: sanitizeUser(tweet.user),
      photos: sanitizeArray(tweet.photos, sanitizePhoto),
      video: sanitizeVideo(tweet.video),
      in_reply_to_screen_name: tweet.in_reply_to_screen_name,
      in_reply_to_status_id_str: tweet.in_reply_to_status_id_str,
    }) || {};

  if (tweet.quoted_tweet) {
    sanitized.quoted_tweet = sanitizeTweet(tweet.quoted_tweet);
  }

  return sanitized;
};

// Tweet IDs to fetch at build time
const testimonialTweetIds = [
  "1916955895709503681",
  "1930715579155202268",
  "1952223435469566004",
  "1929706642851193172",
  "1917264060225044707",
  "1950536117549486550",
  "1927072927213596780",
  "1927054751666999592",
  "1924486274448306320",
  "1924303206794059823",
  "1923352273452671399",
  "1920502438215250259",
  "1924058575485403362",
  "1916757463426302247",
  "1915200495461028321",
  "1924262217924653243",
];

async function fetchTweets() {
  console.log(`🐦 Fetching ${testimonialTweetIds.length} tweets at build time...`);

  const tweets = {};
  let successCount = 0;
  let failureCount = 0;

  for (const id of testimonialTweetIds) {
    try {
      console.log(`  Fetching tweet ${id}...`);
      const tweet = await getTweet(id);
      if (tweet) {
        tweets[id] = sanitizeTweet(tweet);
        successCount++;
      } else {
        console.warn(`  ⚠️  Tweet ${id} returned null`);
        failureCount++;
      }
    } catch (error) {
      console.error(`  ❌ Failed to fetch tweet ${id}:`, error.message);
      failureCount++;
      // Continue with other tweets even if one fails
    }
  }

  console.log(`✅ Successfully fetched ${successCount} tweets`);
  if (failureCount > 0) {
    console.log(`⚠️  Failed to fetch ${failureCount} tweets`);
  }

  return tweets;
}

module.exports = (_, __) => ({
  name: "fetch-tweets-plugin",
  async loadContent() {
    const tweets = await fetchTweets();
    return tweets;
  },
  async contentLoaded({ content, actions }) {
    const { createData } = actions;

    // Create a data file that can be imported in components
    const tweetsJson = JSON.stringify(content, null, 2);
    const tweetsJsonPath = await createData("tweets.json", tweetsJson);

    // Also save to src/data for type safety
    const dataDir = path.join(__dirname, "../src/data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(path.join(dataDir, "tweets.json"), tweetsJson);

    console.log(`💾 Saved tweet data to ${tweetsJsonPath}`);
  },
});

module.exports.sanitizeTweet = sanitizeTweet;
