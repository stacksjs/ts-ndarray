# Operations

Array operations and manipulations in ts-ndarray.

## Element Access

### Get and Set

```typescript
import ndarray from 'ts-ndarray'

const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Get element at (row, col)
const value = arr.get(0, 1) // 2

// Set element
arr.set(0, 1, 10)
console.log(arr.get(0, 1)) // 10
```

### Index Calculation

```typescript
const arr = ndarray(new Float64Array(12), [3, 4])

// Get flat index for multi-dimensional coordinates
const flatIndex = arr.index(1, 2) // row 1, col 2

// Direct data access
arr.data[flatIndex] = 42
```

## Slicing and Views

### Subarray with lo/hi

```typescript
const arr = ndarray([
  1, 2, 3, 4,
  5, 6, 7, 8,
  9, 10, 11, 12,
], [3, 4])

// Get rows 1-2, columns 1-3
const subarray = arr.lo(1, 1).hi(2, 2)
// [[6, 7],
//  [10, 11]]
```

### Strided Access

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [10])

// Every second element
const everySecond = arr.step(2)
// [1, 3, 5, 7, 9]

// Reverse array
const reversed = arr.step(-1)
// [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
```

### Pick Dimension

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Get row 0 as 1D array
const row = arr.pick(0)
// [1, 2, 3]

// Get column 1 as 1D array
const col = arr.pick(null, 1)
// [2, 5]
```

### Transpose

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
// [[1, 2, 3],
//  [4, 5, 6]]

const transposed = arr.transpose(1, 0)
// [[1, 4],
//  [2, 5],
//  [3, 6]]

// 3D transpose
const arr3d = ndarray(new Float64Array(24), [2, 3, 4])
const permuted = arr3d.transpose(2, 0, 1) // shape becomes [4, 2, 3]
```

## Iteration

### Manual Iteration

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Iterate over 2D array
for (let i = 0; i < arr.shape[0]; i++) {
  for (let j = 0; j < arr.shape[1]; j++) {
    console.log(`arr[${i},${j}] = ${arr.get(i, j)}`)
  }
}
```

### Flat Iteration

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Iterate over flat data
for (let i = 0; i < arr.size; i++) {
  console.log(arr.data[arr.offset + i])
}
```

## Copying Data

### Manual Copy

```typescript
const source = ndarray([1, 2, 3, 4], [2, 2])

// Create new array with same shape
const dest = ndarray(new Float64Array(source.size), source.shape)

// Copy data
for (let i = 0; i < source.shape[0]; i++) {
  for (let j = 0; j < source.shape[1]; j++) {
    dest.set(i, j, source.get(i, j))
  }
}
```

### Copy Typed Array

```typescript
const source = ndarray(new Float64Array([1, 2, 3, 4]), [2, 2])

// Copy underlying data
const dataCopy = new Float64Array(source.data)
const copy = ndarray(dataCopy, source.shape.slice())
```

## Reshaping

### Change Shape (Same Data)

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [12])

// Reshape to 3x4
const reshaped = ndarray(arr.data, [3, 4])
// Same data, different view

// Reshape to 2x2x3
const reshaped3d = ndarray(arr.data, [2, 2, 3])
```

### Flatten

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Create flattened view
const flat = ndarray(arr.data, [arr.size])
```

## Element-wise Operations

### Apply Function

```typescript
const arr = ndarray(new Float64Array([1, 2, 3, 4]), [2, 2])

// Apply function to each element (creates new array)
function map(arr, fn) {
  const result = ndarray(new Float64Array(arr.size), arr.shape.slice())
  for (let i = 0; i < arr.shape[0]; i++) {
    for (let j = 0; j < arr.shape[1]; j++) {
      result.set(i, j, fn(arr.get(i, j)))
    }
  }
  return result
}

const squared = map(arr, x => x * x)
// [[1, 4],
//  [9, 16]]
```

### In-Place Operations

```typescript
const arr = ndarray(new Float64Array([1, 2, 3, 4]), [2, 2])

// Multiply all elements by 2
for (let i = 0; i < arr.size; i++) {
  arr.data[i] *= 2
}
// [[2, 4],
//  [6, 8]]
```

## Matrix Operations

### Matrix Addition

```typescript
function add(a, b) {
  const result = ndarray(new Float64Array(a.size), a.shape.slice())
  for (let i = 0; i < a.shape[0]; i++) {
    for (let j = 0; j < a.shape[1]; j++) {
      result.set(i, j, a.get(i, j) + b.get(i, j))
    }
  }
  return result
}

const a = ndarray([1, 2, 3, 4], [2, 2])
const b = ndarray([5, 6, 7, 8], [2, 2])
const c = add(a, b)
// [[6, 8],
//  [10, 12]]
```

### Matrix Multiplication

```typescript
function matmul(a, b) {
  const m = a.shape[0]
  const n = b.shape[1]
  const k = a.shape[1]

  const result = ndarray(new Float64Array(m * n), [m, n])

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0
      for (let l = 0; l < k; l++) {
        sum += a.get(i, l) * b.get(l, j)
      }
      result.set(i, j, sum)
    }
  }

  return result
}

const a = ndarray([1, 2, 3, 4], [2, 2])
const b = ndarray([5, 6, 7, 8], [2, 2])
const c = matmul(a, b)
// [[19, 22],
//  [43, 50]]
```

## Interpolation

### Linear Interpolation

```typescript
import { lerp } from 'ts-ndarray'

const arr = ndarray([0, 10, 20, 30], [4])

// Interpolate at position 1.5
const value = lerp(arr, 1.5) // 15
```

### Bilinear Interpolation (2D)

```typescript
import { bilerp } from 'ts-ndarray'

const arr = ndarray([
  0, 10,
  20, 30,
], [2, 2])

// Interpolate at (0.5, 0.5)
const value = bilerp(arr, 0.5, 0.5) // 15
```

## Reduction Operations

### Sum

```typescript
function sum(arr) {
  let total = 0
  for (let i = 0; i < arr.size; i++) {
    total += arr.data[arr.offset + i]
  }
  return total
}

const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
console.log(sum(arr)) // 21
```

### Max/Min

```typescript
function max(arr) {
  let maxVal = -Infinity
  for (let i = 0; i < arr.size; i++) {
    const val = arr.data[arr.offset + i]
    if (val > maxVal) maxVal = val
  }
  return maxVal
}

function min(arr) {
  let minVal = Infinity
  for (let i = 0; i < arr.size; i++) {
    const val = arr.data[arr.offset + i]
    if (val < minVal) minVal = val
  }
  return minVal
}
```

### Mean

```typescript
function mean(arr) {
  return sum(arr) / arr.size
}

const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
console.log(mean(arr)) // 3.5
```

## Next Steps

- [Getting Started](/guide/getting-started) - Basic usage
- [Broadcasting](/guide/broadcasting) - Broadcasting rules
