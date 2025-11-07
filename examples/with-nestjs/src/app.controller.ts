import { Body, Controller, Get, Post } from "@nestjs/common";
import type { VoltAgentService } from "./voltagent/voltagent.service";

@Controller()
export class AppController {
  constructor(private readonly voltAgentService: VoltAgentService) {}

  @Get()
  getWelcome() {
    return {
      message: "Welcome to VoltAgent + NestJS Example",
      nestjsApp: `http://localhost:${process.env.PORT || 3000}`,
      voltAgentConsole: `http://localhost:${process.env.VOLTAGENT_PORT || 3141}`,
      endpoints: {
        process: "POST /api/process - Process text with the agent",
        welcome: "GET / - This welcome message",
      },
    };
  }

  @Post("api/process")
  async process(@Body() body: { text: string }): Promise<any> {
    if (!body.text) {
      return {
        error: "Please provide text to process",
        example: { text: "hello world" },
      };
    }

    const result = await this.voltAgentService.textAgent.generateText(
      `Convert this text to uppercase: ${body.text}`,
    );

    return {
      original: body.text,
      processed: result.text,
      usage: result.usage,
    };
  }
}
