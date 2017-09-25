'use strict'

const path = require('path')
const Promise = require('bluebird')
const fs = require('./fs')

const browserify = require('browserify')
const watchify = require('watchify')

const log = require('debug')('cypress:browserify')

const bundles = {}

const defaults = {
  extensions: ['.js', '.jsx', '.coffee', '.cjsx'],
  watchOptions: {
    ignoreWatch: [
      '**/.git/**',
      '**/.nyc_output/**',
      '**/.sass-cache/**',
      '**/bower_components/**',
      '**/coverage/**',
      '**/node_modules/**',
    ],
  },
  transforms: [
    {
      transform: require.resolve('./cjsxify'),
      options: {},
    },
    {
      transform: require.resolve('babelify'),
      options: {
        ast: false,
        babelrc: false,
        plugins: ['babel-plugin-add-module-exports'].map(require.resolve),
        presets: ['babel-preset-env', 'babel-preset-react'].map(require.resolve),
      },
    },
  ],
}

module.exports = (config, userOptions = {}) => {
  log('received user options', userOptions)

  return (filePath, util) => {
    log('get', filePath)

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
      extensions: options.extensions,
      cache: {},
      packageCache: {},
    })

    if (shouldWatch) {
      log('watching')
      bundler.plugin(watchify, options.watchOptions || {})
    }

    const onBundle = options.onBundle
    if (typeof onBundle === 'function') {
      onBundle(bundler)
    }

    const transforms = options.transforms
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
