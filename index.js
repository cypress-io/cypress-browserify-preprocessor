'use strict'

const path = require('path')
const Promise = require('bluebird')
const fs = require('./fs')

const browserify = require('browserify')
const watchify = require('watchify')

const log = require('debug')('cypress:browserify')

const bundles = {}

// by default, we transform JavaScript (up to anything at stage-4), JSX,
// CoffeeScript, and CJSX (CoffeeScript + JSX)
const defaults = {
  extensions: ['.js', '.jsx', '.coffee', '.cjsx'],
  watchOptions: {
    // ignore watching the following or the user's system can get bogged down
    // by watchers
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
        // irons out differents between ES6 modules and node exports
        plugins: ['babel-plugin-add-module-exports'].map(require.resolve),
        // babel-preset-env supports any JS that's stage-4, meaning it's
        // completely finalized in the ECMA standard
        presets: ['babel-preset-env', 'babel-preset-react'].map(require.resolve),
      },
    },
  ],
}

// export a function that returns another function, making it easy for users
// to configure like so:
//
// register('on:spec:file:preprocessor', browserify(config, userOptions))
//
module.exports = (config, userOptions = {}) => {
  log('received user options', userOptions)

  if (!config || typeof config.isTextTerminal !== 'boolean') {
    throw new Error(`Cypress Browserify Preprocessor must be called with the Cypress config as its first argument. You passed: ${JSON.stringify(config, null, 2)}`)
  }

  // allow user to override default options
  const options = Object.assign({}, defaults, userOptions)

  // we return function that accepts the arguments provided by
  // the event 'on:spec:file:preprocessor'
  //
  // this function will get called for the support file when a project is loaded
  // (if the support file is not disabled)
  // it will also get calledfor a spec file when that spec is requested by
  // the Cypress runner
  //
  // when running in the GUI, it will likely get called multiple times
  // with the same filePath, as the user could re-run the tests, causing
  // the supported file and spec file to be requested again
  return (filePath, util) => {
    log('get', filePath)

    // since this function can get called multiple times with the same
    // filePath, we return the cached bundle promise if we already have one
    // since we don't want or need to re-initiate browserify/watchify for it
    if (bundles[filePath]) {
      log(`already have bundle for ${filePath}`)
      return bundles[filePath]
    }

    // if we're in a text terminal, this is a one-time run, probably in CI
    // so we don't need to watch
    const shouldWatch = !config.isTextTerminal
    // util.getOutputPath returns a path alongside Cypress's other app data
    // files so we don't have to worry about where to put the bundled
    // file on disk
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

    // yield the bundle if onBundle is specified so the user can modify it
    // as need via `bundle.external()`, `bundle.plugin()`, etc
    const onBundle = options.onBundle
    if (typeof onBundle === 'function') {
      onBundle(bundler)
    }

    // transforms are part of the options so that users can easily override
    // the options of the default cjsxify and babelify tranforms
    const transforms = options.transforms
    if (Object.prototype.toString.call(transforms) === '[object Array]') {
      transforms.forEach((transform) => {
        bundler.transform(transform.transform, transform.options)
      })
    }

    // this kicks off the bundling and wraps it up in a promise. the promise
    // is what is ultimately returned from this function
    // it resolves with the outputPath so Cypress knows where to serve
    // the file from
    const bundle = () => {
      return new Promise((resolve, reject) => {
        log(`making bundle ${outputPath}`)

        const onError = (err) => {
          err.filePath = filePath
          // backup the original stack before its
          // potentially modified from bluebird
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

    // when we're notified of an update via watchify, we call `util.fileUpdated`
    // to let Cypress know to re-run the spec
    bundler.on('update', () => {
      log(`update ${filePath}`)
      // we overwrite the cached bundle promise, so on subsequent invocations
      // it gets the latest bundle
      bundles[filePath] = bundle().tap(() => {
        log(`- update finished for ${filePath}`)
        util.fileUpdated(filePath)
      })
    })

    const bundlePromise = fs.ensureDirAsync(path.dirname(outputPath)).then(bundle)

    // cache the bundle promise, so it can be returned if this function
    // is invoked again with the same filePath
    bundles[filePath] = bundlePromise

    // when the spec or project is closed, we need to clean up the cached
    // bundle promise and stop the watcher via `bundler.close()`
    util.onClose(() => {
      log(`close ${filePath}`)
      delete bundles[filePath]
      if (shouldWatch) {
        bundler.close()
      }
    })

    // return the promise, which will resolve with the outputPath or reject
    // with any error encountered
    return bundlePromise
  }
}
