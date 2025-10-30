/**
 * API Utility Functions
 */

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { valid: boolean; error?: string } {
  // Check if at least one AI provider API key is set
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;

  if (!hasOpenAI && !hasAnthropic && !hasGoogle && !hasGroq) {
    return {
      valid: false,
      error: "No AI provider API key found. Please set at least one API key in your .env file.",
    };
  }

  return { valid: true };
}
