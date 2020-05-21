'use strict'

const chai = require('chai')
const fs = require('fs-extra')
const mockery = require('mockery')
const sinon = require('sinon')
const watchify = require('watchify')

const expect = chai.expect

chai.use(require('sinon-chai'))

const sandbox = sinon.sandbox.create()
const browserify = sandbox.stub()

mockery.enable({
  warnOnUnregistered: false,
})

mockery.registerMock('browserify', browserify)

const streamApi = {
  pipe () {
    return streamApi
  },
}

streamApi.on = sandbox.stub().returns(streamApi)

process.env.__TESTING__ = true

const preprocessor = require('../../index')

describe('browserify preprocessor', function () {
  beforeEach(function () {
    sandbox.restore()

    const bundlerApi = this.bundlerApi = {
      bundle: sandbox.stub().returns(streamApi),
      external () {
        return bundlerApi
      },
      close: sandbox.spy(),
      plugin: sandbox.stub(),
    }

    bundlerApi.transform = sandbox.stub().returns(bundlerApi)
    bundlerApi.on = sandbox.stub().returns(bundlerApi)

    browserify.returns(bundlerApi)

    this.createWriteStreamApi = {
      on: sandbox.stub(),
    }

    sandbox.stub(fs, 'createWriteStream').returns(this.createWriteStreamApi)
    sandbox.stub(fs, 'ensureDir').resolves()

    this.options = {}
    this.file = {
      filePath: 'path/to/file.js',
      outputPath: 'output/output.js',
      shouldWatch: false,
      on: sandbox.stub(),
      emit: sandbox.spy(),
    }

    this.run = () => {
      return preprocessor(this.options)(this.file)
    }
  })

  describe('exported function', function () {
    it('receives user options and returns a preprocessor function', function () {
      expect(preprocessor(this.options)).to.be.a('function')
    })

    it('has defaultOptions attached to it', function () {
      expect(preprocessor.defaultOptions).to.be.an('object')
      expect(preprocessor.defaultOptions.browserifyOptions).to.be.an('object')
    })
  })

  describe('preprocessor function', function () {
    beforeEach(function () {
      preprocessor.reset()
    })

    describe('when it finishes cleanly', function () {
      beforeEach(function () {
        this.createWriteStreamApi.on.withArgs('finish').yields()
      })

      it('runs browserify', function () {
        return this.run().then(() => {
          expect(browserify).to.be.called
        })
      })

      it('returns existing bundle if called again with same filePath', function () {
        browserify.reset()
        browserify.returns(this.bundlerApi)

        const run = preprocessor(this.options)

        return run(this.file)
        .then(() => {
          return run(this.file)
        })
        .then(() => {
          expect(browserify).to.be.calledOnce
        })
      })

      it('specifies the entry file', function () {
        return this.run().then(() => {
          expect(browserify.lastCall.args[0].entries[0]).to.equal(this.file.filePath)
        })
      })

      it('specifies default extensions if none provided', function () {
        return this.run().then(() => {
          expect(browserify.lastCall.args[0].extensions).to.eql(['.js', '.jsx', '.coffee'])
        })
      })

      it('uses provided extensions', function () {
        this.options.browserifyOptions = { extensions: ['.coffee'] }

        return this.run().then(() => {
          expect(browserify.lastCall.args[0].extensions).to.eql(['.coffee'])
        })
      })

      it('starts with clean cache and packageCache', function () {
        browserify.reset()
        browserify.returns(this.bundlerApi)

        const run = preprocessor(this.options)

        return run(this.file)
        .then(() => {
          browserify.lastCall.args[0].cache.foo = 'bar'
          browserify.lastCall.args[0].packageCache.foo = 'bar'
          this.file.on.withArgs('close').yield()

          return run(this.file)
        })
        .then(() => {
          expect(browserify).to.be.calledTwice
          expect(browserify.lastCall.args[0].cache).to.eql({})
          expect(browserify.lastCall.args[0].packageCache).to.eql({})
        })
      })

      it('watches when shouldWatch is true', function () {
        this.file.shouldWatch = true

        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify)
        })
      })

      it('use default watchifyOptions if not provided', function () {
        this.file.shouldWatch = true

        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify, {
            ignoreWatch: [
              '**/.git/**',
              '**/.nyc_output/**',
              '**/.sass-cache/**',
              '**/bower_components/**',
              '**/coverage/**',
              '**/node_modules/**',
            ],
          })
        })
      })

      it('includes watchifyOptions if provided', function () {
        this.file.shouldWatch = true
        this.options.watchifyOptions = { ignoreWatch: ['node_modules'] }

        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify, {
            ignoreWatch: ['node_modules'],
          })
        })
      })

      it('does not watch when shouldWatch is false', function () {
        return this.run().then(() => {
          expect(this.bundlerApi.plugin).not.to.be.called
        })
      })

      it('calls onBundle callback with bundler', function () {
        this.options.onBundle = sandbox.spy()

        return this.run().then(() => {
          expect(this.options.onBundle).to.be.calledWith(this.bundlerApi)
        })
      })

      it('uses transforms if provided', function () {
        const transform = [() => { }, {}]

        this.options.browserifyOptions = { transform }

        return this.run().then(() => {
          expect(browserify.lastCall.args[0].transform).to.eql(transform)
        })
      })

      it('ensures directory for output is created', function () {
        return this.run().then(() => {
          expect(fs.ensureDir).to.be.calledWith('output')
        })
      })

      it('creates write stream to output path', function () {
        return this.run().then(() => {
          expect(fs.createWriteStream).to.be.calledWith(this.file.outputPath)
        })
      })

      it('bundles', function () {
        return this.run().then(() => {
          expect(this.bundlerApi.bundle).to.be.called
        })
      })

      it('resolves with the output path', function () {
        return this.run().then((outputPath) => {
          expect(outputPath).to.equal(this.file.outputPath)
        })
      })

      it('re-bundles when there is an update', function () {
        this.bundlerApi.on.withArgs('update').yields()

        return this.run().then(() => {
          expect(this.bundlerApi.bundle).to.be.calledTwice
        })
      })

      it('emits `rerun` when there is an update', function () {
        this.bundlerApi.on.withArgs('update').yields()

        return this.run().then(() => {
          expect(this.file.emit).to.be.calledWith('rerun')
        })
      })

      it('closes bundler when shouldWatch is true and `close` is emitted', function () {
        this.file.shouldWatch = true

        return this.run().then(() => {
          this.file.on.withArgs('close').yield()
          expect(this.bundlerApi.close).to.be.called
        })
      })

      it('does not close bundler when shouldWatch is false and `close` is emitted', function () {
        return this.run().then(() => {
          this.file.on.withArgs('close').yield()
          expect(this.bundlerApi.close).not.to.be.called
        })
      })

      describe('source maps', () => {
        describe('browerifyOptions.debug', function () {
          it('true by default', function () {
            return this.run().then(() => {
              expect(browserify.lastCall.args[0].debug).to.be.true
            })
          })

          it('false if user has explicitly set to false', function () {
            this.options.browserifyOptions = { debug: false }

            return this.run().then(() => {
              expect(browserify.lastCall.args[0].debug).to.be.false
            })
          })
        })
      })
    })

    describe('when it errors', function () {
      beforeEach(function () {
        this.err = {
          stack: 'Failed to preprocess...',
        }
      })

      it('errors if write stream fails', function () {
        this.createWriteStreamApi.on.withArgs('error').yields(this.err)

        return this.run().catch((err) => {
          expect(err.stack).to.equal(this.err.stack)
        })
      })

      it('errors if bundling fails', function () {
        streamApi.on.withArgs('error').yields(this.err)

        return this.run().catch((err) => {
          expect(err.stack).to.equal(this.err.stack)
        })
      })

      it('backs up stack as originalStack', function () {
        this.createWriteStreamApi.on.withArgs('error').yields(this.err)

        return this.run().catch((err) => {
          expect(err.originalStack).to.equal(this.err.stack)
        })
      })

      it('does not trigger unhandled rejection when bundle errors after update', function (done) {
        const handler = sandbox.spy()

        process.on('unhandledRejection', handler)
        this.createWriteStreamApi.on.withArgs('finish').onFirstCall().yields()

        this.file.emit = () => {
          setTimeout(() => {
            expect(handler).not.to.be.called
            process.removeListener('unhandledRejection', handler)
            done()
          }, 500)
        }

        this.run().then(() => {
          streamApi.on.withArgs('error').yieldsAsync(new Error('bundle error')).returns({ pipe () { } })
          this.bundlerApi.on.withArgs('update').yield()
        })
      })

      it('rejects subsequent request after and update bundle errors', function () {
        this.createWriteStreamApi.on.withArgs('finish').onFirstCall().yields()
        const run = preprocessor(this.options)

        return run(this.file)
        .then(() => {
          streamApi.on.withArgs('error').yieldsAsync(new Error('bundle error')).returns({ pipe () { } })
          this.bundlerApi.on.withArgs('update').yield()

          return run(this.file)
        })
        .then(() => {
          throw new Error('should not resolve')
        })
        .catch((err) => {
          expect(err.message).to.contain('bundle error')
        })
      })
    })

    describe('typescript support', function () {
      beforeEach(function () {
        this.options.typescript = require.resolve('typescript')
      })

      it('adds tsify transform', function () {
        this.createWriteStreamApi.on.withArgs('finish').yields()

        return this.run().then(() => {
          expect(browserify.lastCall.args[0].transform[1][0]).to.include('simple_tsify')
        })
      })

      it('adds to extensions', function () {
        this.createWriteStreamApi.on.withArgs('finish').yields()

        return this.run().then(() => {
          expect(browserify.lastCall.args[0].extensions).to.eql(['.js', '.jsx', '.coffee', '.ts', '.tsx'])
        })
      })

      it('removes babelify transform', function () {
        this.createWriteStreamApi.on.withArgs('finish').yields()

        return this.run().then(() => {
          const transforms = browserify.lastCall.args[0].transform

          expect(transforms).to.have.length(2)
          expect(transforms[1][0]).not.to.include('babelify')
        })
      })

      it('does not change browserify options without typescript option', function () {
        this.createWriteStreamApi.on.withArgs('finish').yields()

        this.options.typescript = undefined

        return this.run().then(() => {
          expect(browserify.lastCall.args[0].transform[1][0]).to.include('babelify')
          expect(browserify.lastCall.args[0].transform[1][0]).not.to.include('simple_tsify')
          expect(browserify.lastCall.args[0].extensions).to.eql(['.js', '.jsx', '.coffee'])
        })
      })

      it('removes babelify transform even if it is not the last item', function () {
        this.createWriteStreamApi.on.withArgs('finish').yields()

        const { browserifyOptions } = preprocessor.defaultOptions

        this.options.browserifyOptions = {
          ...browserifyOptions,
          transform: [
            browserifyOptions.transform[1],
            browserifyOptions.transform[0],
          ],
        }

        return this.run().then(() => {
          const transforms = browserify.lastCall.args[0].transform

          expect(transforms).to.have.length(2)
          expect(transforms[1][0]).not.to.include('babelify')
        })
      })

      describe('validation', function () {
        const shouldntResolve = () => {
          throw new Error('Should error, should not resolve')
        }

        const verifyErrorIncludesPrefix = (err) => {
          expect(err.message).to.include('Error running @cypress/browserify-preprocessor:')
        }

        it('throws error when typescript path is not a string', function () {
          this.options.typescript = true

          return this.run()
          .then(shouldntResolve)
          .catch((err) => {
            verifyErrorIncludesPrefix(err)
            expect(err.type).to.equal(preprocessor.errorTypes.TYPESCRIPT_NOT_STRING)
            expect(err.message).to.include(`The 'typescript' option must be a string. You passed: true`)
          })
        })

        it('throws error when nothing exists at typescript path', function () {
          this.options.typescript = '/nothing/here'

          return this.run()
          .then(shouldntResolve)
          .catch((err) => {
            verifyErrorIncludesPrefix(err)
            expect(err.type).to.equal(preprocessor.errorTypes.TYPESCRIPT_NONEXISTENT)
            expect(err.message).to.include(`The 'typescript' option must be a valid path to your TypeScript installation. We could not find anything at the following path: /nothing/here`)
          })
        })

        it('throws error when typescript path and tsify plugin are specified', function () {
          this.options.browserifyOptions = {
            plugin: ['tsify'],
          }

          return this.run()
          .then(shouldntResolve)
          .catch((err) => {
            verifyErrorIncludesPrefix(err)
            expect(err.type).to.equal(preprocessor.errorTypes.TYPESCRIPT_AND_TSIFY)
            expect(err.message).to.include(`It looks like you passed the 'typescript' option and also specified a browserify plugin for TypeScript. This may cause conflicts`)
          })
        })

        it('throws error when typescript path and tsify transform are specified', function () {
          this.options.browserifyOptions = {
            transform: [
              ['path/to/tsify', {}],
            ],
          }

          return this.run()
          .then(shouldntResolve)
          .catch((err) => {
            verifyErrorIncludesPrefix(err)
            expect(err.type).to.equal(preprocessor.errorTypes.TYPESCRIPT_AND_TSIFY)
            expect(err.message).to.include(`It looks like you passed the 'typescript' option and also specified a browserify transform for TypeScript. This may cause conflicts`)
          })
        })

        it('throws error when processing .ts file and typescript option is not set', function () {
          this.options.typescript = undefined
          this.file.filePath = 'path/to/file.ts'

          return this.run()
          .then(shouldntResolve)
          .catch((err) => {
            verifyErrorIncludesPrefix(err)
            expect(err.type).to.equal(preprocessor.errorTypes.TYPESCRIPT_NOT_CONFIGURED)
            expect(err.message).to.include(`You are attempting to preprocess a TypeScript file, but do not have TypeScript configured. Pass the 'typescript' option to enable TypeScript support`)
            expect(err.message).to.include('path/to/file.ts')
          })
        })

        it('throws error when processing .tsx file and typescript option is not set', function () {
          this.options.typescript = undefined
          this.file.filePath = 'path/to/file.tsx'

          return this.run()
          .then(shouldntResolve)
          .catch((err) => {
            verifyErrorIncludesPrefix(err)
            expect(err.type).to.equal(preprocessor.errorTypes.TYPESCRIPT_NOT_CONFIGURED)
            expect(err.message).to.include(`You are attempting to preprocess a TypeScript file, but do not have TypeScript configured. Pass the 'typescript' option to enable TypeScript support`)
            expect(err.message).to.include('path/to/file.tsx')
          })
        })
      })
    })
  })
})
