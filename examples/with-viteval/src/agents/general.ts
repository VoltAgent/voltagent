import { Agent } from "@voltagent/core";

export interface QuestionAnsweringInput {
  question: string;
  context?: string;
}

export interface QuestionAnsweringOutput {
  answer: string;
  confidence: number;
}

export const generalAgent = new Agent({
  name: "question-answering-agent",
  instructions: `You are a helpful question-answering agent. 
Your job is to answer questions accurately and concisely.
If context is provided, use it to inform your answer.
Always provide a confidence score between 0 and 1 for your answer.

Return your response in the following JSON format:
{
  "answer": "your answer here",
  "confidence": 0.95
}`,
  model: "openai/gpt-4o-mini",
});
