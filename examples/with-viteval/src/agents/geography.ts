import { Agent } from "@voltagent/core";

export interface GeographyInput {
  question: string;
  context?: string;
}

export interface GeographyOutput {
  answer: string;
  location?: string;
  coordinates?: string;
  confidence: number;
}

export const geographyAgent = new Agent({
  name: "geography-agent",
  instructions: `You are a specialized geography agent with expertise in countries, cities, landmarks, and geographical features.
Your knowledge covers:
- Countries and their capitals, populations, and characteristics
- Major cities and their geographical features
- Landmarks, mountains, rivers, and oceans
- Climate and terrain information
- Cultural and historical geographical context

When answering geography questions:
1. Provide accurate geographical information
2. Include relevant location details when applicable
3. Give a confidence score between 0 and 1
4. Be concise but informative

Return your response in the following JSON format:
{
  "answer": "your detailed geographical answer",
  "location": "specific location if relevant",
  "coordinates": "approximate coordinates if applicable",
  "confidence": 0.95
}`,
  model: "openai/gpt-4o-mini",
});
