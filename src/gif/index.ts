// (c) Dean McNamee <dean@gmail.com>, 2013.
//
// https://github.com/deanm/omggif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//
// omggif is a JavaScript implementation of a GIF 89a encoder and decoder,
// including animation and compression.  It does not rely on any specific
// underlying system, so should run in the browser, Node, or Plask.

function GifWriter(buf, width, height, gopts) {
  let p = 0

  var gopts = gopts === undefined ? {} : gopts
  const loop_count = gopts.loop === undefined ? null : gopts.loop
  const global_palette = gopts.palette === undefined ? null : gopts.palette

  if (width <= 0 || height <= 0 || width > 65535 || height > 65535)
    throw new Error('Width/Height invalid.')

  function check_palette_and_num_colors(palette) {
    const num_colors = palette.length
    if (num_colors < 2 || num_colors > 256 || num_colors & (num_colors - 1)) {
      throw new Error(
        'Invalid code/color length, must be power of 2 and 2 .. 256.',
      )
    }
    return num_colors
  }

  // - Header.
  buf[p++] = 0x47; buf[p++] = 0x49; buf[p++] = 0x46 // GIF
  buf[p++] = 0x38; buf[p++] = 0x39; buf[p++] = 0x61 // 89a

  // Handling of Global Color Table (palette) and background index.
  let gp_num_colors_pow2 = 0
  let background = 0
  if (global_palette !== null) {
    let gp_num_colors = check_palette_and_num_colors(global_palette)
    while (gp_num_colors >>= 1) ++gp_num_colors_pow2
    gp_num_colors = 1 << gp_num_colors_pow2
    --gp_num_colors_pow2
    if (gopts.background !== undefined) {
      background = gopts.background
      if (background >= gp_num_colors)
        throw new Error('Background index out of range.')
      // The GIF spec states that a background index of 0 should be ignored, so
      // this is probably a mistake and you really want to set it to another
      // slot in the palette.  But actually in the end most browsers, etc end
      // up ignoring this almost completely (including for dispose background).
      if (background === 0)
        throw new Error('Background index explicitly passed as 0.')
    }
  }

  // - Logical Screen Descriptor.
  // NOTE(deanm): w/h apparently ignored by implementations, but set anyway.
  buf[p++] = width & 0xFF; buf[p++] = width >> 8 & 0xFF
  buf[p++] = height & 0xFF; buf[p++] = height >> 8 & 0xFF
  // NOTE: Indicates 0-bpp original color resolution (unused?).
  buf[p++] = (global_palette !== null ? 0x80 : 0) // Global Color Table Flag.
    | gp_num_colors_pow2 // NOTE: No sort flag (unused?).
  buf[p++] = background // Background Color Index.
  buf[p++] = 0 // Pixel aspect ratio (unused?).

  // - Global Color Table
  if (global_palette !== null) {
    for (let i = 0, il = global_palette.length; i < il; ++i) {
      const rgb = global_palette[i]
      buf[p++] = rgb >> 16 & 0xFF
      buf[p++] = rgb >> 8 & 0xFF
      buf[p++] = rgb & 0xFF
    }
  }

  if (loop_count !== null) { // Netscape block for looping.
    if (loop_count < 0 || loop_count > 65535)
      throw new Error('Loop count invalid.')
    // Extension code, label, and length.
    buf[p++] = 0x21; buf[p++] = 0xFF; buf[p++] = 0x0B
    // NETSCAPE2.0
    buf[p++] = 0x4E; buf[p++] = 0x45; buf[p++] = 0x54; buf[p++] = 0x53
    buf[p++] = 0x43; buf[p++] = 0x41; buf[p++] = 0x50; buf[p++] = 0x45
    buf[p++] = 0x32; buf[p++] = 0x2E; buf[p++] = 0x30
    // Sub-block
    buf[p++] = 0x03; buf[p++] = 0x01
    buf[p++] = loop_count & 0xFF; buf[p++] = loop_count >> 8 & 0xFF
    buf[p++] = 0x00 // Terminator.
  }

  let ended = false

  this.addFrame = function (x, y, w, h, indexed_pixels, opts) {
    if (ended === true) { --p; ended = false } // Un-end.

    opts = opts === undefined ? {} : opts

    // TODO(deanm): Bounds check x, y.  Do they need to be within the virtual
    // canvas width/height, I imagine?
    if (x < 0 || y < 0 || x > 65535 || y > 65535)
      throw new Error('x/y invalid.')

    if (w <= 0 || h <= 0 || w > 65535 || h > 65535)
      throw new Error('Width/Height invalid.')

    if (indexed_pixels.length < w * h)
      throw new Error('Not enough pixels for the frame size.')

    let using_local_palette = true
    let palette = opts.palette
    if (palette === undefined || palette === null) {
      using_local_palette = false
      palette = global_palette
    }

    if (palette === undefined || palette === null)
      throw new Error('Must supply either a local or global palette.')

    let num_colors = check_palette_and_num_colors(palette)

    // Compute the min_code_size (power of 2), destroying num_colors.
    let min_code_size = 0
    while (num_colors >>= 1) ++min_code_size
    num_colors = 1 << min_code_size // Now we can easily get it back.

    const delay = opts.delay === undefined ? 0 : opts.delay

    // From the spec:
    //     0 -   No disposal specified. The decoder is
    //           not required to take any action.
    //     1 -   Do not dispose. The graphic is to be left
    //           in place.
    //     2 -   Restore to background color. The area used by the
    //           graphic must be restored to the background color.
    //     3 -   Restore to previous. The decoder is required to
    //           restore the area overwritten by the graphic with
    //           what was there prior to rendering the graphic.
    //  4-7 -    To be defined.
    // NOTE(deanm): Dispose background doesn't really work, apparently most
    // browsers ignore the background palette index and clear to transparency.
    const disposal = opts.disposal === undefined ? 0 : opts.disposal
    if (disposal < 0 || disposal > 3) // 4-7 is reserved.
      throw new Error('Disposal out of range.')

    let use_transparency = false
    let transparent_index = 0
    if (opts.transparent !== undefined && opts.transparent !== null) {
      use_transparency = true
      transparent_index = opts.transparent
      if (transparent_index < 0 || transparent_index >= num_colors)
        throw new Error('Transparent color index.')
    }

    if (disposal !== 0 || use_transparency || delay !== 0) {
      // - Graphics Control Extension
      buf[p++] = 0x21; buf[p++] = 0xF9 // Extension / Label.
      buf[p++] = 4 // Byte size.

      buf[p++] = disposal << 2 | (use_transparency === true ? 1 : 0)
      buf[p++] = delay & 0xFF; buf[p++] = delay >> 8 & 0xFF
      buf[p++] = transparent_index // Transparent color index.
      buf[p++] = 0 // Block Terminator.
    }

    // - Image Descriptor
    buf[p++] = 0x2C // Image Seperator.
    buf[p++] = x & 0xFF; buf[p++] = x >> 8 & 0xFF // Left.
    buf[p++] = y & 0xFF; buf[p++] = y >> 8 & 0xFF // Top.
    buf[p++] = w & 0xFF; buf[p++] = w >> 8 & 0xFF
    buf[p++] = h & 0xFF; buf[p++] = h >> 8 & 0xFF
    // NOTE: No sort flag (unused?).
    // TODO(deanm): Support interlace.
    buf[p++] = using_local_palette === true ? (0x80 | (min_code_size - 1)) : 0

    // - Local Color Table
    if (using_local_palette === true) {
      for (let i = 0, il = palette.length; i < il; ++i) {
        const rgb = palette[i]
        buf[p++] = rgb >> 16 & 0xFF
        buf[p++] = rgb >> 8 & 0xFF
        buf[p++] = rgb & 0xFF
      }
    }

    p = GifWriterOutputLZWCodeStream(
      buf,
      p,
      min_code_size < 2 ? 2 : min_code_size,
      indexed_pixels,
    )

    return p
  }

  this.end = function () {
    if (ended === false) {
      buf[p++] = 0x3B // Trailer.
      ended = true
    }
    return p
  }

  this.getOutputBuffer = function () { return buf }
  this.setOutputBuffer = function (v) { buf = v }
  this.getOutputBufferPosition = function () { return p }
  this.setOutputBufferPosition = function (v) { p = v }
}

// Main compression routine, palette indexes -> LZW code stream.
// |index_stream| must have at least one entry.
function GifWriterOutputLZWCodeStream(buf, p, min_code_size, index_stream) {
  buf[p++] = min_code_size
  let cur_subblock = p++ // Pointing at the length field.

  const clear_code = 1 << min_code_size
  const code_mask = clear_code - 1
  const eoi_code = clear_code + 1
  let next_code = eoi_code + 1

  let cur_code_size = min_code_size + 1 // Number of bits per code.
  let cur_shift = 0
  // We have at most 12-bit codes, so we should have to hold a max of 19
  // bits here (and then we would write out).
  let cur = 0

  function emit_bytes_to_buffer(bit_block_size) {
    while (cur_shift >= bit_block_size) {
      buf[p++] = cur & 0xFF
      cur >>= 8; cur_shift -= 8
      if (p === cur_subblock + 256) { // Finished a subblock.
        buf[cur_subblock] = 255
        cur_subblock = p++
      }
    }
  }

  function emit_code(c) {
    cur |= c << cur_shift
    cur_shift += cur_code_size
    emit_bytes_to_buffer(8)
  }

  // I am not an expert on the topic, and I don't want to write a thesis.
  // However, it is good to outline here the basic algorithm and the few data
  // structures and optimizations here that make this implementation fast.
  // The basic idea behind LZW is to build a table of previously seen runs
  // addressed by a short id (herein called output code).  All data is
  // referenced by a code, which represents one or more values from the
  // original input stream.  All input bytes can be referenced as the same
  // value as an output code.  So if you didn't want any compression, you
  // could more or less just output the original bytes as codes (there are
  // some details to this, but it is the idea).  In order to achieve
  // compression, values greater then the input range (codes can be up to
  // 12-bit while input only 8-bit) represent a sequence of previously seen
  // inputs.  The decompressor is able to build the same mapping while
  // decoding, so there is always a shared common knowledge between the
  // encoding and decoder, which is also important for "timing" aspects like
  // how to handle variable bit width code encoding.
  //
  // One obvious but very important consequence of the table system is there
  // is always a unique id (at most 12-bits) to map the runs.  'A' might be
  // 4, then 'AA' might be 10, 'AAA' 11, 'AAAA' 12, etc.  This relationship
  // can be used for an effecient lookup strategy for the code mapping.  We
  // need to know if a run has been seen before, and be able to map that run
  // to the output code.  Since we start with known unique ids (input bytes),
  // and then from those build more unique ids (table entries), we can
  // continue this chain (almost like a linked list) to always have small
  // integer values that represent the current byte chains in the encoder.
  // This means instead of tracking the input bytes (AAAABCD) to know our
  // current state, we can track the table entry for AAAABC (it is guaranteed
  // to exist by the nature of the algorithm) and the next character D.
  // Therefor the tuple of (table_entry, byte) is guaranteed to also be
  // unique.  This allows us to create a simple lookup key for mapping input
  // sequences to codes (table indices) without having to store or search
  // any of the code sequences.  So if 'AAAA' has a table entry of 12, the
  // tuple of ('AAAA', K) for any input byte K will be unique, and can be our
  // key.  This leads to a integer value at most 20-bits, which can always
  // fit in an SMI value and be used as a fast sparse array / object key.

  // Output code for the current contents of the index buffer.
  let ib_code = index_stream[0] & code_mask // Load first input index.
  let code_table = {} // Key'd on our 20-bit "tuple".

  emit_code(clear_code) // Spec says first code should be a clear code.

  // First index already loaded, process the rest of the stream.
  for (let i = 1, il = index_stream.length; i < il; ++i) {
    const k = index_stream[i] & code_mask
    const cur_key = ib_code << 8 | k // (prev, k) unique tuple.
    const cur_code = code_table[cur_key] // buffer + k.

    // Check if we have to create a new code table entry.
    if (cur_code === undefined) { // We don't have buffer + k.
      // Emit index buffer (without k).
      // This is an inline version of emit_code, because this is the core
      // writing routine of the compressor (and V8 cannot inline emit_code
      // because it is a closure here in a different context).  Additionally
      // we can call emit_byte_to_buffer less often, because we can have
      // 30-bits (from our 31-bit signed SMI), and we know our codes will only
      // be 12-bits, so can safely have 18-bits there without overflow.
      // emit_code(ib_code);
      cur |= ib_code << cur_shift
      cur_shift += cur_code_size
      while (cur_shift >= 8) {
        buf[p++] = cur & 0xFF
        cur >>= 8; cur_shift -= 8
        if (p === cur_subblock + 256) { // Finished a subblock.
          buf[cur_subblock] = 255
          cur_subblock = p++
        }
      }

      if (next_code === 4096) { // Table full, need a clear.
        emit_code(clear_code)
        next_code = eoi_code + 1
        cur_code_size = min_code_size + 1
        code_table = {}
      }
      else { // Table not full, insert a new entry.
        // Increase our variable bit code sizes if necessary.  This is a bit
        // tricky as it is based on "timing" between the encoding and
        // decoder.  From the encoders perspective this should happen after
        // we've already emitted the index buffer and are about to create the
        // first table entry that would overflow our current code bit size.
        if (next_code >= (1 << cur_code_size))
          ++cur_code_size
        code_table[cur_key] = next_code++ // Insert into code table.
      }

      ib_code = k // Index buffer to single input k.
    }
    else {
      ib_code = cur_code // Index buffer to sequence in code table.
    }
  }

  emit_code(ib_code) // There will still be something in the index buffer.
  emit_code(eoi_code) // End Of Information.

  // Flush / finalize the sub-blocks stream to the buffer.
  emit_bytes_to_buffer(1)

  // Finish the sub-blocks, writing out any unfinished lengths and
  // terminating with a sub-block of length 0.  If we have already started
  // but not yet used a sub-block it can just become the terminator.
  if (cur_subblock + 1 === p) { // Started but unused.
    buf[cur_subblock] = 0
  }
  else { // Started and used, write length and additional terminator block.
    buf[cur_subblock] = p - cur_subblock - 1
    buf[p++] = 0
  }
  return p
}

function GifReader(buf) {
  let p = 0

  // - Header (GIF87a or GIF89a).
  if (buf[p++] !== 0x47 || buf[p++] !== 0x49 || buf[p++] !== 0x46
    || buf[p++] !== 0x38 || (buf[p++] + 1 & 0xFD) !== 0x38 || buf[p++] !== 0x61) {
    throw new Error('Invalid GIF 87a/89a header.')
  }

  // - Logical Screen Descriptor.
  const width = buf[p++] | buf[p++] << 8
  const height = buf[p++] | buf[p++] << 8
  const pf0 = buf[p++] // <Packed Fields>.
  const global_palette_flag = pf0 >> 7
  const num_global_colors_pow2 = pf0 & 0x7
  const num_global_colors = 1 << (num_global_colors_pow2 + 1)
  const background = buf[p++]
  buf[p++] // Pixel aspect ratio (unused?).

  let global_palette_offset = null
  let global_palette_size = null

  if (global_palette_flag) {
    global_palette_offset = p
    global_palette_size = num_global_colors
    p += num_global_colors * 3 // Seek past palette.
  }

  let no_eof = true

  const frames = []

  let delay = 0
  let transparent_index = null
  let disposal = 0 // 0 - No disposal specified.
  let loop_count = null

  this.width = width
  this.height = height

  while (no_eof && p < buf.length) {
    switch (buf[p++]) {
      case 0x21: // Graphics Control Extension Block
        switch (buf[p++]) {
          case 0xFF: // Application specific block
            // Try if it's a Netscape block (with animation loop counter).
            if (buf[p] !== 0x0B // 21 FF already read, check block size.
              // NETSCAPE2.0
              || buf[p + 1] == 0x4E && buf[p + 2] == 0x45 && buf[p + 3] == 0x54
              && buf[p + 4] == 0x53 && buf[p + 5] == 0x43 && buf[p + 6] == 0x41
              && buf[p + 7] == 0x50 && buf[p + 8] == 0x45 && buf[p + 9] == 0x32
              && buf[p + 10] == 0x2E && buf[p + 11] == 0x30
              // Sub-block
              && buf[p + 12] == 0x03 && buf[p + 13] == 0x01 && buf[p + 16] == 0) {
              p += 14
              loop_count = buf[p++] | buf[p++] << 8
              p++ // Skip terminator.
            }
            else { // We don't know what it is, just try to get past it.
              p += 12
              while (true) { // Seek through subblocks.
                var block_size = buf[p++]
                // Bad block size (ex: undefined from an out of bounds read).
                if (!(block_size >= 0))
                  throw new Error('Invalid block size')
                if (block_size === 0)
                  break // 0 size is terminator
                p += block_size
              }
            }
            break

          case 0xF9: // Graphics Control Extension
            if (buf[p++] !== 0x4 || buf[p + 4] !== 0)
              throw new Error('Invalid graphics extension block.')
            var pf1 = buf[p++]
            delay = buf[p++] | buf[p++] << 8
            transparent_index = buf[p++]
            if ((pf1 & 1) === 0)
              transparent_index = null
            disposal = pf1 >> 2 & 0x7
            p++ // Skip terminator.
            break

          // Plain Text Extension could be present and we just want to be able
          // to parse past it.  It follows the block structure of the comment
          // extension enough to reuse the path to skip through the blocks.
          case 0x01: // Plain Text Extension (fallthrough to Comment Extension)
          case 0xFE: // Comment Extension.
            while (true) { // Seek through subblocks.
              var block_size = buf[p++]
              // Bad block size (ex: undefined from an out of bounds read).
              if (!(block_size >= 0))
                throw new Error('Invalid block size')
              if (block_size === 0)
                break // 0 size is terminator
              // console.log(buf.slice(p, p+block_size).toString('ascii'));
              p += block_size
            }
            break

          default:
            throw new Error(
              `Unknown graphic control label: 0x${buf[p - 1].toString(16)}`,
            )
        }
        break

      case 0x2C: // Image Descriptor.
        var x = buf[p++] | buf[p++] << 8
        var y = buf[p++] | buf[p++] << 8
        var w = buf[p++] | buf[p++] << 8
        var h = buf[p++] | buf[p++] << 8
        var pf2 = buf[p++]
        var local_palette_flag = pf2 >> 7
        var interlace_flag = pf2 >> 6 & 1
        var num_local_colors_pow2 = pf2 & 0x7
        var num_local_colors = 1 << (num_local_colors_pow2 + 1)
        var palette_offset = global_palette_offset
        var palette_size = global_palette_size
        var has_local_palette = false
        if (local_palette_flag) {
          var has_local_palette = true
          palette_offset = p // Override with local palette.
          palette_size = num_local_colors
          p += num_local_colors * 3 // Seek past palette.
        }

        var data_offset = p

        p++ // codesize
        while (true) {
          var block_size = buf[p++]
          // Bad block size (ex: undefined from an out of bounds read).
          if (!(block_size >= 0))
            throw new Error('Invalid block size')
          if (block_size === 0)
            break // 0 size is terminator
          p += block_size
        }

        frames.push({
          x,
          y,
          width: w,
          height: h,
          has_local_palette,
          palette_offset,
          palette_size,
          data_offset,
          data_length: p - data_offset,
          transparent_index,
          interlaced: !!interlace_flag,
          delay,
          disposal,
        })
        break

      case 0x3B: // Trailer Marker (end of file).
        no_eof = false
        break

      default:
        throw new Error(`Unknown gif block: 0x${buf[p - 1].toString(16)}`)
        break
    }
  }

  this.numFrames = function () {
    return frames.length
  }

  this.loopCount = function () {
    return loop_count
  }

  this.frameInfo = function (frame_num) {
    if (frame_num < 0 || frame_num >= frames.length)
      throw new Error('Frame index out of range.')
    return frames[frame_num]
  }

  this.decodeAndBlitFrameBGRA = function (frame_num, pixels) {
    const frame = this.frameInfo(frame_num)
    const num_pixels = frame.width * frame.height
    const index_stream = new Uint8Array(num_pixels) // At most 8-bit indices.
    GifReaderLZWOutputIndexStream(
      buf,
      frame.data_offset,
      index_stream,
      num_pixels,
    )
    const palette_offset = frame.palette_offset

    // NOTE(deanm): It seems to be much faster to compare index to 256 than
    // to === null.  Not sure why, but CompareStub_EQ_STRICT shows up high in
    // the profile, not sure if it's related to using a Uint8Array.
    let trans = frame.transparent_index
    if (trans === null)
      trans = 256

    // We are possibly just blitting to a portion of the entire frame.
    // That is a subrect within the framerect, so the additional pixels
    // must be skipped over after we finished a scanline.
    const framewidth = frame.width
    const framestride = width - framewidth
    let xleft = framewidth // Number of subrect pixels left in scanline.

    // Output index of the top left corner of the subrect.
    const opbeg = ((frame.y * width) + frame.x) * 4
    // Output index of what would be the left edge of the subrect, one row
    // below it, i.e. the index at which an interlace pass should wrap.
    const opend = ((frame.y + frame.height) * width + frame.x) * 4
    let op = opbeg

    let scanstride = framestride * 4

    // Use scanstride to skip past the rows when interlacing.  This is skipping
    // 7 rows for the first two passes, then 3 then 1.
    if (frame.interlaced === true) {
      scanstride += width * 4 * 7 // Pass 1.
    }

    let interlaceskip = 8 // Tracking the row interval in the current pass.

    for (let i = 0, il = index_stream.length; i < il; ++i) {
      const index = index_stream[i]

      if (xleft === 0) { // Beginning of new scan line
        op += scanstride
        xleft = framewidth
        if (op >= opend) { // Catch the wrap to switch passes when interlacing.
          scanstride = framestride * 4 + width * 4 * (interlaceskip - 1)
          // interlaceskip / 2 * 4 is interlaceskip << 1.
          op = opbeg + (framewidth + framestride) * (interlaceskip << 1)
          interlaceskip >>= 1
        }
      }

      if (index === trans) {
        op += 4
      }
      else {
        const r = buf[palette_offset + index * 3]
        const g = buf[palette_offset + index * 3 + 1]
        const b = buf[palette_offset + index * 3 + 2]
        pixels[op++] = b
        pixels[op++] = g
        pixels[op++] = r
        pixels[op++] = 255
      }
      --xleft
    }
  }

  // I will go to copy and paste hell one day...
  this.decodeAndBlitFrameRGBA = function (frame_num, pixels) {
    const frame = this.frameInfo(frame_num)
    const num_pixels = frame.width * frame.height
    const index_stream = new Uint8Array(num_pixels) // At most 8-bit indices.
    GifReaderLZWOutputIndexStream(
      buf,
      frame.data_offset,
      index_stream,
      num_pixels,
    )
    const palette_offset = frame.palette_offset

    // NOTE(deanm): It seems to be much faster to compare index to 256 than
    // to === null.  Not sure why, but CompareStub_EQ_STRICT shows up high in
    // the profile, not sure if it's related to using a Uint8Array.
    let trans = frame.transparent_index
    if (trans === null)
      trans = 256

    // We are possibly just blitting to a portion of the entire frame.
    // That is a subrect within the framerect, so the additional pixels
    // must be skipped over after we finished a scanline.
    const framewidth = frame.width
    const framestride = width - framewidth
    let xleft = framewidth // Number of subrect pixels left in scanline.

    // Output index of the top left corner of the subrect.
    const opbeg = ((frame.y * width) + frame.x) * 4
    // Output index of what would be the left edge of the subrect, one row
    // below it, i.e. the index at which an interlace pass should wrap.
    const opend = ((frame.y + frame.height) * width + frame.x) * 4
    let op = opbeg

    let scanstride = framestride * 4

    // Use scanstride to skip past the rows when interlacing.  This is skipping
    // 7 rows for the first two passes, then 3 then 1.
    if (frame.interlaced === true) {
      scanstride += width * 4 * 7 // Pass 1.
    }

    let interlaceskip = 8 // Tracking the row interval in the current pass.

    for (let i = 0, il = index_stream.length; i < il; ++i) {
      const index = index_stream[i]

      if (xleft === 0) { // Beginning of new scan line
        op += scanstride
        xleft = framewidth
        if (op >= opend) { // Catch the wrap to switch passes when interlacing.
          scanstride = framestride * 4 + width * 4 * (interlaceskip - 1)
          // interlaceskip / 2 * 4 is interlaceskip << 1.
          op = opbeg + (framewidth + framestride) * (interlaceskip << 1)
          interlaceskip >>= 1
        }
      }

      if (index === trans) {
        op += 4
      }
      else {
        const r = buf[palette_offset + index * 3]
        const g = buf[palette_offset + index * 3 + 1]
        const b = buf[palette_offset + index * 3 + 2]
        pixels[op++] = r
        pixels[op++] = g
        pixels[op++] = b
        pixels[op++] = 255
      }
      --xleft
    }
  }
}

function GifReaderLZWOutputIndexStream(code_stream, p, output, output_length) {
  const min_code_size = code_stream[p++]

  const clear_code = 1 << min_code_size
  const eoi_code = clear_code + 1
  let next_code = eoi_code + 1

  let cur_code_size = min_code_size + 1 // Number of bits per code.
  // NOTE: This shares the same name as the encoder, but has a different
  // meaning here.  Here this masks each code coming from the code stream.
  let code_mask = (1 << cur_code_size) - 1
  let cur_shift = 0
  let cur = 0

  let op = 0 // Output pointer.

  let subblock_size = code_stream[p++]

  // TODO(deanm): Would using a TypedArray be any faster?  At least it would
  // solve the fast mode / backing store uncertainty.
  // var code_table = Array(4096);
  const code_table = new Int32Array(4096) // Can be signed, we only use 20 bits.

  let prev_code = null // Track code-1.

  while (true) {
    // Read up to two bytes, making sure we always 12-bits for max sized code.
    while (cur_shift < 16) {
      if (subblock_size === 0)
        break // No more data to be read.

      cur |= code_stream[p++] << cur_shift
      cur_shift += 8

      if (subblock_size === 1) { // Never let it get to 0 to hold logic above.
        subblock_size = code_stream[p++] // Next subblock.
      }
      else {
        --subblock_size
      }
    }

    // TODO(deanm): We should never really get here, we should have received
    // and EOI.
    if (cur_shift < cur_code_size)
      break

    const code = cur & code_mask
    cur >>= cur_code_size
    cur_shift -= cur_code_size

    // TODO(deanm): Maybe should check that the first code was a clear code,
    // at least this is what you're supposed to do.  But actually our encoder
    // now doesn't emit a clear code first anyway.
    if (code === clear_code) {
      // We don't actually have to clear the table.  This could be a good idea
      // for greater error checking, but we don't really do any anyway.  We
      // will just track it with next_code and overwrite old entries.

      next_code = eoi_code + 1
      cur_code_size = min_code_size + 1
      code_mask = (1 << cur_code_size) - 1

      // Don't update prev_code ?
      prev_code = null
      continue
    }
    else if (code === eoi_code) {
      break
    }

    // We have a similar situation as the decoder, where we want to store
    // variable length entries (code table entries), but we want to do in a
    // faster manner than an array of arrays.  The code below stores sort of a
    // linked list within the code table, and then "chases" through it to
    // construct the dictionary entries.  When a new entry is created, just the
    // last byte is stored, and the rest (prefix) of the entry is only
    // referenced by its table entry.  Then the code chases through the
    // prefixes until it reaches a single byte code.  We have to chase twice,
    // first to compute the length, and then to actually copy the data to the
    // output (backwards, since we know the length).  The alternative would be
    // storing something in an intermediate stack, but that doesn't make any
    // more sense.  I implemented an approach where it also stored the length
    // in the code table, although it's a bit tricky because you run out of
    // bits (12 + 12 + 8), but I didn't measure much improvements (the table
    // entries are generally not the long).  Even when I created benchmarks for
    // very long table entries the complexity did not seem worth it.
    // The code table stores the prefix entry in 12 bits and then the suffix
    // byte in 8 bits, so each entry is 20 bits.

    const chase_code = code < next_code ? code : prev_code

    // Chase what we will output, either {CODE} or {CODE-1}.
    let chase_length = 0
    let chase = chase_code
    while (chase > clear_code) {
      chase = code_table[chase] >> 8
      ++chase_length
    }

    const k = chase

    const op_end = op + chase_length + (chase_code !== code ? 1 : 0)
    if (op_end > output_length) {
      console.log('Warning, gif stream longer than expected.')
      return
    }

    // Already have the first byte from the chase, might as well write it fast.
    output[op++] = k

    op += chase_length
    let b = op // Track pointer, writing backwards.

    if (chase_code !== code) // The case of emitting {CODE-1} + k.
      output[op++] = k

    chase = chase_code
    while (chase_length--) {
      chase = code_table[chase]
      output[--b] = chase & 0xFF // Write backwards.
      chase >>= 8 // Pull down to the prefix code.
    }

    if (prev_code !== null && next_code < 4096) {
      code_table[next_code++] = prev_code << 8 | k
      // TODO(deanm): Figure out this clearing vs code growth logic better.  I
      // have an feeling that it should just happen somewhere else, for now it
      // is awkward between when we grow past the max and then hit a clear code.
      // For now just check if we hit the max 12-bits (then a clear code should
      // follow, also of course encoded in 12-bits).
      if (next_code >= code_mask + 1 && cur_code_size < 12) {
        ++cur_code_size
        code_mask = code_mask << 1 | 1
      }
    }

    prev_code = code
  }

  if (op !== output_length) {
    console.log('Warning, gif stream shorter than expected.')
  }

  return output
}

// CommonJS.
try { exports.GifWriter = GifWriter; exports.GifReader = GifReader }
