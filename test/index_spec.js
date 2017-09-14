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
      transform () { return bundlerApi },
      external () { return bundlerApi },
      close: sandbox.spy(),
      plugin: sandbox.stub(),
    }
    bundlerApi.on = sandbox.stub().returns(bundlerApi)

    browserify.returns(bundlerApi)

    this.createWriteStreamApi = {
      on: sandbox.stub(),
    }
    sandbox.stub(fs, 'createWriteStream').returns(this.createWriteStreamApi)

    sandbox.stub(fs, 'ensureDirAsync').resolves()

    this.userOptions = {}
    this.filePath = 'path/to/file.js'
    this.outputPath = 'output/output.js'
    this.options = {}
    this.util = {
      getOutputPath: sandbox.stub().returns(this.outputPath),
      fileUpdated: sandbox.spy(),
      onClose: sandbox.stub(),
    }

    this.run = () => {
      return preprocessor(this.userOptions)(this.filePath, this.options, this.util)
    }
  })

  describe('exported function', function () {
    it('receives user options and returns a preprocessor function', function () {
      expect(preprocessor(this.userOptions)).to.be.a('function')
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

        const run = preprocessor(this.userOptions)
        return run(this.filePath, this.options, this.util)
        .then(() => {
          return run(this.filePath, this.options, this.util)
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
          expect(browserify.lastCall.args[0].extensions).to.eql(['.js'])
        })
      })

      it('uses provided extensions', function () {
        this.userOptions.extensions = ['.coffee']
        return this.run().then(() => {
          expect(browserify.lastCall.args[0].extensions).to.eql(['.coffee'])
        })
      })

      it('watches when shouldWatch is true', function () {
        this.options.shouldWatch = true
        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify)
        })
      })

      it('includes ignoreWatch option if provided', function () {
        this.options.shouldWatch = true
        this.userOptions.ignoreWatch = ['node_modules']
        return this.run().then(() => {
          expect(this.bundlerApi.plugin).to.be.calledWith(watchify, {
            ignoreWatch: ['node_modules'],
          })
        })
      })

      it('does not watch when shouldWatch is false', function () {
        this.options.shouldWatch = false
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

      it('closes bundler when shouldWatch is true and onClose callback is called', function () {
        this.options.shouldWatch = true
        return this.run().then(() => {
          this.util.onClose.lastCall.args[0]()
          expect(this.bundlerApi.close).to.be.called
        })
      })

      it('does not close bundler when shouldWatch is false and onClose callback is called', function () {
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
