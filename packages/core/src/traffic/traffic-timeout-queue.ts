export type TimeoutQueueEntry<TItem> = {
  at: number;
  version: number;
  item: TItem;
};

export class TimeoutPriorityQueue<TItem> {
  private readonly heap: TimeoutQueueEntry<TItem>[] = [];

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  peek(): TimeoutQueueEntry<TItem> | undefined {
    return this.heap[0];
  }

  push(entry: TimeoutQueueEntry<TItem>): void {
    this.heap.push(entry);
    this.siftUp(this.heap.length - 1);
  }

  pop(): TimeoutQueueEntry<TItem> | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  clear(): void {
    this.heap.length = 0;
  }

  private siftUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(current, parent) >= 0) break;
      this.swap(current, parent);
      current = parent;
    }
  }

  private siftDown(index: number): void {
    let current = index;
    const length = this.heap.length;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (left < length && this.compare(left, smallest) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(right, smallest) < 0) {
        smallest = right;
      }

      if (smallest === current) break;
      this.swap(current, smallest);
      current = smallest;
    }
  }

  private compare(aIndex: number, bIndex: number): number {
    const a = this.heap[aIndex];
    const b = this.heap[bIndex];
    if (a.at !== b.at) return a.at - b.at;
    return a.version - b.version;
  }

  private swap(aIndex: number, bIndex: number): void {
    const temp = this.heap[aIndex];
    this.heap[aIndex] = this.heap[bIndex];
    this.heap[bIndex] = temp;
  }
}
