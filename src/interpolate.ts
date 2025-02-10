import type { TensorLike } from './types'

/**
 * Interpolates a value from an array of values
 * @param arr Array of values
 * @param x X-coordinate
 * @returns {number} Interpolated value
 * @example ```ts
 * interpolate1d([1, 2, 3, 4], 1.5)
 * ```
 */
export function interpolate1d(arr: number[], x: number): number {
  const ix = Math.floor(x)
  const fx = x - ix
  const s0 = ix >= 0 && ix < arr.length
  const s1 = ix + 1 >= 0 && ix + 1 < arr.length
  const w0 = s0 ? +arr[ix] : 0.0
  const w1 = s1 ? +arr[ix + 1] : 0.0
  return (1.0 - fx) * w0 + fx * w1
}

export function interpolate2d(arr: number[][], x: number, y: number): number {
  const ix = Math.floor(x)
  const fx = x - ix
  const s0 = ix >= 0 && ix < arr.length
  const s1 = ix + 1 >= 0 && ix + 1 < arr.length
  const iy = Math.floor(y)
  const fy = y - iy
  const t0 = iy >= 0 && iy < arr[0].length
  const t1 = iy + 1 >= 0 && iy + 1 < arr[0].length
  const w00 = s0 && t0 ? arr[ix][iy] : 0.0
  const w01 = s0 && t1 ? arr[ix][iy + 1] : 0.0
  const w10 = s1 && t0 ? arr[ix + 1][iy] : 0.0
  const w11 = s1 && t1 ? arr[ix + 1][iy + 1] : 0.0
  return (1.0 - fy) * ((1.0 - fx) * w00 + fx * w10) + fy * ((1.0 - fx) * w01 + fx * w11)
}

export function reshapeTo2D(arr: TensorLike): number[][] {
  return Array.from({ length: arr.shape[0] }, (_, i) =>
    arr.data.slice(i * arr.stride[0], (i + 1) * arr.stride[0]))
}

export function interpolate3d(arr: { shape: number[], get: (x: number, y: number, z: number) => number }, x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const fx = x - ix
  const s0 = ix >= 0 && ix < arr.shape[0]
  const s1 = ix + 1 >= 0 && ix + 1 < arr.shape[0]
  const iy = Math.floor(y)
  const fy = y - iy
  const t0 = iy >= 0 && iy < arr.shape[1]
  const t1 = iy + 1 >= 0 && iy + 1 < arr.shape[1]
  const iz = Math.floor(z)
  const fz = z - iz
  const u0 = iz >= 0 && iz < arr.shape[2]
  const u1 = iz + 1 >= 0 && iz + 1 < arr.shape[2]
  const w000 = s0 && t0 && u0 ? arr.get(ix, iy, iz) : 0.0
  const w010 = s0 && t1 && u0 ? arr.get(ix, iy + 1, iz) : 0.0
  const w100 = s1 && t0 && u0 ? arr.get(ix + 1, iy, iz) : 0.0
  const w110 = s1 && t1 && u0 ? arr.get(ix + 1, iy + 1, iz) : 0.0
  const w001 = s0 && t0 && u1 ? arr.get(ix, iy, iz + 1) : 0.0
  const w011 = s0 && t1 && u1 ? arr.get(ix, iy + 1, iz + 1) : 0.0
  const w101 = s1 && t0 && u1 ? arr.get(ix + 1, iy, iz + 1) : 0.0
  const w111 = s1 && t1 && u1 ? arr.get(ix + 1, iy + 1, iz + 1) : 0.0

  return (1.0 - fz) * ((1.0 - fy) * ((1.0 - fx) * w000 + fx * w100) + fy * ((1.0 - fx) * w010 + fx * w110)) + fz * ((1.0 - fy) * ((1.0 - fx) * w001 + fx * w101) + fy * ((1.0 - fx) * w011 + fx * w111))
}

export function interpolateNd(arr: TensorLike, ...coords: number[]): number {
  const d = arr.shape.length | 0
  const ix: number[] = Array.from({ length: d })
  const fx: number[] = Array.from({ length: d })
  const s0: boolean[] = Array.from({ length: d })
  const s1: boolean[] = Array.from({ length: d })
  let i
  let t

  for (i = 0; i < d; ++i) {
    t = coords[i] // Changed from arguments[i + 1] to coords[i]
    ix[i] = Math.floor(t)
    fx[i] = t - ix[i]
    s0[i] = (ix[i] >= 0 && ix[i] < arr.shape[i])
    s1[i] = (ix[i] + 1 >= 0 && ix[i] + 1 < arr.shape[i])
  }

  let r = 0.0
  let j
  let w
  let idx

  for (i = 0; i < (1 << d); ++i) {
    w = 1.0
    idx = arr.offset

    for (j = 0; j < d; ++j) {
      if (i & (1 << j)) {
        if (!s1[j]) {
          continue
        }

        w *= fx[j]
        idx += arr.stride[j] * (ix[j] + 1)
      }
      else {
        if (!s0[j]) {
          continue
        }

        w *= 1.0 - fx[j]
        idx += arr.stride[j] * ix[j]
      }
    }

    r += w * arr.data[idx]
  }

  return r
}

export function interpolate(arr: TensorLike, x?: number, y?: number, z?: number): number {
  switch (arr.shape.length) {
    case 0:
      return 0.0
    case 1:
      return interpolate1d(arr.data, x!)
    case 2:
      return interpolate2d(reshapeTo2D(arr), x!, y!)
    case 3:
      return interpolate3d(arr, x!, y!, z!)
    default:
      return interpolateNd(arr, ...[x, y, z].slice(0, arr.shape.length) as number[])
  }
}
