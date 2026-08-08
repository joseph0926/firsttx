export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = Number.isFinite(capacity) ? Math.max(1, Math.floor(capacity)) : 1;
    this.buffer = [];
  }

  push(item: T): void {
    const index = (this.head + this.size) % this.capacity;
    this.buffer[index] = item;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  getAll(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}
