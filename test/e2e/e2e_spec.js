const path = require('path')
const snapshot = require('snap-shot-it')
const chai = require('chai')

const fs = require('../../fs')
const preprocessor = require('../../index')

expect = chai.expect

beforeEach(function () {
  fs.removeSync(path.join(__dirname, '_test-output'))
})

const bundle = (fixtureName, options) => {
  const on = () => {}
  const filePath = path.join(__dirname, '..', 'fixtures', fixtureName)
  const outputPath = path.join(__dirname, '..', '_test-output', 'output.js')

  return preprocessor(options)({ filePath, outputPath, on }).then(() => {
    return fs.readFileSync(outputPath).toString()
  })
}

describe('browserify preprocessor - e2e', function () {
  it('correctly preprocesses the file', function () {
    return bundle('example_spec.js').then((output) => {
      snapshot(output)
    })
  })
})

describe('imports and exports', () => {
  it('handles imports and exports', () => {
    // do not generate source maps
    return bundle('math_spec.js', { browserifyOptions: { debug: false } }).then((output) => {
      /* eslint-disable-next-line no-console */
      console.log(output)
      eval(output)
      snapshot('math default exports', output)
    })
  })
})
