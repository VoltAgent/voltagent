# Gmail Actions

Send, reply, search, and fetch Gmail messages with VoltOps-managed actions—no MIME hand-crafting or
token juggling required.

## Prerequisites

1. Gmail API enabled for your Google project plus either:
   - OAuth2 credential with `accessToken` + `refreshToken` + client ID/secret, or
   - Service account with domain-wide delegation (client email, private key, and optional delegated
     user).
2. A Volt project with API keys (`pk_…`, `sk_…`).
3. Gmail credential inside Volt: **Settings → Integrations → Add Credential → Gmail**, choose OAuth2
   or Service Account, paste the values, and save. Volt returns a `cred_xxx` identifier.
4. (Recommended) Environment variables:

```bash
GMAIL_CREDENTIAL_ID=cred_xxx
```

## Available actions

- `gmail.sendEmail` – send mail with text/html bodies, CC/BCC, Reply-To, attachments, or save as a
  draft (`draft: true`).
- `gmail.replyToEmail` – reply using `threadId` or `inReplyTo` plus the same fields as send.
- `gmail.searchEmail` – search mailbox by query, sender/recipient, label, category, or timestamp
  filters.
- `gmail.getEmail` – fetch a single message by `messageId` (formats: `full`, `minimal`, `raw`,
  `metadata`).
- `gmail.getThread` – fetch an entire thread by `threadId`.

## Running Gmail actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

// Send an email
await voltops.actions.gmail.sendEmail({
  credential: { credentialId: process.env.GMAIL_CREDENTIAL_ID! },
  to: ["teammate@example.com"],
  cc: ["manager@example.com"],
  subject: "Incident update",
  htmlBody: "<p>All systems nominal.</p>",
  textBody: "All systems nominal.",
  replyTo: ["noreply@example.com"],
  attachments: [
    {
      filename: "notes.txt",
      content: Buffer.from("postmortem draft").toString("base64"),
      contentType: "text/plain",
    },
  ],
});

// Reply inside an existing thread
await voltops.actions.gmail.replyToEmail({
  credential: { credentialId: process.env.GMAIL_CREDENTIAL_ID! },
  to: ["teammate@example.com"],
  subject: "Re: Incident update",
  textBody: "Thanks for the quick fix.",
  threadId: "188b6c3a3d9a1a2b",
  inReplyTo: "<message-id@example.com>",
});

// Search and hydrate results
const search = await voltops.actions.gmail.searchEmail({
  credential: { credentialId: process.env.GMAIL_CREDENTIAL_ID! },
  query: "from:alerts@example.com after:1719700000",
  maxResults: 5,
});

// Fetch a message directly
await voltops.actions.gmail.getEmail({
  credential: { credentialId: process.env.GMAIL_CREDENTIAL_ID! },
  messageId: "188b6c3a3d9a1a2b",
  format: "full",
});
```

## Treat Gmail actions as tools

```ts
import { createTool } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/core";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const sendGmailSummary = createTool({
  name: "sendGmailSummary",
  description: "Email a summary to a stakeholder.",
  parameters: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    return await voltops.actions.gmail.sendEmail({
      credential: { credentialId: process.env.GMAIL_CREDENTIAL_ID! },
      to,
      subject,
      textBody: body,
    });
  },
});
```

Agents can now send follow-ups, reply in an existing thread, or fetch a message body as part of a
reasoning chain.

## Testing payloads in the console

- Open **Volt Console → Actions → Add Action → Gmail** and attach your Gmail credential.
- Pick the action, enter the payload (recipients, body, attachments), and run a test. Successful runs
  show Gmail’s response plus an SDK snippet you can copy.
- Set `draft: true` to create a draft without sending—useful while validating payloads.

## Troubleshooting

- `invalid_grant` or auth failures usually mean the refresh token is missing/expired or the OAuth
  app lacks offline access; re-authorize and store the new token.
- Service accounts require domain-wide delegation and a subject email if you are sending on behalf of
  a user.
- Provide at least one of `htmlBody` or `textBody`; replies also need `threadId` or `inReplyTo`.
- Attachments must be base64-encoded content (no data URLs); include `contentType` when possible.
- Inspect **Volt → Actions → Runs** for request/response bodies, retries, and Gmail error messages.
