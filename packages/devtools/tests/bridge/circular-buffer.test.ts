import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../../src/bridge/circular-buffer';

describe('CircularBuffer', () => {
  it('should start empty', () => {
    const buffer = new CircularBuffer<number>(3);

    expect(buffer.length).toBe(0);
    expect(buffer.getAll()).toEqual([]);
  });

  it('should keep insertion order while below capacity', () => {
    const buffer = new CircularBuffer<number>(3);

    buffer.push(1);
    buffer.push(2);

    expect(buffer.length).toBe(2);
    expect(buffer.getAll()).toEqual([1, 2]);
  });

  it('should evict the oldest item once capacity is exceeded', () => {
    const buffer = new CircularBuffer<number>(3);

    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);

    expect(buffer.length).toBe(3);
    expect(buffer.getAll()).toEqual([2, 3, 4]);
  });

  it('should stay correct across multiple wraparounds', () => {
    const buffer = new CircularBuffer<number>(3);

    for (let i = 1; i <= 10; i++) {
      buffer.push(i);
    }

    expect(buffer.length).toBe(3);
    expect(buffer.getAll()).toEqual([8, 9, 10]);
  });

  it('should work with capacity 1', () => {
    const buffer = new CircularBuffer<string>(1);

    buffer.push('a');
    buffer.push('b');

    expect(buffer.length).toBe(1);
    expect(buffer.getAll()).toEqual(['b']);
  });

  it('should clamp capacity 0 to 1 instead of silently dropping items', () => {
    const buffer = new CircularBuffer<string>(0);

    buffer.push('a');
    buffer.push('b');

    expect(buffer.length).toBe(1);
    expect(buffer.getAll()).toEqual(['b']);
  });

  it('should clamp negative and non-finite capacity to 1', () => {
    const negative = new CircularBuffer<number>(-5);
    negative.push(1);
    negative.push(2);

    expect(negative.getAll()).toEqual([2]);

    const invalid = new CircularBuffer<number>(Number.NaN);
    invalid.push(3);
    invalid.push(4);

    expect(invalid.getAll()).toEqual([4]);
  });

  it('should floor fractional capacity', () => {
    const buffer = new CircularBuffer<number>(2.9);

    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.length).toBe(2);
    expect(buffer.getAll()).toEqual([2, 3]);
  });

  it('should reset to an empty state on clear and accept new items afterwards', () => {
    const buffer = new CircularBuffer<number>(3);

    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.getAll()).toEqual([]);

    buffer.push(5);
    buffer.push(6);

    expect(buffer.getAll()).toEqual([5, 6]);
  });

  it('should return a snapshot that is not affected by later pushes', () => {
    const buffer = new CircularBuffer<number>(3);

    buffer.push(1);
    const snapshot = buffer.getAll();
    buffer.push(2);

    expect(snapshot).toEqual([1]);
  });
});
