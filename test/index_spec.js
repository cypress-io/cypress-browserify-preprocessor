'use strict'

const chai = require('chai')
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
  pipe () { return streamApi },
}
streamApi.on = sandbox.stub().returns(streamApi)

const fs = require('../fs')
const preprocessor = require('../index')

describe('browserify preprocessor', function () {
  beforeEach(function () {
    sandbox.restore()

    const bundlerApi = this.bundlerApi = {
      bundle: sandbox.stub().returns(streamApi),
      external () { return bundlerApi },
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

    sandbox.stub(fs, 'ensureDirAsync').resolves()

    this.config = {
      isTextTerminal: true,
    }
    this.userOptions = {}
    this.filePath = 'path/to/file.js'
    this.outputPath = 'output/output.js'
    this.util = {
      getOutputPath: sandbox.stub().returns(this.outputPath),
      fileUpdated: sandbox.spy(),
      onClose: sandbox.stub(),
    }

    this.run = () => {
      return preprocessor(this.config, this.userOptions)(this.filePath, this.util)
    }
  })

  describe('exported function', function () {
    it('receives user options and returns a preprocessor function', function () {
      expect(preprocessor(this.config, this.userOptions)).to.be.a('function')
    })
  })

  describe('preprocessor function', function () {
    afterEach(function () {
      this.util.onClose.yield() // resets the cached bundles
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

        const run = preprocessor(this.config, this.userOptions)
        return run(this.filePath, this.util)
        .then(() => {
          return run(this.filePath, this.util)
        })
        .then(() => {
          expect(browserify).to.be.calledOnce
        })
      })

      it('specifies the entry file', function () {
        return this.run().then(() => {
          expect(browserify.lastCall.args[0].entries[0]).to.equal(this.filePath)
        })
      })

      it('specifies default extensions if none provided', function () {
        return this.run().then(() => {
          expect(browserify.lastCall.args[0].extensions).to.eql(['.js', '.jsx', '.coffee', '.cjsx'])
        })
      })

      it('uses provided extensions', function () {
        this.userOptions.extensions = ['.coffee']
        return this.run().then(() => {
          expect(browserify.lastCall.args[0].extensions).to.eql(['.coffee'])
        })
      })

      it('watches when isTextTerminal is false', function () {
        this.config.isTextTerminal = false
        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify)
        })
      })

      it('use default watchOptions if not provided', function () {
        this.config.isTextTerminal = false
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

      it('includes watchOptions if provided', function () {
        this.config.isTextTerminal = false
        this.userOptions.watchOptions = { ignoreWatch: ['node_modules'] }
        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify, {
            ignoreWatch: ['node_modules'],
          })
        })
      })

      it('does not watch when isTextTerminal is true', function () {
        return this.run().then(() => {
          expect(this.bundlerApi.plugin).not.to.be.called
        })
      })

      it('calls onBundle callback with bundler', function () {
        this.userOptions.onBundle = sandbox.spy()
        return this.run().then(() => {
          expect(this.userOptions.onBundle).to.be.calledWith(this.bundlerApi)
        })
      })

      it('applies transforms provided', function () {
        const transform = () => {}
        const options = {}
        this.userOptions.transforms = [{ transform, options }]
        return this.run().then(() => {
          expect(this.bundlerApi.transform).to.be.calledWith(transform, options)
        })
      })

      it('ensures directory for output is created', function () {
        return this.run().then(() => {
          expect(fs.ensureDirAsync).to.be.calledWith('output')
        })
      })

      it('creates write stream to output path', function () {
        return this.run().then(() => {
          expect(fs.createWriteStream).to.be.calledWith(this.outputPath)
        })
      })

      it('bundles', function () {
        return this.run().then(() => {
          expect(this.bundlerApi.bundle).to.be.called
        })
      })

      it('resolves with the output path', function () {
        return this.run().then((outputPath) => {
          expect(this.util.getOutputPath).to.be.calledWith(this.filePath)
          expect(outputPath).to.be.equal(this.outputPath)
        })
      })

      it('re-bundles when there is an update', function () {
        this.bundlerApi.on.withArgs('update').yields()
        return this.run().then(() => {
          expect(this.bundlerApi.bundle).to.be.calledTwice
        })
      })

      it('calls util.fileUpdated when there is an update', function () {
        this.bundlerApi.on.withArgs('update').yields()
        return this.run().then(() => {
          expect(this.util.fileUpdated).to.be.calledWith(this.filePath)
        })
      })

      it('registers onClose callback', function () {
        return this.run().then(() => {
          expect(this.util.onClose).to.be.called
          expect(this.util.onClose.lastCall.args[0]).to.be.a('function')
        })
      })

      it('closes bundler when isTextTerminal is false and onClose callback is called', function () {
        this.config.isTextTerminal = false
        return this.run().then(() => {
          this.util.onClose.lastCall.args[0]()
          expect(this.bundlerApi.close).to.be.called
        })
      })

      it('does not close bundler when isTextTerminal is true and onClose callback is called', function () {
        return this.run().then(() => {
          this.util.onClose.lastCall.args[0]()
          expect(this.bundlerApi.close).not.to.be.called
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
    })
  })
})
