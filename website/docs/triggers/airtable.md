# Airtable Trigger

The Airtable trigger polls your bases at a configurable interval and executes agents or workflows when records match the configured criteria.

For complete trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/docs/triggers/usage/).

**Use Cases**:

- Process new customer records
- Handle form submissions
- Sync data between systems
- Run content management workflows

## Authentication

To set up Airtable authentication:

1. Navigate to the [VoltOps Triggers page](https://console.voltagent.dev/triggers)
2. Select Airtable as the provider and click **New credential**
3. Choose between Personal Access Token or OAuth 2.0 and follow the instructions below.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/airtable-credentials.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

### Personal Access Token

**Create your token:**

1. Visit [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **+ Create new token** and name it (e.g., "VoltAgent Trigger")
3. Add the following scopes:
   ```
   data.records:read      # Fetch record data
   data.records:write     # Modify records
   schema.bases:read      # Access base structure
   ```

:::tip Required Permissions
VoltAgent uses `data.records:read` to fetch records, `data.records:write` for write operations, and `schema.bases:read` to list bases, tables, views, and fields in VoltOps Console.

See [Airtable's API documentation](https://airtable.com/developers/web/api/scopes) for scope details.
:::

### OAuth 2.0

OAuth 2.0 supports token rotation and revocable access.

**Setup steps:**

1. In VoltOps Console, start creating an Airtable credential and select **OAuth 2.0** as authentication
2. Copy the **OAuth Redirect URL** displayed in the console (e.g., `https://api.voltagent.dev/triggers/oauth/callback/airtable`)
3. Navigate to [airtable.com/create/oauth](https://airtable.com/create/oauth) and create a new OAuth integration
4. Paste the OAuth Redirect URL as the **OAuth redirect URL** in Airtable
5. Generate a **Client ID** and **Client Secret** in Airtable
6. Enable these scopes and save:
   ```
   schema.bases:read
   data.records:read
   data.records:write
   ```
7. Return to VoltOps Console and enter the **Client ID** and **Client Secret** then click **Authorize with Airtable** to complete the OAuth flow

:::note OAuth Redirect URL
The redirect URL is provided by VoltOps Console and routes the OAuth callback to the correct endpoint. You must copy this URL exactly as shown in the console, including the protocol (https://) and path.
:::

:::tip When to Use OAuth
Use OAuth 2.0 for team environments, production deployments, or credential rotation requirements. Personal Access Tokens are simpler for individual development.
:::

## Event Types

### Record Created

Triggers when a new record is added to the configured table. The trigger polls your Airtable base at the specified interval and detects new records by comparing the trigger field value against the last known value.

**Payload Structure**:

```json
{
  "provider": "airtable",
  "record": {
    "id": "recAbC123dEf456",
    "createdTime": "2025-11-07T10:30:00.000Z",
    "fields": {
      "Name": "Example Record",
      "Status": "New",
      "Created": "2025-11-07T10:30:00.000Z"
    },
    "pollAtAt": "2025-11-07T10:31:00.000Z"
  }
}
```

## Configuration Parameters

### Base

Select the [Airtable base](https://support.airtable.com/docs/airtable-bases-overview) you want to monitor. The dropdown is populated with all bases your credential has access to.

:::note No bases appearing?
Ensure your Personal Access Token has the `schema.bases:read` scope and access to the base.
:::

### Table

Select the [Airtable table](https://support.airtable.com/docs/tables-overview) within the base to monitor for new records.

:::note No tables appearing?

1. Verify your credential has access to the selected base
2. Check that the base contains at least one table
3. Refresh the credential connection
   :::

### Trigger Field

Select the field that indicates when a record was created or last modified. This field is used to determine which records are "new" since the last poll.

### View (Optional)

Configure the trigger to monitor a specific view instead of the entire table.

Leave empty to monitor all records in the table.

### Polling Interval

Set how often (in seconds) VoltOps checks for new records.

**Minimum**: 15 seconds
**Default**: 60 seconds

:::tip API Rate Limits
Airtable has rate limits on API requests. Setting too aggressive polling intervals may result in rate limit errors. Monitor your usage in VoltOps Console.

- **Lower intervals** = faster response, higher API usage, more polling operations
- **Higher intervals** = slower response, lower API usage, fewer polling operations
  :::
