import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupVoltAgentWebSocket } from "./voltagent/voltagent-websocket.setup";
import { VoltAgentService } from "./voltagent/voltagent.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for development
  app.enableCors();

  // Setup VoltAgent WebSocket support
  // This must be done after app creation but before listening
  const voltAgentService = app.get(VoltAgentService);
  setupVoltAgentWebSocket(app, voltAgentService, "/voltagent/ws");

  // Get port from environment or use default
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`\n🚀 NestJS Application is running on: http://localhost:${port}`);
  console.log(`📊 VoltAgent Console is available at: http://localhost:${port}/voltagent`);
  console.log(`   - Swagger UI: http://localhost:${port}/voltagent/ui`);
  console.log(`   - OpenAPI Docs: http://localhost:${port}/voltagent/doc`);
  console.log(`🔌 VoltAgent WebSocket: ws://localhost:${port}/voltagent/ws`);
  console.log(`   - Logs stream: ws://localhost:${port}/voltagent/ws/logs`);
  console.log(`   - Observability: ws://localhost:${port}/voltagent/ws/observability\n`);
}

bootstrap();
