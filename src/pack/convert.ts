import ndarray from '../index'
import { compile } from './compile'

// export function convert(arr, result) {
export function convert(arr: any, result: any): any {
  const shape = []
  let c = arr
  let sz = 1

  while (Array.isArray(c)) {
    shape.push(c.length)
    sz *= c.length
    c = c[0]
  }

  if (shape.length === 0) {
    return ndarray(new Float64Array([arr]), [1])
  }

  if (!result) {
    result = ndarray(new Float64Array(sz), shape)
  }

  compile(result, arr)

  return result
}
