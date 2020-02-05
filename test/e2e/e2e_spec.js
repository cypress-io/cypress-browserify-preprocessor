const path = require('path')
const snapshot = require('snap-shot-it')

const fs = require('../../fs')
const preprocessor = require('../../index')

beforeEach(function () {
  fs.removeSync(path.join(__dirname, '_test-output'))
})

const bundle = (fixtureName) => {
  const on = () => {}
  const filePath = path.join(__dirname, '..', 'fixtures', fixtureName)
    const outputPath = path.join(__dirname, '..', '_test-output', 'output.js')
    return preprocessor()({ filePath, outputPath, on }).then(() => {
      return fs.readFileSync(outputPath).toString()
    })
}

describe('browserify preprocessor - e2e', function () {
  it('correctly preprocesses the file', function () {
    return bundle('example_spec.js').then(output => {
      snapshot(output)
    })
  })
})
