---
title: Gmail Trigger
---

The Gmail trigger monitors your Gmail inbox for new emails using polling. When new messages arrive that match your criteria, VoltOps executes your configured agents or workflows. The trigger checks for new emails every 60 seconds.

For trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/docs/triggers/usage/).

**Use Cases**:

- Automate customer support workflows from support emails
- Route and categorize incoming messages
- Extract and process data from email attachments
- Monitor specific email labels for urgent notifications
- Trigger follow-up actions based on email content

## Setting Credential

To set up Gmail authentication, you need to create a credential. This is configured in **Step 1 (Connection)** when creating a trigger.

1. Navigate to the [VoltOps Triggers page](https://console.voltagent.dev/triggers)
2. Select Gmail as the provider
3. In the **Connection** step, either select an existing credential or create a new one
4. Choose between OAuth 2.0 or Service Account and follow the instructions below.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/gmail/gmail-credentials.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

### OAuth 2.0

OAuth 2.0 provides token rotation and revocable permissions.

**Setup steps:**

1. Log in to your Google Cloud account and go to [Google Cloud Console → APIs & Services](https://console.cloud.google.com/apis/credentials), then choose or create a project
2. If needed, configure the OAuth consent screen
3. In **Credentials**, select **+ CREATE CREDENTIALS → OAuth client ID**, set type to **Web application**
4. Under **Authorized redirect URIs**, select **+ ADD URI** and paste the VoltOps OAuth redirect URL shown in the console, then select **Create**
5. In **Enabled APIs & Services**, select **+ ENABLE APIS AND SERVICES** and enable the **Gmail API**
6. Back in **Credentials**, open your OAuth client and copy the **Client ID** and **Client Secret**
7. Enter the **Client ID** and **Client Secret** in VoltOps Console
8. Click **Authorize with Google** and grant the requested permissions in the Google authorization window

The authorization status will show "Pending - waiting for confirmation in Google" until you complete the OAuth flow.

**Required OAuth Scopes:**

VoltOps requests the following scopes during authorization:

- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.labels`
- `https://www.googleapis.com/auth/gmail.readonly`

**Additional OAuth Parameters:**

- `access_type=offline` - Enables refresh token for long-term access
- `prompt=consent` - Forces consent screen to ensure refresh token is granted
- `include_granted_scopes=true` - Enables incremental authorization

### Service Account

Service accounts provide server-to-server authentication without user interaction.

**Setup steps:**

1. Follow [Google's guide to create a service account](https://cloud.google.com/iam/docs/service-accounts-create) and download the JSON key file
2. Enable the [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) for your project

**Configure in VoltOps Console:**

Enter the values from your downloaded JSON key file:

- **Client Email**: The service account email address
- **Private Key**: The full private key (starts with `-----BEGIN PRIVATE KEY-----`)
- **Project ID**: Your Google Cloud project ID
- **Subject** (optional): Email address to impersonate for domain-wide delegation

## Trigger Configuration

After configuring credentials, you need to specify which emails to monitor.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/gmail/gmail-configuration.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Select the credential you created and configure the monitoring settings:

- **Label Filter (Optional)**: Provide a Gmail label name or ID to narrow which emails should trigger the workflow. Leave empty to monitor the entire inbox.

The trigger polls Gmail every 60 seconds to check for new messages. When new emails matching your criteria are found, VoltOps executes your configured target.

## Add Target to Activate Binding

After configuring your Gmail trigger, you need to add a target (agent or workflow) to activate the binding. For detailed instructions on:

- Adding targets to activate bindings
- Mapping trigger data to agent inputs
- Testing triggers with sample payloads
- Deploying and monitoring triggers

See the [Add Target to Activate Binding section](https://voltagent.dev/docs/triggers/usage/#step-3-add-target-to-activate-binding). These steps are the same for all trigger providers.

## Event Types

Gmail triggers support the following event type:

### New Email

Detect new emails in the configured Gmail account and optional label or search filter.

- **Delivery Method**: Polling
- **Event ID**: `gmail-new-email`

## Configuration Parameters

After setting up authentication in **Step 1 (Connection)**, configure the trigger options in **Step 2 (Configuration)**.

### Label Filter (Optional)

Provide a Gmail label name or ID to narrow which emails should trigger the workflow. Leave empty to monitor the entire inbox.

**Example:** `label:Support`

To find label IDs, see [Gmail API Labels documentation](https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list).

## Payload Structure

VoltOps wraps Gmail message data in a standardized format. The payload structure includes metadata about the trigger and the complete Gmail message information.

### Wrapper Format

All Gmail events delivered by VoltOps follow this structure:

```json
{
  "provider": "gmail",
  "message": {
    "id": "18d3e7f8c9b2a1e6",
    "threadId": "18d3e7f8c9b2a1e6",
    "labelIds": ["INBOX", "UNREAD"],
    "snippet": "This is a preview of the email content...",
    "payload": {
      "headers": [
        {
          "name": "From",
          "value": "sender@example.com"
        },
        {
          "name": "To",
          "value": "recipient@example.com"
        },
        {
          "name": "Subject",
          "value": "Email Subject Line"
        },
        {
          "name": "Date",
          "value": "Wed, 13 Nov 2024 10:30:00 -0800"
        }
      ],
      "parts": [
        {
          "mimeType": "text/plain",
          "body": {
            "data": "Base64-encoded email body content"
          }
        }
      ]
    },
    "sizeEstimate": 3452,
    "historyId": "123456",
    "internalDate": "1699896600000"
  },
  "pollAtAt": "2024-11-13T18:30:00.000Z"
}
```

For complete details on Gmail message structure, see the [Gmail API Messages documentation](https://developers.google.com/gmail/api/reference/rest/v1/users.messages).
