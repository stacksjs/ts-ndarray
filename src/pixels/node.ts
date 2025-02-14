import jpeg from 'jpgx'

import { Reader as GifReader } from 'ts-gif'
const path = require('node:path')
const ndarray = require('ndarray')
const PNG = require('pngjs').PNG
const fs = require('node:fs')
const mime = require('mime-types')
const pack = require('ndarray-pack')
const Bitmap = require('node-bitmap')
const parseDataURI = require('parse-data-uri')

function handlePNG(data, cb) {
  const png = new PNG()
  png.parse(data, (err, img_data) => {
    if (err) {
      cb(err)
      return
    }
    cb(null, ndarray(new Uint8Array(img_data.data), [img_data.width | 0, img_data.height | 0, 4], [4, 4 * img_data.width | 0, 1], 0))
  })
}

function handleJPEG(data, cb) {
  let jpegData
  try {
    jpegData = jpeg.decode(data)
  }
  catch (e) {
    cb(e)
    return
  }
  if (!jpegData) {
    cb(new Error('Error decoding jpeg'))
    return
  }
  const nshape = [jpegData.height, jpegData.width, 4]
  const result = ndarray(jpegData.data, nshape)
  cb(null, result.transpose(1, 0))
}

function handleGIF(data, cb) {
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
    }
    catch (err) {
      cb(err)
      return
    }
    var result = ndarray(ndata, nshape)
    try {
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

function handleBMP(data, cb) {
  const bmp = new Bitmap(data)
  try {
    bmp.init()
  }
  catch (e) {
    cb(e)
    return
  }
  const bmpData = bmp.getData()
  const nshape = [bmpData.getHeight(), bmpData.getWidth(), 4]
  const ndata = new Uint8Array(nshape[0] * nshape[1] * nshape[2])
  const result = ndarray(ndata, nshape)
  pack(bmpData, result)
  cb(null, result.transpose(1, 0))
}

function doParse(mimeType, data, cb) {
  switch (mimeType) {
    case 'image/png':
      handlePNG(data, cb)
      break

    case 'image/jpg':
    case 'image/jpeg':
      handleJPEG(data, cb)
      break

    case 'image/gif':
      handleGIF(new Uint8Array(data), cb)
      break

    case 'image/bmp':
      handleBMP(data, cb)
      break

    default:
      cb(new Error(`Unsupported file type: ${mimeType}`))
  }
}

module.exports = function getPixels(url, type, cb) {
  if (!cb) {
    cb = type
    type = ''
  }
  if (Buffer.isBuffer(url)) {
    if (!type) {
      cb(new Error('Invalid file type'))
      return
    }
    doParse(type, url, cb)
  }
  else if (url.indexOf('data:') === 0) {
    try {
      const buffer = parseDataURI(url)
      if (buffer) {
        process.nextTick(() => {
          doParse(type || buffer.mimeType, buffer.data, cb)
        })
      }
      else {
        process.nextTick(() => {
          cb(new Error('Error parsing data URI'))
        })
      }
    }
    catch (err) {
      process.nextTick(() => {
        cb(err)
      })
    }
  }
  else if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
    let contentType
    fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error('HTTP request failed')
      }

      contentType = response.headers.get('content-type')
      if (!contentType) {
        throw new Error('Invalid content-type')
      }

      return response.arrayBuffer()
    }).then((body) => {
      doParse(contentType, body, cb)
    }).catch((err) => { cb(err) })
  }
  else {
    fs.readFile(url, (err, data) => {
      if (err) {
        cb(err)
        return
      }
      type = type || mime.lookup(url)
      if (!type) {
        cb(new Error('Invalid file type'))
        return
      }
      doParse(type, data, cb)
    })
  }
}
