import { getBot } from "@/lib/bot";
import { after } from "next/server";

type RouteParams = {
  params: Promise<{
    platform: string;
  }>;
};

export async function POST(request: Request, context: RouteParams) {
  let bot: ReturnType<typeof getBot>;

  try {
    bot = getBot();
  } catch (error) {
    console.error("Failed to initialize Chat SDK bot:", error);
    return new Response(
      "Chat SDK bot is not configured. Set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET.",
      { status: 500 },
    );
  }

  const { platform } = await context.params;
  const handler = bot.webhooks[platform as keyof typeof bot.webhooks];

  if (!handler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}
