import { z } from "zod";
import type { Agent } from "../../agent";
import { createWorkflowChain } from "../chain";
import { createWorkflow } from "../core";
import { andAgent, andAll, andRace, andThen, andWhen } from "../steps";

// FOR TESTING TYPES LOCALLY, will be removed later
const w = createWorkflow(
  {
    id: "foobar",
    name: "Foobar",
    purpose: "Foobar",
    input: z.object({
      type: z.enum(["foo", "bar"]),
      data: z.string(),
      options: z.object({
        includeAnalysis: z.boolean().default(true),
      }),
    }),
    result: z.object({}),
  },
  andThen(async (data, state) => {
    console.log(state.input);
    return {
      foo: "  asdf",
    };
  }),

  andAll([
    andThen(async (data) => {
      return {
        foo: "bar",
      };
    }),
  ]),
  andThen(async (data) => {
    return {
      foo: "bar",
    };
  }),
);

const x = await w.run({
  type: "foo",
  data: "test",
  options: {
    includeAnalysis: true,
  },
});
console.log(x);

const w2 = createWorkflowChain({
  id: "foobar",
  name: "Foobar",
  purpose: "Foobar",
  // input: z.object({
  //   type: z.enum(["foo", "bar"]),
  //   data: z.string(),
  // }),
  result: z.object({}),
})
  .andThen(async (data, state) => {
    console.log(state.input);
    return {
      foo: "bar",
    };
  })
  .andThen(async (data) => {
    return {
      foo: "bar",
    };
  });
