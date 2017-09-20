'use strict'

const path = require('path')
const Promise = require('bluebird')
const fs = require('./fs')

const browserify = require('browserify')
const watchify = require('watchify')

const log = require('debug')('cypress:browserify')

const bundles = {}

module.exports = (config, userOptions = {}) => {
  log('received user options', userOptions)

  return (filePath, util) => {
    if (bundles[filePath]) {
      log(`already have bundle for ${filePath}`)
      return bundles[filePath]
    }

    const shouldWatch = !config.isTextTerminal
    const outputPath = util.getOutputPath(filePath)

    log(`input: ${filePath}`)
    log(`output: ${outputPath}`)

    const bundler = browserify({
      entries: [filePath],
      extensions: userOptions.extensions || ['.js'],
      cache: {},
      packageCache: {},
    })

    if (shouldWatch) {
      log('watching')
      bundler.plugin(watchify, userOptions.watchifyOptions || {})
    }

    const onBundle = userOptions.onBundle
    if (typeof onBundle === 'function') {
      onBundle(bundler)
    }

    const transforms = userOptions.transforms
    if (Object.prototype.toString.call(transforms) === '[object Array]') {
      transforms.forEach((transform) => {
        bundler.transform(transform.transform, transform.options)
      })
    }

    const bundle = () => {
      return new Promise((resolve, reject) => {
        log(`making bundle ${outputPath}`)

        const onError = (err) => {
          err.filePath = filePath
          //// backup the original stack before its
          //// potentially modified from bluebird
          err.originalStack = err.stack
          log(`errored bundling ${outputPath}`, err)
          reject(err)
        }

        const ws = fs.createWriteStream(outputPath)
        ws.on('finish', () => {
          log(`finished bundling ${outputPath}`)
          resolve(outputPath)
        })
        ws.on('error', onError)

        bundler
        .bundle()
        .on('error', onError)
        .pipe(ws)
      })
    }

    bundler.on('update', () => {
      log(`update ${filePath}`)
      bundles[filePath] = bundle().tap(() => {
        log(`- update finished for ${filePath}`)
        util.fileUpdated(filePath)
      })
    })

    const bundlePromise = fs.ensureDirAsync(path.dirname(outputPath)).then(bundle)

    bundles[filePath] = bundlePromise

    util.onClose(() => {
      log(`close ${filePath}`)
      delete bundles[filePath]
      if (shouldWatch) {
        bundler.close()
      }
    })

    return bundlePromise
  }
}
