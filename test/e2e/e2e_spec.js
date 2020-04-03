const chai = require('chai')
const path = require('path')
const snapshot = require('snap-shot-it')

process.env.__TESTING__ = true

const fs = require('../../lib/fs')
const preprocessor = require('../../index')

/* eslint-disable-next-line no-unused-vars */
const expect = chai.expect

beforeEach(() => {
  fs.removeSync(path.join(__dirname, '_test-output'))
  preprocessor.reset()
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

describe('browserify preprocessor - e2e', () => {
  it('correctly preprocesses the file', () => {
    return bundle('example_spec.js').then((output) => {
      snapshot(output)
    })
  })
})

describe('typescript', () => {
  it('handles .ts file when the path is given', () => {
    return bundle('typescript/math_spec.ts', {
      typescript: require.resolve('typescript'),
    }).then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })

  it('handles .tsx file when the path is given', () => {
    return bundle('typescript/react_spec.tsx', {
      typescript: require.resolve('typescript'),
    }).then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })
})

describe('imports and exports', () => {
  it('handles imports and exports', () => {
    return bundle('math_spec.js').then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })

  it('named ES6', () => {
    return bundle('divide_spec.js').then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })


  it('handles module.exports and import', () => {
    return bundle('sub_spec.js').then((output) => {
      // check that bundled tests work
      eval(output)
      snapshot('sub import', output)
    })
  })

  it('handles module.exports and default import', () => {
    return bundle('mul_spec.js').then((output) => {
      // check that bundled tests work
      eval(output)
      // for some reason, this bundle included full resolved path
      // to interop require module
      // which on CI generates different path.
      // so as long as eval works, do not snapshot it
    })
  })

  it('handles default string import', () => {
    return bundle('dom_spec.js').then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })

  it('handles non-top-level require', () => {
    return bundle('require_spec.js').then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })
})
