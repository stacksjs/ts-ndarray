declare module 'jpgx' {
  interface DecodeResult {
    data: Uint8Array
    width: number
    height: number
  }
  interface DecoderOptions {
    useTArray?: boolean
    colorTransform?: boolean
    formatAsRGBA?: boolean
    tolerantDecoding?: boolean
    maxResolutionInMP?: number
    maxMemoryUsageInMB?: number
  }
  interface EncodeResult {
    data: Uint8Array
    width: number
    height: number
  }
  export function decode(_jpegData: ArrayLike<number> | ArrayBuffer | Buffer, _opts?: DecoderOptions): DecodeResult
  export function encode(_imgData: { data: ArrayLike<number>, width: number, height: number }, _quality?: number): EncodeResult
  const jpeg: { decode: typeof decode, encode: typeof encode }
  export default jpeg
}
