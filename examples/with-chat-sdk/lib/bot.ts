import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";
import { Actions, Button, Card, CardText, Chat, Divider } from "chat";
import { slackAssistantAgent } from "./agent";

let botInstance: Chat | null = null;

function createBot() {
  const bot = new Chat({
    userName: "voltagentbot",
    adapters: {
      slack: createSlackAdapter(),
    },
    state: createRedisState(),
  });

  bot.onNewMention(async (thread) => {
    await thread.subscribe();
    await thread.post(
      Card({
        title: "VoltAgent + Chat SDK",
        children: [
          CardText("I am now subscribed to this thread."),
          CardText(
            "Send a follow-up message and I will answer with VoltAgent. You can also try button actions.",
          ),
          Divider(),
          Actions([
            Button({ id: "hello", label: "Say Hello", style: "primary" }),
            Button({ id: "info", label: "Show Info" }),
          ]),
        ],
      }),
    );
  });

  bot.onSubscribedMessage(async (thread, message) => {
    const incomingText = message.text?.trim();

    if (!incomingText) {
      await thread.post("I can only process text messages for now.");
      return;
    }

    const { text } = await slackAssistantAgent.generateText(
      [
        "Respond to this Slack message as a concise and friendly teammate.",
        `Message: ${incomingText}`,
      ].join("\n"),
    );

    await thread.post(text || "I could not generate a response. Please try again.");
  });

  bot.onAction("hello", async (event) => {
    await event.thread.post(`Hello, ${event.user.fullName}!`);
  });

  bot.onAction("info", async (event) => {
    await event.thread.post(`You are chatting over ${event.thread.adapter.name}.`);
  });

  return bot;
}

export function getBot() {
  if (!botInstance) {
    botInstance = createBot();
  }

  return botInstance;
}
