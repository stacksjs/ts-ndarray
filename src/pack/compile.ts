import type { NdArray } from 'ndarray'
import compiler from 'cwise-compiler'

export const compile: (a: NdArray, b: NdArray, ...args: NdArray[]) => NdArray = compiler({
  args: ['array', 'scalar', 'index'],
  pre: { body: '{}', args: [], thisVars: [], localVars: [] },
  body: { body: '{\nvar _inline_1_v=_inline_1_arg1_,_inline_1_i\nfor(_inline_1_i=0;_inline_1_i<_inline_1_arg2_.length-1;++_inline_1_i) {\n_inline_1_v=_inline_1_v[_inline_1_arg2_[_inline_1_i]]\n}\n_inline_1_arg0_=_inline_1_v[_inline_1_arg2_[_inline_1_arg2_.length-1]]\n}', args: [{ name: '_inline_1_arg0_', lvalue: true, rvalue: false, count: 1 }, { name: '_inline_1_arg1_', lvalue: false, rvalue: true, count: 1 }, { name: '_inline_1_arg2_', lvalue: false, rvalue: true, count: 4 }], thisVars: [], localVars: ['_inline_1_i', '_inline_1_v'] },
  post: { body: '{}', args: [], thisVars: [], localVars: [] },
  funcName: 'convert',
  blockSize: 64,
  debug: false,
})

export default compile
