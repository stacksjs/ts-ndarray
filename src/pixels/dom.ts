import path from 'node:path'
import parseDataURI from 'data-uri-to-buffer'
import { Reader as GifReader } from 'ts-gif'
import ndarray from '../index'
import { convert as pack } from '../pack/convert'

function defaultImage(url: string, cb: any) {
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = function () {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const context = canvas.getContext('2d')
    context.drawImage(img, 0, 0)
    const pixels = context.getImageData(0, 0, img.width, img.height)
    cb(null, ndarray(new Uint8Array(pixels.data), [img.width, img.height, 4], [4, 4 * img.width, 1], 0))
  }
  img.onerror = function (err) {
    cb(err)
  }
  img.src = url
}

// Animated gif loading
function handleGif(data, cb) {
  let reader
  try {
    reader = new GifReader(data)
  }
  catch (err) {
    cb(err)
    return
  }
  if (reader.numFrames() > 0) {
    var nshape = [reader.numFrames(), reader.height, reader.width, 4]
    try {
      var ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2] * nshape[3])
      var result = ndarray(ndata, nshape)
      for (let i = 0; i < reader.numFrames(); ++i) {
        reader.decodeAndBlitFrameRGBA(i, ndata.subarray(
          result.index(i, 0, 0, 0),
          result.index(i + 1, 0, 0, 0),
        ))
      }
    }
    catch (err) {
      cb(err)
      return
    }
    cb(null, result.transpose(0, 2, 1))
  }
  else {
    var nshape = [reader.height, reader.width, 4]
    var ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2])
    var result = ndarray(ndata, nshape)
    try {
      reader.decodeAndBlitFrameRGBA(0, ndata)
    }
    catch (err) {
      cb(err)
      return
    }
    cb(null, result.transpose(1, 0))
  }
}

function httpGif(url, cb) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'arraybuffer'
  if (xhr.overrideMimeType) {
    xhr.overrideMimeType('application/binary')
  }
  xhr.onerror = function (err) {
    cb(err)
  }
  xhr.onload = function () {
    if (xhr.readyState !== 4) {
      return
    }
    const data = new Uint8Array(xhr.response)
    handleGif(data, cb)
  }
  xhr.send()
}

function copyBuffer(buffer) {
  if (buffer[0] === undefined) {
    const n = buffer.length
    const result = new Uint8Array(n)
    for (let i = 0; i < n; ++i) {
      result[i] = buffer.get(i)
    }
    return result
  }
  else {
    return new Uint8Array(buffer)
  }
}

function dataGif(url, cb) {
  process.nextTick(() => {
    try {
      const buffer = parseDataURI(url)
      if (buffer) {
        handleGif(copyBuffer(buffer), cb)
      }
      else {
        cb(new Error('Error parsing data URI'))
      }
    }
    catch (err) {
      cb(err)
    }
  })
}

module.exports = function getPixels(url, type, cb) {
  if (!cb) {
    cb = type
    type = ''
  }
  switch (type || path.extname(url).toUpperCase()) {
    case '.GIF':
      httpGif(url, cb)
      break
    default:
      if (Buffer.isBuffer(url)) {
        url = `data:${type};base64,${url.toString('base64')}`
      }
      if (url.indexOf('data:image/gif;') === 0) {
        dataGif(url, cb)
      }
      else {
        defaultImage(url, cb)
      }
  }
}
