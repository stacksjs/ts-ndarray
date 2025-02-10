import type { Buffer } from 'node:buffer'

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

export function compare1st(a: number[], b: number[]): number {
  return a[0] - b[0]
}
