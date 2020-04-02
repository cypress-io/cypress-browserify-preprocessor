// This spec is broken out of e2e_spec.js
// Because eval()s in that file causes unexpected failures.

const chai = require('chai')
const path = require('path')

const fs = require('../../fs')
const preprocessor = require('../../index')

/* eslint-disable-next-line no-unused-vars */
const expect = chai.expect

beforeEach(function () {
  fs.removeSync(path.join(__dirname, '_test-output'))
})

// do not generate source maps by default
const DEFAULT_OPTIONS = { browserifyOptions: { debug: false } }

const bundle = (fixtureName, options = DEFAULT_OPTIONS) => {
  const on = () => {}
  const filePath = path.join(__dirname, '..', 'fixtures', fixtureName)
  const outputPath = path.join(__dirname, '..', '_test-output', 'output.js')

  return preprocessor(options)({ filePath, outputPath, on }).then(() => {
    return fs.readFileSync(outputPath).toString()
  })
}

describe('throws errors when typescript path and tsify are given together', function () {
  it('plugin', function () {
    expect(() => bundle('math_spec.ts', {
      browserifyOptions: {
        plugin: ['tsify'],
      },
      typescript: require.resolve('typescript'),
    })).to.throw('Please only do one or the other.')
  })

  it('transform', function () {
    expect(() => bundle('math_spec.ts', {
      browserifyOptions: {
        transform: [
          ['path/to/tsify', {}],
        ],
      },
      typescript: require.resolve('typescript'),
    })).to.throw('Please only do one or the other.')
  })
})

describe('typescript transpile failure', function () {
  it('cannot handle .ts file when the path is not given', function () {
    return bundle('math_spec.ts')
    .then(() => {
      expect(true).to.eq('should not be here')
    })
    .catch((err) => {
      expect(err.message).to.include('\'import\' and \'export\' may appear only with \'sourceType: module\'')
    })
  })

  it('cannot handle .tsx file when the path is not given', function () {
    return bundle('math_spec.tsx')
    .then(() => {
      expect(true).to.eq('should not be here')
    })
    .catch((err) => {
      expect(err.message).to.include('\'import\' and \'export\' may appear only with \'sourceType: module\'')
    })
  })
})
