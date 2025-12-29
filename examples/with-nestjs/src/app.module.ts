import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { VoltAgentModule } from "./voltagent/voltagent.module";

@Module({
  imports: [VoltAgentModule],
  controllers: [AppController],
})
export class AppModule {}
