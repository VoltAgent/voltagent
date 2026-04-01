import {
  Global,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  type OnModuleDestroy,
} from "@nestjs/common";
import { VoltAgentMiddleware } from "./voltagent.middleware";
import { VoltAgentService } from "./voltagent.service";

/**
 * VoltAgent module that initializes agents and integrates the console via middleware.
 * This module is global, so VoltAgentService can be injected anywhere.
 *
 * The console is served at /voltagent/* on the same port as your NestJS app,
 * with WebSocket support at /voltagent/ws/*
 */
@Global()
@Module({
  providers: [VoltAgentService, VoltAgentMiddleware],
  exports: [VoltAgentService],
})
export class VoltAgentModule implements NestModule, OnModuleDestroy {
  constructor(private readonly voltAgentService: VoltAgentService) {}

  /**
   * Configure middleware to route /voltagent/* requests to VoltAgent console
   */
  configure(consumer: MiddlewareConsumer) {
    // Mount VoltAgent console middleware at /voltagent/*
    // This will handle all HTTP requests to the console
    // Using path-to-regexp 8.x syntax: {/*path} matches zero or more path segments
    // Matches: /voltagent, /voltagent/, /voltagent/ui, /voltagent/agents/myAgent, etc.
    consumer.apply(VoltAgentMiddleware).forRoutes("/voltagent{/*path}");
  }

  /**
   * Gracefully shutdown VoltAgent on module destruction
   */
  async onModuleDestroy() {
    await this.voltAgentService.shutdown();
  }
}
