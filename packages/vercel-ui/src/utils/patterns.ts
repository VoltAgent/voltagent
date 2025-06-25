import { P } from "ts-pattern";

const role = P.union("user", "assistant", "tool", "system");

export default {
  role,
  message: P.shape({ role, content: P.union(P.string, P.array(P.any)) }),
};
