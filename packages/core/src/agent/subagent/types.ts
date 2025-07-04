import type { Merge } from "type-fest";
import type { StreamPart } from "../providers";

export type SubAgentStreamPart = Merge<
  StreamPart,
  {
    subAgentId: string;
    subAgentName: string;
  }
>;

export type SupervisorSystemMessageConfig = {
  includeMemory: boolean;
  systemMessage: string;
};
