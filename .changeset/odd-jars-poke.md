---
"@voltagent/core": minor
---

implement scheduled workflow execution with cron support

### Usage

```typescript
export const scheduledReportWorkflow = createWorkflowChain({
  id: "daily-report",
  name: "Scheduled Daily Report Generator",
  purpose: "Generate daily reports",
  input: z.object({
    reportType: z.string(),
    date: z.string().optional(),
  }),
  result: z.object({
    reportGenerated: z.boolean(),
    reportPath: z.string(),
  }),
}).andThen({
  id: "generate-report",
  execute: async ({ data }) => {
    const currentDate = data.date || new Date().toISOString().split("T")[0];
    const reportPath = `/reports/${data.reportType}-${currentDate}.pdf`;

    console.log(`📊 Generating ${data.reportType} report for ${currentDate}`);

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      reportGenerated: true,
      reportPath,
    };
  },
});

// Create logger
const logger = createPinoLogger({
  name: "with-workflow-scheduled",
  level: "info",
});

new VoltAgent({
  agents: {},
  logger,
  workflows: {
    scheduledReportWorkflow,
  },
});

await scheduledReportWorkflow.scheduledRun(
  {
    reportType: "sales",
    date: "2024-01-15",
  },
  {
    schedule: {
      expression: "*/10 * * * * *",
      onResult: (result) => {
        console.log(`✅ Report generated: ${result.result.reportPath}`);
      },
    },
  }
);
```
