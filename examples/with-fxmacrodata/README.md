# VoltAgent with FXMacroData

This example gives a VoltAgent research agent tools for official macroeconomic data from [FXMacroData](https://fxmacrodata.com/documentation/reference?utm_source=github&utm_medium=referral&utm_campaign=voltagent&utm_content=readme): indicator releases with their publication times, release calendars and FX rates.

## Features

- List the indicators available for a currency (CPI, GDP, policy rate, payrolls, bond yields and more)
- Fetch released values with the period, the publication timestamp and the official source link
- Fetch the upcoming release calendar, with times in UTC and the publisher's local time
- Fetch daily FX rates for a currency pair

## Prerequisites

1. **OpenAI API Key**: Used by the example agent model
2. **FXMacroData API Key** (optional): without a key, the indicator catalogue works for every currency, and USD releases from the last 90 days (each readable 15 minutes after publication) and the USD release calendar are available. Releases and calendars for other currencies, older USD history, real-time releases and FX rates need a key, see [plans](https://fxmacrodata.com/subscribe?utm_source=github&utm_medium=referral&utm_campaign=voltagent&utm_content=readme)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   FXMACRODATA_API_KEY=
   ```

3. Run the example:

   ```bash
   pnpm dev
   ```

The agent runs on the default VoltAgent server port and exposes one agent named `macroResearchAgent`.

The server binds to `127.0.0.1`, so it is only reachable from your machine. It has no authentication and the agent spends your OpenAI and FXMacroData quota, so add authentication before changing `hostname` in `src/index.ts` to a public interface such as `0.0.0.0`.

## Tools Available

### 1. List Indicators

- **Purpose**: List indicator slugs, names, units and sources for a currency
- **Endpoint**: `GET /v1/data_catalogue/{currency}`
- **Key**: Not needed, for any currency

### 2. Get Indicator History

- **Purpose**: Released values for one indicator, newest first
- **Endpoint**: `GET /v1/announcements/{currency}/{indicator}`
- **Key**: Not needed for USD releases from the last 90 days; needed for other currencies and older history
- **Parameters**:
  - `currency`: Three-letter code such as `usd`
  - `indicator`: Slug such as `inflation` or `policy_rate`
  - `startDate`, `endDate`: Optional `YYYY-MM-DD` bounds
  - `limit`: Maximum rows (default 12)

### 3. Get Release Calendar

- **Purpose**: Scheduled releases for a currency
- **Endpoint**: `GET /v1/calendar/{currency}`
- **Key**: Not needed for USD; needed for other currencies
- **Parameters**:
  - `indicator`: Optional slug filter
  - `startDate`, `endDate`: Optional `YYYY-MM-DD` bounds

### 4. Get FX Rates

- **Purpose**: Daily rates for a currency pair
- **Endpoint**: `GET /v1/forex/{base}/{quote}`
- **Key**: Needed for every pair

## Example Prompts

- "What was the latest US CPI print and when was it published?"
- "When are the next US payrolls and CPI releases?"
- "How has the Fed's policy rate moved this year?"
- "Compare the latest euro area and UK inflation" (needs an API key)

## Notes

Each tool returns `{ success: true, data }` with the API payload unchanged in `data`, or `{ success: false, error }`, so the agent sees units, source links and data-quality fields as published. Without a key, `getIndicatorHistory` results also carry a `note` saying releases are delayed by 15 minutes and limited to the last 90 days; it quotes the API's `freemium_delay` and `freemium_window` messages, which also stay in `data`. Redirects are refused, so the key header is only ever sent to `api.fxmacrodata.com`, and the key is removed from error text. Responses are not cached; the keyless tier has a fair-use allowance of 100 requests per day.
