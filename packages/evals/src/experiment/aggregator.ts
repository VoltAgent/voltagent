import type {
  ExperimentItemResult,
  ExperimentPassCriteria,
  ExperimentPassCriteriaEvaluation,
  ExperimentPassCriteriaInput,
  ExperimentScore,
  ExperimentSummary,
} from "./types.js";

interface ScorerAggregateState {
  id: string;
  name: string;
  threshold?: number | null;
  successCount: number;
  failureCount: number;
  errorCount: number;
  skippedCount: number;
  passCount: number;
  totalCount: number;
  sumScore: number;
  scoreCount: number;
  minScore?: number | null;
  maxScore?: number | null;
}

export interface ExperimentAggregatorState {
  startedAt: number;
  totalHint?: number;
  totalCount: number;
  completedCount: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  skippedCount: number;
  globalScoreSum: number;
  globalScoreCount: number;
  scorers: Map<string, ScorerAggregateState>;
}

export function createAggregatorState(totalHint?: number): ExperimentAggregatorState {
  return {
    startedAt: Date.now(),
    totalHint,
    totalCount: totalHint ?? 0,
    completedCount: 0,
    successCount: 0,
    failureCount: 0,
    errorCount: 0,
    skippedCount: 0,
    globalScoreSum: 0,
    globalScoreCount: 0,
    scorers: new Map(),
  };
}

export function recordAggregatorResult(
  state: ExperimentAggregatorState,
  item: ExperimentItemResult,
): void {
  state.completedCount += 1;

  switch (item.status) {
    case "passed":
      state.successCount += 1;
      break;
    case "failed":
      state.failureCount += 1;
      break;
    case "error":
      state.errorCount += 1;
      break;
    case "pending":
    case "running":
      break;
  }

  const scores = Object.values(item.scores);
  const allSkipped = scores.length > 0 && scores.every((score) => score.status === "skipped");
  if (allSkipped) {
    state.skippedCount += 1;
  }

  for (const score of scores) {
    const aggregate = getScorerAggregate(state, score.id, score.name);
    aggregate.totalCount += 1;

    if (score.threshold !== undefined && score.threshold !== null) {
      aggregate.threshold = score.threshold;
    }

    if (score.status === "success") {
      aggregate.successCount += 1;
      if (typeof score.score === "number") {
        aggregate.sumScore += score.score;
        aggregate.scoreCount += 1;
        state.globalScoreSum += score.score;
        state.globalScoreCount += 1;

        if (
          aggregate.minScore === undefined ||
          aggregate.minScore === null ||
          score.score < aggregate.minScore
        ) {
          aggregate.minScore = score.score;
        }

        if (
          aggregate.maxScore === undefined ||
          aggregate.maxScore === null ||
          score.score > aggregate.maxScore
        ) {
          aggregate.maxScore = score.score;
        }
      }

      if (score.thresholdPassed === false) {
        aggregate.failureCount += 1;
      } else {
        aggregate.passCount += 1;
      }
    } else if (score.status === "error") {
      aggregate.errorCount += 1;
    } else if (score.status === "skipped") {
      aggregate.skippedCount += 1;
    }
  }
}

export function buildAggregatorSummary(
  state: ExperimentAggregatorState,
  passCriteria: ExperimentPassCriteria[],
  completedAt?: number,
): ExperimentSummary {
  const totalCount = state.totalHint ?? state.completedCount;
  const completedCount = state.completedCount;
  const summary: ExperimentSummary = {
    totalCount,
    completedCount,
    successCount: state.successCount,
    failureCount: state.failureCount,
    errorCount: state.errorCount,
    skippedCount: state.skippedCount,
    meanScore: state.globalScoreCount > 0 ? state.globalScoreSum / state.globalScoreCount : null,
    passRate: completedCount > 0 ? state.successCount / completedCount : null,
    startedAt: state.startedAt,
    scorers: buildScorerAggregates(state),
    criteria: [],
  };

  if (completedAt !== undefined) {
    summary.completedAt = completedAt;
    summary.durationMs = completedAt - state.startedAt;
  }

  summary.criteria = evaluatePassCriteria(passCriteria, summary);
  return summary;
}

export function normalizePassCriteria(
  criteria: ExperimentPassCriteriaInput | undefined,
): ExperimentPassCriteria[] {
  if (!criteria) {
    return [];
  }

  if (Array.isArray(criteria)) {
    return [...criteria] as ExperimentPassCriteria[];
  }

  return [criteria as ExperimentPassCriteria];
}

function buildScorerAggregates(
  state: ExperimentAggregatorState,
): Record<string, import("./types.js").ExperimentScorerAggregate> {
  const result: Record<string, import("./types.js").ExperimentScorerAggregate> = {};

  for (const [id, aggregate] of state.scorers.entries()) {
    const attempts = aggregate.passCount + aggregate.failureCount;
    result[id] = {
      id,
      name: aggregate.name,
      successCount: aggregate.successCount,
      errorCount: aggregate.errorCount,
      skippedCount: aggregate.skippedCount,
      totalCount: aggregate.totalCount,
      meanScore: aggregate.scoreCount > 0 ? aggregate.sumScore / aggregate.scoreCount : null,
      minScore: aggregate.minScore ?? null,
      maxScore: aggregate.maxScore ?? null,
      passRate: attempts > 0 ? aggregate.passCount / attempts : null,
      threshold: aggregate.threshold ?? null,
    };
  }

  return result;
}

function getScorerAggregate(
  state: ExperimentAggregatorState,
  id: string,
  name: string,
): ScorerAggregateState {
  const existing = state.scorers.get(id);
  if (existing) {
    return existing;
  }
  const aggregate: ScorerAggregateState = {
    id,
    name,
    threshold: undefined,
    successCount: 0,
    failureCount: 0,
    errorCount: 0,
    skippedCount: 0,
    passCount: 0,
    totalCount: 0,
    sumScore: 0,
    scoreCount: 0,
    minScore: undefined,
    maxScore: undefined,
  };
  state.scorers.set(id, aggregate);
  return aggregate;
}

function evaluatePassCriteria(
  criteria: ExperimentPassCriteria[],
  summary: ExperimentSummary,
): ExperimentPassCriteriaEvaluation[] {
  if (!criteria.length) {
    return [];
  }

  return criteria.map((criterion) => {
    if (criterion.type === "meanScore") {
      const actual = resolveMeanScore(summary, criterion.scorerId);
      return {
        criteria: criterion,
        passed: actual !== null && actual !== undefined && actual >= criterion.min,
        actual,
      };
    }

    if (criterion.type === "passRate") {
      const actual = resolvePassRate(summary, criterion.scorerId);
      return {
        criteria: criterion,
        passed: actual !== null && actual !== undefined && actual >= criterion.min,
        actual,
      };
    }

    return {
      criteria: criterion,
      passed: false,
      actual: undefined,
    };
  });
}

function resolveMeanScore(
  summary: ExperimentSummary,
  scorerId?: string,
): number | null | undefined {
  if (!scorerId) {
    return summary.meanScore;
  }
  const scorer = summary.scorers[scorerId];
  if (!scorer) {
    return null;
  }
  return scorer.meanScore ?? null;
}

function resolvePassRate(summary: ExperimentSummary, scorerId?: string): number | null | undefined {
  if (!scorerId) {
    return summary.passRate;
  }
  const scorer = summary.scorers[scorerId];
  if (!scorer) {
    return null;
  }
  return scorer.passRate ?? null;
}
