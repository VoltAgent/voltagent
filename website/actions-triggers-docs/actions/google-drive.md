# Google Drive Actions

VoltOps ships managed Google Drive actions so agents can list, download, upload, move, copy, delete,
and share files without manually signing requests or refreshing OAuth tokens.

## Prerequisites

1. Google Drive API enabled plus OAuth2 credentials (Volt managed app or your own). Provide
   `accessToken` + `refreshToken` + client ID/secret, or pass a valid short-lived `accessToken`.
2. A Volt project with API keys (`pk_…`, `sk_…`).
3. Google Drive credential inside Volt: **Settings → Integrations → Add Credential → Google Drive**,
   paste your OAuth values, and copy the returned `cred_xxx`.
4. (Recommended) Environment variables:

```bash
GOOGLE_DRIVE_CREDENTIAL_ID=cred_xxx
```

## Available actions

- `drive.listFiles` – list files/folders with search (`q`), ordering, pagination, and `includeTrashed`.
- `drive.getFileMetadata` – fetch metadata for a specific file.
- `drive.downloadFile` – download file content (base64 + content type).
- `drive.uploadFile` – upload binary or base64 content; supports parent folders.
- `drive.createFolder` – create a folder.
- `drive.moveFile` – move to a new parent (optionally remove previous parents).
- `drive.copyFile` – duplicate a file into another folder and/or name.
- `drive.deleteFile` – delete or move to trash depending on Drive settings.
- `drive.shareFilePublic` – create a public link (anyone with link can view).

## Running Google Drive actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

// List recent non-folder files
const list = await voltops.actions.googledrive.listFiles({
  credential: { credentialId: process.env.GOOGLE_DRIVE_CREDENTIAL_ID! },
  q: "mimeType != 'application/vnd.google-apps.folder' and trashed=false",
  orderBy: "modifiedTime desc",
  pageSize: 25,
});

// Download a file (base64)
const download = await voltops.actions.googledrive.downloadFile({
  credential: { credentialId: process.env.GOOGLE_DRIVE_CREDENTIAL_ID! },
  fileId: "file_123",
});
const fileBuffer = Buffer.from(download.responsePayload.contentBase64, "base64");

// Upload a text file (base64)
await voltops.actions.googledrive.uploadFile({
  credential: { credentialId: process.env.GOOGLE_DRIVE_CREDENTIAL_ID! },
  name: "hello.txt",
  mimeType: "text/plain",
  parents: ["root"],
  content: Buffer.from("Hello VoltAgent!").toString("base64"),
  isBase64: true,
});

// Share a file publicly
await voltops.actions.googledrive.shareFilePublic({
  credential: { credentialId: process.env.GOOGLE_DRIVE_CREDENTIAL_ID! },
  fileId: "file_123",
});
```

Each method accepts either a stored `credentialId` or inline OAuth tokens
(`accessToken` or `refreshToken` + `clientId` + `clientSecret`).

## Treat Drive actions as tools

```ts
import { Agent, createTool, VoltOpsClient } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const shareDriveFile = createTool({
  name: "shareDriveFile",
  description: "Share a Drive file publicly and return the webViewLink.",
  parameters: z.object({
    fileId: z.string(),
  }),
  execute: async ({ fileId }) => {
    const result = await voltops.actions.googledrive.shareFilePublic({
      credential: { credentialId: process.env.GOOGLE_DRIVE_CREDENTIAL_ID! },
      fileId,
    });

    return result.responsePayload;
  },
});

const driveAgent = new Agent({
  name: "Drive Assistant",
  model: openai("gpt-4o-mini"),
  instructions: "Use Google Drive to fetch or share files for the user.",
  tools: [shareDriveFile],
});
```

## Testing payloads in the console

- Open **Volt Console → Actions → Add Action → Google Drive** and attach your credential.
- Pick an action, enter the payload (`q`, `fileId`, `content`, etc.), and click **Run Test**.
- Review the response plus the SDK snippet shown in **How to use**.

## Troubleshooting

- Auth errors usually mean a missing/expired refresh token or incorrect OAuth client setup;
  re-authorize with offline access.
- Service accounts must be added to the Drive or shared folders you target.
- Set `isBase64: true` when sending base64 content; omit it when streaming binary buffers.
- `listFiles` supports pagination with `pageToken`, filtering with `q`, and excluding trash via
  `includeTrashed: false`.
- Public sharing grants anyone-with-link viewer access; use Drive’s native sharing for finer control.
- Inspect **Volt → Actions → Runs** for the Google API request/response if an action fails.
