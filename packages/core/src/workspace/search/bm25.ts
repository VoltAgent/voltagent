export type WorkspaceBm25Document = {
  id: string;
  path: string;
  length: number;
  termFreq: Map<string, number>;
  metadata?: Record<string, unknown>;
};

export type WorkspaceBm25Options = {
  k1?: number;
  b?: number;
};

const DEFAULT_K1 = 1.5;
const DEFAULT_B = 0.75;

const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 0);
};

const buildTermFreq = (tokens: string[]): Map<string, number> => {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
};

export class WorkspaceBm25Index {
  private readonly k1: number;
  private readonly b: number;
  private readonly docs = new Map<string, WorkspaceBm25Document>();
  private readonly docFreq = new Map<string, number>();
  private totalDocs = 0;
  private totalLength = 0;

  constructor(options: WorkspaceBm25Options = {}) {
    this.k1 = options.k1 ?? DEFAULT_K1;
    this.b = options.b ?? DEFAULT_B;
  }

  getDocument(id: string): WorkspaceBm25Document | undefined {
    return this.docs.get(id);
  }

  addDocument(params: {
    id: string;
    path: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): void {
    if (this.docs.has(params.id)) {
      this.removeDocument(params.id);
    }

    const tokens = tokenize(params.content);
    const termFreq = buildTermFreq(tokens);
    const uniqueTerms = new Set(termFreq.keys());

    for (const term of uniqueTerms) {
      this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
    }

    const doc: WorkspaceBm25Document = {
      id: params.id,
      path: params.path,
      length: tokens.length,
      termFreq,
      metadata: params.metadata,
    };

    this.docs.set(params.id, doc);
    this.totalDocs += 1;
    this.totalLength += tokens.length;
  }

  removeDocument(id: string): void {
    const doc = this.docs.get(id);
    if (!doc) {
      return;
    }

    const uniqueTerms = new Set(doc.termFreq.keys());
    for (const term of uniqueTerms) {
      const current = this.docFreq.get(term);
      if (!current) {
        continue;
      }
      if (current <= 1) {
        this.docFreq.delete(term);
      } else {
        this.docFreq.set(term, current - 1);
      }
    }

    this.docs.delete(id);
    this.totalDocs = Math.max(0, this.totalDocs - 1);
    this.totalLength = Math.max(0, this.totalLength - doc.length);
  }

  search(
    query: string,
    options: {
      limit?: number;
      filter?: (doc: WorkspaceBm25Document) => boolean;
    } = {},
  ): Array<{ id: string; score: number }> {
    const tokens = tokenize(query);
    if (tokens.length === 0 || this.totalDocs === 0) {
      return [];
    }

    const queryTerms = Array.from(new Set(tokens));
    const rawAvgDocLength = this.totalDocs > 0 ? this.totalLength / this.totalDocs : 0;
    const avgDocLength = rawAvgDocLength > 0 ? rawAvgDocLength : 1;
    const scores = new Map<string, number>();

    for (const doc of this.docs.values()) {
      if (options.filter && !options.filter(doc)) {
        continue;
      }

      let score = 0;
      for (const term of queryTerms) {
        const tf = doc.termFreq.get(term) ?? 0;
        if (tf === 0) {
          continue;
        }

        const df = this.docFreq.get(term) ?? 0;
        if (df === 0) {
          continue;
        }

        const idf = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + (this.b * doc.length) / avgDocLength);
        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        scores.set(doc.id, score);
      }
    }

    const results = Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);

    if (options.limit !== undefined) {
      return results.slice(0, options.limit);
    }

    return results;
  }
}

export const tokenizeSearchText = tokenize;
