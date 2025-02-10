import type { Buffer } from 'node:buffer'

/**
 * Creates an array of numbers from 0 to n - 1
 * @param n Number of elements
 * @returns {number[]} Array of numbers
 */
export function iota(n: number): unknown[] {
  const result = Array.from({ length: n })

  for (let i = 0; i < n; ++i) {
    result[i] = i
  }

  return result
}

// thanks to https://github.com/feross/is-buffer
export function isBuffer(obj: unknown): obj is Buffer {
  return obj != null && obj.constructor != null
  // @ts-expect-error a runtime check
    && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

/**
 * Compares two arrays by their first element
 * @param a
 * @param b
 * @returns {number} -1 if a[0] < b[0], 1 if a[0] > b[0], 0 if a[0] === b[0]
 */
export function compare1st(a: number[], b: number[]): number {
  return a[0] - b[0]
}
