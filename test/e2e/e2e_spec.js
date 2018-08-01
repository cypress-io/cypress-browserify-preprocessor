const path = require('path')
const snapshot = require('snap-shot-it')

const fs = require('../../fs')
const preprocessor = require('../../index')

describe('browserify preprocessor - e2e', function () {
  const on = () => {}

  beforeEach(function () {
    fs.removeSync(path.join(__dirname, '_test-output'))
  })

  it('correctly preprocesses the file', function () {
    const filePath = path.join(__dirname, '..', 'fixtures', 'example_spec.js')
    const outputPath = path.join(__dirname, '..', '_test-output', 'output.js')
    return preprocessor()({ filePath, outputPath, on }).then(() => {
      snapshot(fs.readFileSync(outputPath).toString())
    })
  })
})
