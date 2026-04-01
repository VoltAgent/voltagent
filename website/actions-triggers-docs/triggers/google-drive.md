---
title: Google Drive Trigger
---

The Google Drive trigger polls Drive for file and folder changes, then launches agents when items are created or updated. VoltOps manages OAuth, token refresh, and polling windows so you can react to new uploads or folder activity without webhook plumbing.

For trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/automations-docs/triggers/overviewusage/).

**Use Cases**:

- Process newly uploaded PDFs, images, or docs
- Mirror folder changes into another system
- Run classification or extraction on fresh files
- Watch a shared team folder for updates

## Setting Credential

Google Drive triggers use OAuth 2.0.

1. Enable the [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) in your Google Cloud project.
2. In **APIs & Services → Credentials**, create an **OAuth client ID** (type: **Web application**).
3. Add the VoltOps OAuth redirect URL shown in the console as an authorized redirect URI.
4. In VoltOps Console **Step 1 (Connection)**, create a Google Drive credential and provide the **Client ID** and **Client Secret**, then click **Authorize with Google** to complete the OAuth flow.

VoltOps requests the `https://www.googleapis.com/auth/drive` scope and refreshes tokens automatically.

## Trigger Configuration

- **Trigger Type**: `fileChanged` (any file update/create) or `folderChanged` (items under a folder).
- **Folder ID (Optional)**: Limit detection to a specific folder. Recommended for `folderChanged`.
- **MIME Type Filter (Optional)**: Array of MIME types to match (e.g., `["application/pdf", "image/png"]`).
- **Polling Interval**: How often VoltOps polls. Default 60 seconds; minimum 30 seconds.

## Event Types

- `googledrive.fileChanged` — File created or updated (delivery: Polling)
- `googledrive.folderChanged` — Item added or updated in the configured folder (delivery: Polling)

## Payload Structure

VoltOps delivers the changed file metadata with provider context:

```json
{
  "provider": "googledrive",
  "triggerType": "fileChanged",
  "folderId": null,
  "matchMimeTypes": ["application/pdf"],
  "polledAt": "2024-11-14T10:00:00.000Z",
  "fileId": "1AbCdEfGhIj",
  "file": {
    "id": "1AbCdEfGhIj",
    "name": "Quarterly-report.pdf",
    "mimeType": "application/pdf",
    "parents": ["root"],
    "modifiedTime": "2024-11-14T09:58:12.000Z",
    "createdTime": "2024-11-14T09:57:01.000Z",
    "webViewLink": "https://drive.google.com/file/d/1AbCdEfGhIj/view"
  }
}
```

## Add Target to Activate Binding

After configuring your Google Drive trigger, add a target (agent or workflow) to activate the binding. For detailed instructions on:

- Adding targets to activate bindings
- Mapping trigger data to agent inputs
- Testing triggers with sample payloads
- Deploying and monitoring triggers

See the [Add Target to Activate Binding section](https://voltagent.dev/automations-docs/triggers/overviewusage/#step-3-add-target-to-activate-binding). These steps are the same for all trigger providers.
