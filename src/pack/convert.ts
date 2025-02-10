import ndarray from '../index'

const do_convert = require('./doConvert.js')

export function convert(arr, result) {
  const shape = []
  let c = arr
  let sz = 1

  while (Array.isArray(c)) {
    shape.push(c.length)
    sz *= c.length
    c = c[0]
  }

  if (shape.length === 0) {
    return ndarray()
  }

  if (!result) {
    result = ndarray(new Float64Array(sz), shape)
  }

  do_convert(result, arr)
  return result
}
