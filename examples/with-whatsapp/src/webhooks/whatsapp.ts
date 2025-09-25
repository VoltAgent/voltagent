import type { Agent } from "@voltagent/core";
import type { Context } from "hono";
import type { WhatsAppWebhookBody } from "../types/whatsapp";

// Send message back to WhatsApp
async function sendWhatsAppMessage(
  to: string,
  message: string,
  phoneNumberId: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API Error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}

// Handle WhatsApp verification
export async function handleWhatsAppVerification(c: Context) {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified successfully");
      return c.text(challenge || "", 200);
    }
    return c.text("Forbidden", 403);
  }

  return c.text("Bad Request", 400);
}

// Handle incoming WhatsApp messages
export async function handleWhatsAppMessage(c: Context, agent: Agent) {
  try {
    const body = await c.req.json<WhatsAppWebhookBody>();

    // Extract message details
    const entry = body.entry?.[0];
    if (!entry) {
      return c.json({ status: "no_entry" }, 200);
    }

    const changes = entry.changes?.[0];
    if (!changes?.value?.messages) {
      return c.json({ status: "no_messages" }, 200);
    }

    const phoneNumberId = changes.value.metadata.phone_number_id;
    const messages = changes.value.messages;
    const contacts = changes.value.contacts;

    // Process each message
    for (const message of messages) {
      // Only process text messages
      if (message.type !== "text" || !message.text?.body) {
        continue;
      }

      const userPhone = message.from;
      const userMessage = message.text.body;
      const _userName = contacts?.find((c) => c.wa_id === userPhone)?.profile?.name || "Customer";

      console.log(`Received message from ${userPhone}: ${userMessage}`);

      // Generate response using agent
      const response = await agent.generateText(userMessage, {
        userId: userPhone, // Use phone number as userId for context
        conversationId: `whatsapp_${userPhone}`,
      });

      // Send response back to WhatsApp
      if (response.text) {
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        if (!accessToken) {
          console.error("WhatsApp access token not configured");
          continue;
        }

        await sendWhatsAppMessage(userPhone, response.text, phoneNumberId, accessToken);
      }
    }

    // WhatsApp expects 200 OK response
    return c.json({ status: "processed" }, 200);
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    // Still return 200 to prevent WhatsApp from retrying
    return c.json({ status: "error" }, 200);
  }
}
