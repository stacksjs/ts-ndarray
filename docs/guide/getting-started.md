# Getting Started

ts-ndarray is a multidimensional array library for JavaScript and TypeScript, inspired by NumPy.

## Installation

::: code-group

```sh [npm]
npm install ts-ndarray
```

```sh [pnpm]
pnpm add ts-ndarray
```

```sh [bun]
bun add ts-ndarray
```

:::

## Creating Arrays

### Basic Creation

```typescript
import ndarray from 'ts-ndarray'

// Create from array
const arr = ndarray([1, 2, 3, 4, 5, 6])

// Create with shape
const matrix = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
// Creates:
// [[1, 2, 3],
//  [4, 5, 6]]

// Create from typed array
const floatArr = ndarray(new Float64Array([1.0, 2.0, 3.0, 4.0]), [2, 2])
```

### Constructor Signature

```typescript
ndarray(data, shape?, stride?, offset?)
```

- `data` - Array or typed array containing the data
- `shape` - Array of dimension sizes (optional, defaults to `[data.length]`)
- `stride` - Array of step sizes for each dimension (optional, auto-computed)
- `offset` - Starting offset in the data array (optional, defaults to 0)

### Supported Data Types

```typescript
// Float types
ndarray(new Float32Array(n))  // dtype: 'float32'
ndarray(new Float64Array(n))  // dtype: 'float64'

// Integer types
ndarray(new Int8Array(n))     // dtype: 'int8'
ndarray(new Int16Array(n))    // dtype: 'int16'
ndarray(new Int32Array(n))    // dtype: 'int32'

// Unsigned integer types
ndarray(new Uint8Array(n))    // dtype: 'uint8'
ndarray(new Uint16Array(n))   // dtype: 'uint16'
ndarray(new Uint32Array(n))   // dtype: 'uint32'

// Clamped bytes (for images)
ndarray(new Uint8ClampedArray(n))  // dtype: 'uint8_clamped'

// BigInt types
ndarray(new BigInt64Array(n))      // dtype: 'bigint64'
ndarray(new BigUint64Array(n))     // dtype: 'biguint64'

// Generic array
ndarray([1, 2, 3])             // dtype: 'array'
```

## Accessing Elements

### Get Elements

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Get single element
const value = arr.get(0, 1)  // 2
const value2 = arr.get(1, 2) // 6

// For 1D arrays
const arr1d = ndarray([10, 20, 30])
console.log(arr1d.get(1)) // 20
```

### Set Elements

```typescript
const arr = ndarray(new Float64Array(6), [2, 3])

// Set single element
arr.set(0, 0, 1.0)
arr.set(0, 1, 2.0)
arr.set(1, 2, 6.0)
```

### Index Calculation

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Get flat index for coordinates
const index = arr.index(1, 1) // 4

// Access underlying data directly
console.log(arr.data[index]) // 5
```

## Array Properties

```typescript
const arr = ndarray(new Float64Array(24), [2, 3, 4])

// Shape - array dimensions
console.log(arr.shape)     // [2, 3, 4]

// Dimension count
console.log(arr.dimension) // 3

// Total element count
console.log(arr.size)      // 24

// Data type
console.log(arr.dtype)     // 'float64'

// Stride - memory step for each dimension
console.log(arr.stride)    // [12, 4, 1]

// Order - dimension order (fastest to slowest)
console.log(arr.order)     // [2, 1, 0]

// Offset in underlying data
console.log(arr.offset)    // 0

// Access raw data
console.log(arr.data)      // Float64Array(24)
```

## Views and Slicing

Views share memory with the original array - no data copying.

### Lo (Lower Bounds)

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3])
// [[1, 2, 3],
//  [4, 5, 6],
//  [7, 8, 9]]

// Skip first row
const view = arr.lo(1)
// [[4, 5, 6],
//  [7, 8, 9]]

// Skip first row and column
const view2 = arr.lo(1, 1)
// [[5, 6],
//  [8, 9]]
```

### Hi (Upper Bounds)

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3])

// Take first 2 rows
const view = arr.hi(2)
// [[1, 2, 3],
//  [4, 5, 6]]

// Take 2x2 submatrix
const view2 = arr.hi(2, 2)
// [[1, 2],
//  [4, 5]]
```

### Step (Strided Access)

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3])

// Every other row
const view = arr.step(2)
// [[1, 2, 3],
//  [7, 8, 9]]

// Every other element in both dimensions
const view2 = arr.step(2, 2)
// [[1, 3],
//  [7, 9]]

// Reverse rows
const reversed = arr.step(-1)
// [[7, 8, 9],
//  [4, 5, 6],
//  [1, 2, 3]]
```

### Pick (Reduce Dimension)

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])

// Pick first row (returns 1D array)
const row0 = arr.pick(0)
// [1, 2, 3]

// Pick second row
const row1 = arr.pick(1)
// [4, 5, 6]

// Pick null to skip dimension, then pick column
const col1 = arr.pick(null, 1)
// [2, 5]
```

### Transpose

```typescript
const arr = ndarray([1, 2, 3, 4, 5, 6], [2, 3])
// [[1, 2, 3],
//  [4, 5, 6]]

// Transpose
const transposed = arr.transpose(1, 0)
// [[1, 4],
//  [2, 5],
//  [3, 6]]
```

## Image Processing

### Loading Images

```typescript
import { getPixels } from 'ts-ndarray'

// Load image as ndarray
const pixels = await getPixels('image.png')

console.log(pixels.shape)  // [height, width, 4] for RGBA
console.log(pixels.dtype)  // 'uint8'

// Access pixel
const r = pixels.get(y, x, 0) // Red channel
const g = pixels.get(y, x, 1) // Green channel
const b = pixels.get(y, x, 2) // Blue channel
const a = pixels.get(y, x, 3) // Alpha channel
```

### Saving Images

```typescript
import { savePixels } from 'ts-ndarray'

// Create image data
const pixels = ndarray(new Uint8Array(100 * 100 * 4), [100, 100, 4])

// Fill with red
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    pixels.set(y, x, 0, 255) // R
    pixels.set(y, x, 1, 0)   // G
    pixels.set(y, x, 2, 0)   // B
    pixels.set(y, x, 3, 255) // A
  }
}

// Save to file
await savePixels(pixels, 'output.png')
```

## TypeScript Types

```typescript
import type { NdArray } from 'ts-ndarray'

// Type for 2D float array
type Matrix = NdArray<Float64Array>

// Type for 3D uint8 array (image)
type Image = NdArray<Uint8Array>

// Generic ndarray
function process(arr: NdArray): void {
  console.log(arr.shape)
}
```

## Next Steps

- [Operations](/guide/operations) - Array operations
- [Broadcasting](/guide/broadcasting) - Broadcasting rules
