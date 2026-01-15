import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { Agent } from "../agent/agent";
import { createWorkflowChain } from "./chain";
import { createWorkflow } from "./core";
import { andThen } from "./steps";

describe("workflow chain - type inference", () => {
  // Mock agent for testing - we just need the type, not a real instance
  const mockAgent = {} as Agent;

  describe("Basic Type Inference", () => {
    it("should infer data flow through workflow chain", () => {
      const workflow = createWorkflowChain({
        id: "test-basic",
        name: "Test Basic",
        input: z.object({ userId: z.string() }),
        result: z.object({ finalName: z.string() }),
      })
        .andThen({
          id: "step1",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{ userId: string }>();
            return { userId: data.userId, firstName: "John" };
          },
        })
        .andThen({
          id: "step2",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{ userId: string; firstName: string }>();
            return { ...data, lastName: "Doe" };
          },
        })
        .andThen({
          id: "step3",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{
              userId: string;
              firstName: string;
              lastName: string;
            }>();
            return { finalName: `${data.firstName} ${data.lastName}` };
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should handle type inference with createWorkflow variadic args", () => {
      const workflow = createWorkflow(
        {
          id: "test-variadic",
          name: "Test Variadic",
          input: z.object({ value: z.number() }),
          result: z.object({ doubled: z.number() }),
        },
        andThen({
          id: "double",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{ value: number }>();
            return { doubled: data.value * 2 };
          },
        }),
      );

      expectTypeOf(workflow).not.toBeNever();
    });
  });

  describe("Step Schema Type Inference", () => {
    describe("inputSchema", () => {
      it("should use inputSchema type when provided", () => {
        const workflow = createWorkflowChain({
          id: "test-input-schema",
          name: "Test Input Schema",
          input: z.object({ userId: z.string() }),
          result: z.object({ result: z.string() }),
        })
          .andThen({
            id: "step1",
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ userId: string }>();
              return { userId: data.userId, name: "John", age: 30 };
            },
          })
          .andThen({
            id: "step2",
            inputSchema: z.object({
              customField: z.number(),
              anotherField: z.boolean(),
            }),
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{
                customField: number;
                anotherField: boolean;
              }>();

              // @ts-expect-error - properties from previous step should not exist
              data.userId;
              // @ts-expect-error
              data.name;
              // @ts-expect-error
              data.age;

              return { result: "processed" };
            },
          });

        expectTypeOf(workflow).not.toBeNever();
      });

      it("should allow inputSchema-only configuration", () => {
        const workflow = createWorkflowChain({
          id: "test-input-only",
          name: "Test Input Only",
          input: z.object({ start: z.string() }),
          result: z.object({ end: z.string() }),
        }).andThen({
          id: "transform",
          inputSchema: z.object({ value: z.number() }),
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{ value: number }>();
            return { computed: data.value * 2, end: String(data.value) };
          },
        });

        expectTypeOf(workflow).not.toBeNever();
      });
    });

    describe("outputSchema", () => {
      it("should enforce outputSchema type", () => {
        const workflow = createWorkflowChain({
          id: "test-output-schema",
          name: "Test Output Schema",
          input: z.object({ input: z.string() }),
          result: z.object({ final: z.number() }),
        })
          .andThen({
            id: "step1",
            outputSchema: z.object({ processed: z.boolean(), count: z.number() }),
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ input: string }>();
              return { processed: true, count: 42 };
            },
          })
          .andThen({
            id: "step2",
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ processed: boolean; count: number }>();
              return { final: data.count };
            },
          });

        expectTypeOf(workflow).not.toBeNever();
      });

      it("should allow outputSchema-only configuration", () => {
        const workflow = createWorkflowChain({
          id: "test-output-only",
          name: "Test Output Only",
          input: z.object({ value: z.string() }),
          result: z.object({ done: z.boolean() }),
        })
          .andThen({
            id: "process",
            outputSchema: z.object({ status: z.enum(["success", "failure"]) }),
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ value: string }>();
              return { status: "success" as const };
            },
          })
          .andThen({
            id: "complete",
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ status: "success" | "failure" }>();
              return { done: data.status === "success" };
            },
          });

        expectTypeOf(workflow).not.toBeNever();
      });
    });

    describe("Combined schemas", () => {
      it("should handle both inputSchema and outputSchema", () => {
        const workflow = createWorkflowChain({
          id: "test-combined",
          name: "Test Combined",
          input: z.object({ original: z.string() }),
          result: z.object({ transformed: z.boolean() }),
        })
          .andThen({
            id: "step1",
            execute: async ({ data }) => {
              return { ...data, extra: 123 };
            },
          })
          .andThen({
            id: "step2",
            inputSchema: z.object({ required: z.number() }),
            outputSchema: z.object({ valid: z.boolean() }),
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ required: number }>();
              // @ts-expect-error - original should not exist
              data.original;
              return { valid: data.required > 0 };
            },
          })
          .andThen({
            id: "step3",
            execute: async ({ data }) => {
              expectTypeOf(data).toEqualTypeOf<{ valid: boolean }>();
              return { transformed: data.valid };
            },
          });

        expectTypeOf(workflow).not.toBeNever();
      });
    });
  });

  describe("Suspend/Resume Type Inference", () => {
    it("should infer suspendSchema from workflow config", () => {
      const workflow = createWorkflowChain({
        id: "test-suspend",
        name: "Test Suspend",
        input: z.object({ value: z.number() }),
        result: z.object({ processed: z.boolean() }),
        suspendSchema: z.object({
          currentValue: z.number(),
          timestamp: z.string(),
          reason: z.string().optional(),
        }),
      }).andThen({
        id: "step1",
        execute: async ({ suspend }) => {
          // Should accept valid suspend data
          await suspend("test", {
            currentValue: 42,
            timestamp: new Date().toISOString(),
          });

          // Should accept optional fields
          await suspend("test", {
            currentValue: 42,
            timestamp: new Date().toISOString(),
            reason: "optional",
          });

          return { processed: true };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should infer resumeSchema from workflow config", () => {
      const workflow = createWorkflowChain({
        id: "test-resume",
        name: "Test Resume",
        input: z.object({ id: z.string() }),
        result: z.object({ status: z.string() }),
        resumeSchema: z.object({
          approved: z.boolean(),
          approver: z.string(),
        }),
      }).andThen({
        id: "approval",
        execute: async ({ resumeData }) => {
          if (resumeData) {
            expectTypeOf(resumeData).toEqualTypeOf<{
              approved: boolean;
              approver: string;
            }>();
            return { status: resumeData.approved ? "approved" : "rejected" };
          }
          return { status: "pending" };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should use step-level resumeSchema when provided", () => {
      const workflow = createWorkflowChain({
        id: "test-step-resume",
        name: "Test Step Resume",
        input: z.object({ amount: z.number() }),
        result: z.object({ final: z.string() }),
      })
        .andThen({
          id: "check",
          resumeSchema: z.object({
            approved: z.boolean(),
            managerId: z.string(),
            comments: z.string().optional(),
          }),
          execute: async ({ data, resumeData }) => {
            if (resumeData) {
              expectTypeOf(resumeData).toEqualTypeOf<{
                approved: boolean;
                managerId: string;
                comments?: string | undefined;
              }>();

              // @ts-expect-error - nonExistentField should not exist
              resumeData.nonExistentField;

              return {
                amount: data.amount,
                status: resumeData.approved ? "approved" : "rejected",
                approvedBy: resumeData.managerId,
              };
            }
            return { amount: data.amount, status: "pending", approvedBy: "" };
          },
        })
        .andThen({
          id: "finalize",
          execute: async ({ data }) => {
            return { final: `${data.status} by ${data.approvedBy}` };
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should use step-level suspendSchema when provided", () => {
      const workflow = createWorkflowChain({
        id: "test-step-suspend",
        name: "Test Step Suspend",
        input: z.object({ task: z.string() }),
        result: z.object({ completed: z.boolean() }),
      }).andThen({
        id: "process",
        suspendSchema: z.object({
          taskId: z.string(),
          progress: z.number(),
          metadata: z.record(z.string()),
        }),
        execute: async ({ data, suspend }) => {
          // Should use step-level suspendSchema
          await suspend("checkpoint", {
            taskId: data.task,
            progress: 50,
            metadata: { stage: "processing" },
          });

          return { completed: true };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });
  });

  describe("Default Schema Behavior", () => {
    it("should allow any resumeData when no resumeSchema provided", () => {
      const workflow = createWorkflowChain({
        id: "test-default-resume",
        name: "Test Default Resume",
        input: z.object({ id: z.string() }),
        result: z.object({ done: z.boolean() }),
        // No resumeSchema provided - should default to z.ZodAny
      }).andThen({
        id: "step",
        execute: async ({ resumeData }) => {
          if (resumeData) {
            // Should be able to access any property without type errors
            const approved = resumeData.approved;
            const managerId = resumeData.managerId;
            const anyField = resumeData.someRandomField;

            expectTypeOf(approved).toEqualTypeOf<any>();
            expectTypeOf(managerId).toEqualTypeOf<any>();
            expectTypeOf(anyField).toEqualTypeOf<any>();
          }
          return { done: true };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should allow any suspendData when no suspendSchema provided", () => {
      const workflow = createWorkflowChain({
        id: "test-default-suspend",
        name: "Test Default Suspend",
        input: z.object({ value: z.number() }),
        result: z.object({ success: z.boolean() }),
        // No suspendSchema provided - should default to z.ZodAny
      }).andThen({
        id: "step",
        execute: async ({ suspend }) => {
          // Should be able to pass any data without type errors
          await suspend("reason", {
            anyField: "value",
            numberField: 123,
            nested: { object: true },
            array: [1, 2, 3],
          });

          return { success: true };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });
  });

  describe("Complex Type Scenarios", () => {
    it("should handle andAgent type inference", () => {
      const workflow = createWorkflowChain({
        id: "test-agent",
        name: "Test Agent",
        input: z.object({ prompt: z.string() }),
        result: z.object({ analysis: z.string() }),
      })
        .andThen({
          id: "prepare",
          execute: async ({ data }) => {
            return { ...data, context: "additional context" };
          },
        })
        .andAgent(async ({ data }) => `Analyze: ${data.prompt} with ${data.context}`, mockAgent, {
          schema: z.object({
            sentiment: z.enum(["positive", "negative", "neutral"]),
            keywords: z.array(z.string()),
          }),
        })
        .andThen({
          id: "format",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{
              sentiment: "positive" | "negative" | "neutral";
              keywords: string[];
            }>();
            return { analysis: `${data.sentiment}: ${data.keywords.join(", ")}` };
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should allow mapping andAgent output into existing data", () => {
      const workflow = createWorkflowChain({
        id: "test-agent-map",
        name: "Test Agent Map",
        input: z.object({ email: z.string() }),
        result: z.object({
          email: z.string(),
          emailType: z.enum(["support", "sales", "spam"]),
        }),
      })
        .andAgent(
          async ({ data }) => `Classify: ${data.email}`,
          mockAgent,
          {
            schema: z.object({
              type: z.enum(["support", "sales", "spam"]),
              priority: z.enum(["low", "medium", "high"]),
            }),
          },
          (output, { data }) => {
            expectTypeOf(output).toEqualTypeOf<{
              type: "support" | "sales" | "spam";
              priority: "low" | "medium" | "high";
            }>();
            expectTypeOf(data).toEqualTypeOf<{ email: string }>();
            return { ...data, emailType: output.type };
          },
        )
        .andThen({
          id: "finish",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{
              email: string;
              emailType: "support" | "sales" | "spam";
            }>();
            return data;
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should handle andWhen conditional type inference", () => {
      const workflow = createWorkflowChain({
        id: "test-when",
        name: "Test When",
        input: z.object({ value: z.number() }),
        result: z.object({ result: z.string() }),
      })
        .andThen({
          id: "check",
          execute: async ({ data }) => {
            return { ...data, isPositive: data.value > 0 };
          },
        })
        .andWhen({
          id: "conditional",
          condition: async ({ data }) => data.isPositive,
          step: {
            id: "positive-path",
            type: "func" as const,
            name: null,
            purpose: null,
            execute: async ({ data }) => {
              return { ...data, message: "positive value" };
            },
          },
        })
        .andThen({
          id: "final",
          execute: async ({ data }) => {
            // Type should be union of both paths
            if ("message" in data) {
              expectTypeOf(data).toEqualTypeOf<{
                value: number;
                isPositive: boolean;
                message: string;
              }>();
              return { result: data.message };
            }
            expectTypeOf(data).toEqualTypeOf<{
              value: number;
              isPositive: boolean;
            }>();
            return { result: "negative value" };
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should handle andTap without changing data type", () => {
      const workflow = createWorkflowChain({
        id: "test-tap",
        name: "Test Tap",
        input: z.object({ id: z.string() }),
        result: z.object({ id: z.string(), processed: z.boolean() }),
      })
        .andThen({
          id: "start",
          execute: async ({ data }) => {
            return { ...data, timestamp: Date.now() };
          },
        })
        .andTap({
          id: "log",
          execute: async ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{ id: string; timestamp: number }>();
          },
        })
        .andThen({
          id: "finish",
          execute: async ({ data }) => {
            // Data should be unchanged after tap
            expectTypeOf(data).toEqualTypeOf<{ id: string; timestamp: number }>();
            return { id: data.id, processed: true };
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should handle andTap with inputSchema", () => {
      const workflow = createWorkflowChain({
        id: "test-tap-schema",
        name: "Test Tap Schema",
        input: z.object({ value: z.string() }),
        result: z.object({ value: z.string() }),
      })
        .andThen({
          id: "transform",
          execute: async ({ data }) => {
            return { ...data, extra: 123, another: true };
          },
        })
        .andTap({
          id: "selective-log",
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ data }) => {
            // Should only see fields from inputSchema
            expectTypeOf(data).toEqualTypeOf<{ value: string }>();
            // @ts-expect-error - extra should not exist
            data.extra;
            // @ts-expect-error - another should not exist
            data.another;
          },
        })
        .andThen({
          id: "continue",
          execute: async ({ data }) => {
            // Original data should flow through unchanged
            expectTypeOf(data).toEqualTypeOf<{
              value: string;
              extra: number;
              another: boolean;
            }>();
            return { value: data.value };
          },
        });

      expectTypeOf(workflow).not.toBeNever();
    });
  });

  describe("Type Safety Guards", () => {
    it("should enforce result schema type", () => {
      const workflow = createWorkflowChain({
        id: "test-result",
        name: "Test Result",
        input: z.object({ input: z.string() }),
        result: z.object({ output: z.number() }),
      }).andThen({
        id: "must-return-number",
        execute: async () => {
          return { output: "string" };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });

    it("should enforce schema validation at compile time", () => {
      createWorkflowChain({
        id: "test-validation",
        name: "Test Validation",
        input: z.object({ required: z.string() }),
        result: z.object({ specific: z.number() }),
      }).andThen({
        id: "step",
        outputSchema: z.object({ specific: z.number() }),
        execute: async ({ data }) => {
          expectTypeOf(data).toEqualTypeOf<{ required: string }>();
          // Must return type matching outputSchema
          return { specific: 42 };
        },
      });
    });

    it("should handle optional fields correctly", () => {
      const workflow = createWorkflowChain({
        id: "test-optional",
        name: "Test Optional",
        input: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        result: z.object({ hasOptional: z.boolean() }),
      }).andThen({
        id: "check",
        execute: async ({ data }) => {
          expectTypeOf(data).toEqualTypeOf<{
            required: string;
            optional?: string | undefined;
          }>();
          return { hasOptional: data.optional !== undefined };
        },
      });

      expectTypeOf(workflow).not.toBeNever();
    });
  });
});
