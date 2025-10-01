import { Stagehand } from "@browserbasehq/stagehand";

class BrowserAutomationController {
  private static controllerInstance: BrowserAutomationController;
  private browserClient: Stagehand | null = null;
  private isActive = false;
  private lastActivityTime = Date.now();
  private readonly idleTimeLimit = 600000; // 10min in milliseconds
  private cleanupTimer: NodeJS.Timeout;

  private constructor() {
    // Periodic maintenance task for resource management
    this.cleanupTimer = setInterval(() => {
      this.performIdleCleanup();
    }, 60000); // Check every minute
  }

  /**
   * Factory method for obtaining controller reference
   */
  public static getController(): BrowserAutomationController {
    if (!BrowserAutomationController.controllerInstance) {
      BrowserAutomationController.controllerInstance = new BrowserAutomationController();
    }
    return BrowserAutomationController.controllerInstance;
  }

  /**
   * Retrieve or create active browser automation client
   */
  public async getBrowserClient(): Promise<Stagehand> {
    this.lastActivityTime = Date.now();

    try {
      // Create fresh client if needed
      if (!this.browserClient || !this.isActive) {
        this.browserClient = new Stagehand({
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          env: "BROWSERBASE",
        });

        try {
          await this.browserClient.init();

          this.isActive = true;
          return this.browserClient;
        } catch (setupError) {
          console.error("Browser client setup failed:", setupError);
          throw setupError;
        }
      }

      // Validate existing connection
      try {
        const _pageStatus = await this.browserClient.page.evaluate(() => document.title);

        return this.browserClient;
      } catch (connectionError) {
        // Handle disconnected sessions
        console.error("Connection validation failed:", connectionError);
        if (
          connectionError instanceof Error &&
          (connectionError.message.includes("Target page, context or browser has been closed") ||
            connectionError.message.includes("Session expired") ||
            connectionError.message.includes("context destroyed"))
        ) {
          this.browserClient = new Stagehand({
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            env: "BROWSERBASE",
          });
          await this.browserClient.init();
          this.isActive = true;
          return this.browserClient;
        }
        throw connectionError; // Propagate unexpected errors
      }
    } catch (generalError) {
      this.isActive = false;
      this.browserClient = null;
      const errorDetails =
        generalError instanceof Error ? generalError.message : String(generalError);
      throw new Error(`Browser automation client error: ${errorDetails}`);
    }
  }

  /**
   * Resource cleanup for inactive sessions
   */
  private async performIdleCleanup(): Promise<void> {
    if (!this.browserClient || !this.isActive) return;

    const currentTime = Date.now();
    const idleDuration = currentTime - this.lastActivityTime;

    if (idleDuration > this.idleTimeLimit) {
      try {
        await this.browserClient.close();
      } catch (cleanupError) {
        console.error(`Cleanup error encountered: ${cleanupError}`);
      }
      this.browserClient = null;
      this.isActive = false;
    }
  }

  /**
   * Explicit resource release method
   */
  public async terminate(): Promise<void> {
    if (this.browserClient) {
      try {
        await this.browserClient.close();
      } catch (terminationError) {
        console.error(`Termination error: ${terminationError}`);
      }
      this.browserClient = null;
      this.isActive = false;
    }
  }

  /**
   * Cleanup method for proper resource disposal
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Export singleton accessor
const automationController = BrowserAutomationController.getController();

// Compatibility wrapper for existing code
export const sessionManager = {
  ensureStagehand: () => automationController.getBrowserClient(),
  close: () => automationController.terminate(),
};
