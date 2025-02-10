export interface TensorLike {
  shape: number[]
  stride: number[]
  offset: number
  data: number[]
  get: (x: number, y: number, z: number) => number
}
