# Broadcasting

NumPy-style broadcasting for element-wise operations between arrays of different shapes.

## Broadcasting Rules

Broadcasting allows operations between arrays with different shapes by "stretching" smaller arrays to match larger ones.

### Rule 1: Dimension Alignment

Arrays are aligned from their trailing (rightmost) dimensions:

```typescript
// Shape [3, 4] and [4]
// Aligned as:
//   [3, 4]
//      [4]
```

### Rule 2: Compatible Dimensions

Two dimensions are compatible when:
- They are equal, or
- One of them is 1

```typescript
// Compatible:
// [5, 4] and [1, 4]  -> [5, 4]
// [5, 4] and [4]     -> [5, 4]
// [3, 1] and [1, 4]  -> [3, 4]

// Not compatible:
// [5, 4] and [5, 3]  // 4 != 3
```

### Rule 3: Result Shape

The result shape has the maximum size in each dimension:

```typescript
// [8, 1, 6, 1] and [7, 1, 5]
// Aligned:
//   [8, 1, 6, 1]
//      [7, 1, 5]
// Result: [8, 7, 6, 5]
```

## Broadcasting Examples

### Scalar Operations

```typescript
import ndarray from 'ts-ndarray'

// Add scalar to array
function addScalar(arr, scalar) {
  const result = ndarray(new Float64Array(arr.size), arr.shape.slice())
  for (let i = 0; i < arr.size; i++) {
    result.data[i] = arr.data[arr.offset + i] + scalar
  }
  return result
}

const arr = ndarray([1, 2, 3, 4], [2, 2])
const result = addScalar(arr, 10)
// [[11, 12],
//  [13, 14]]
```

### 1D to 2D Broadcasting

```typescript
// Add 1D array to each row of 2D array
function broadcastAdd(arr2d, arr1d) {
  // arr2d: [M, N], arr1d: [N]
  const result = ndarray(
    new Float64Array(arr2d.size),
    arr2d.shape.slice()
  )

  for (let i = 0; i < arr2d.shape[0]; i++) {
    for (let j = 0; j < arr2d.shape[1]; j++) {
      result.set(i, j, arr2d.get(i, j) + arr1d.get(j))
    }
  }

  return result
}

const matrix = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
// [[1, 2, 3],
//  [4, 5, 6]]

const vector = ndarray([10, 20, 30], [3])
// [10, 20, 30]

const result = broadcastAdd(matrix, vector)
// [[11, 22, 33],
//  [14, 25, 36]]
```

### Column Broadcasting

```typescript
// Add column vector to matrix
function broadcastAddColumn(arr2d, col) {
  // arr2d: [M, N], col: [M, 1] or [M]
  const result = ndarray(
    new Float64Array(arr2d.size),
    arr2d.shape.slice()
  )

  for (let i = 0; i < arr2d.shape[0]; i++) {
    const colVal = col.dimension === 1 ? col.get(i) : col.get(i, 0)
    for (let j = 0; j < arr2d.shape[1]; j++) {
      result.set(i, j, arr2d.get(i, j) + colVal)
    }
  }

  return result
}

const matrix = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
const column = ndarray([100, 200], [2])

const result = broadcastAddColumn(matrix, column)
// [[101, 102, 103],
//  [204, 205, 206]]
```

## Outer Operations

### Outer Product

```typescript
// Compute outer product of two 1D arrays
function outer(a, b) {
  const result = ndarray(
    new Float64Array(a.size * b.size),
    [a.size, b.size]
  )

  for (let i = 0; i < a.size; i++) {
    for (let j = 0; j < b.size; j++) {
      result.set(i, j, a.get(i) * b.get(j))
    }
  }

  return result
}

const a = ndarray([1, 2, 3], [3])
const b = ndarray([4, 5], [2])

const result = outer(a, b)
// [[4, 5],
//  [8, 10],
//  [12, 15]]
```

### Broadcasting Multiply

```typescript
// Element-wise multiply with broadcasting
function broadcastMultiply(a, b) {
  // Determine output shape
  const outShape = broadcastShape(a.shape, b.shape)
  const result = ndarray(
    new Float64Array(outShape.reduce((x, y) => x * y, 1)),
    outShape
  )

  // Generic broadcasting iteration
  broadcastIterate(a, b, result, (av, bv) => av * bv)

  return result
}

function broadcastShape(shapeA, shapeB) {
  const maxLen = Math.max(shapeA.length, shapeB.length)
  const result = []

  for (let i = 0; i < maxLen; i++) {
    const dimA = shapeA[shapeA.length - 1 - i] || 1
    const dimB = shapeB[shapeB.length - 1 - i] || 1

    if (dimA !== dimB && dimA !== 1 && dimB !== 1) {
      throw new Error('Shapes not broadcastable')
    }

    result.unshift(Math.max(dimA, dimB))
  }

  return result
}
```

## Broadcasting Utilities

### Check Broadcastable

```typescript
function areBroadcastable(shapeA, shapeB) {
  const maxLen = Math.max(shapeA.length, shapeB.length)

  for (let i = 0; i < maxLen; i++) {
    const dimA = shapeA[shapeA.length - 1 - i] || 1
    const dimB = shapeB[shapeB.length - 1 - i] || 1

    if (dimA !== dimB && dimA !== 1 && dimB !== 1) {
      return false
    }
  }

  return true
}

// Examples
areBroadcastable([3, 4], [4])       // true
areBroadcastable([3, 4], [1, 4])    // true
areBroadcastable([3, 4], [3, 1])    // true
areBroadcastable([3, 4], [2, 4])    // false
```

### Get Broadcast Shape

```typescript
function getBroadcastShape(shapeA, shapeB) {
  if (!areBroadcastable(shapeA, shapeB)) {
    throw new Error('Shapes not broadcastable')
  }

  const maxLen = Math.max(shapeA.length, shapeB.length)
  const result = new Array(maxLen)

  for (let i = 0; i < maxLen; i++) {
    const dimA = shapeA[shapeA.length - 1 - i] || 1
    const dimB = shapeB[shapeB.length - 1 - i] || 1
    result[maxLen - 1 - i] = Math.max(dimA, dimB)
  }

  return result
}

// Examples
getBroadcastShape([3, 4], [4])      // [3, 4]
getBroadcastShape([3, 1], [1, 4])   // [3, 4]
getBroadcastShape([8, 1, 6, 1], [7, 1, 5])  // [8, 7, 6, 5]
```

## Common Broadcasting Patterns

### Row-wise Operations

```typescript
// Subtract row mean from each row
function normalizeRows(matrix) {
  const result = ndarray(
    new Float64Array(matrix.size),
    matrix.shape.slice()
  )

  for (let i = 0; i < matrix.shape[0]; i++) {
    // Calculate row mean
    let sum = 0
    for (let j = 0; j < matrix.shape[1]; j++) {
      sum += matrix.get(i, j)
    }
    const mean = sum / matrix.shape[1]

    // Subtract mean from row
    for (let j = 0; j < matrix.shape[1]; j++) {
      result.set(i, j, matrix.get(i, j) - mean)
    }
  }

  return result
}
```

### Column-wise Operations

```typescript
// Normalize each column to [0, 1]
function normalizeColumns(matrix) {
  const result = ndarray(
    new Float64Array(matrix.size),
    matrix.shape.slice()
  )

  for (let j = 0; j < matrix.shape[1]; j++) {
    // Find min and max of column
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < matrix.shape[0]; i++) {
      const val = matrix.get(i, j)
      if (val < min) min = val
      if (val > max) max = val
    }

    // Normalize column
    const range = max - min
    for (let i = 0; i < matrix.shape[0]; i++) {
      result.set(i, j, (matrix.get(i, j) - min) / range)
    }
  }

  return result
}
```

### Batch Operations

```typescript
// Apply same operation to batch of matrices
function batchAdd(batch, matrix) {
  // batch: [B, M, N], matrix: [M, N]
  const result = ndarray(
    new Float64Array(batch.size),
    batch.shape.slice()
  )

  for (let b = 0; b < batch.shape[0]; b++) {
    for (let i = 0; i < batch.shape[1]; i++) {
      for (let j = 0; j < batch.shape[2]; j++) {
        result.set(b, i, j,
          batch.get(b, i, j) + matrix.get(i, j)
        )
      }
    }
  }

  return result
}
```

## Performance Tips

1. **Contiguous Memory** - Use row-major order for best cache performance
2. **Avoid Views in Loops** - Create views outside hot loops
3. **Use Typed Arrays** - Float64Array is faster than generic arrays
4. **Stride Awareness** - Access elements in stride order when possible

```typescript
// Good: Access in row-major order
for (let i = 0; i < arr.shape[0]; i++) {
  for (let j = 0; j < arr.shape[1]; j++) {
    process(arr.get(i, j))
  }
}

// Less efficient: Column-major access
for (let j = 0; j < arr.shape[1]; j++) {
  for (let i = 0; i < arr.shape[0]; i++) {
    process(arr.get(i, j))
  }
}
```

## Next Steps

- [Getting Started](/guide/getting-started) - Basic usage
- [Operations](/guide/operations) - Array operations
