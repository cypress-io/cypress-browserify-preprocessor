const chai = require('chai')
const path = require('path')
const snapshot = require('snap-shot-it')

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

describe('browserify preprocessor - e2e', function () {
  it('correctly preprocesses the file', function () {
    return bundle('example_spec.js').then((output) => {
      snapshot(output)
    })
  })
})

describe('typescript', function () {
  it('handles .ts file when the path is given', function () {
    return bundle('typescript/math_spec.ts', {
      typescript: require.resolve('typescript'),
    }).then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })

  it('handles .tsx file when the path is given', function () {
    // This test loads many packages like react, enzyme.
    // Because of that, we need more time.
    this.timeout(10000)

    return bundle('typescript/enzyme_spec.tsx', {
      typescript: require.resolve('typescript'),
    }).then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })

  it('babelify is removed even if it is not the last item', () => {
    const { browserifyOptions } = preprocessor.defaultOptions

    return bundle('typescript/math_spec2.ts', {
      browserifyOptions: {
        ...browserifyOptions,
        transform: [
          browserifyOptions.transform[1],
          browserifyOptions.transform[0],
        ],
      },
      typescript: require.resolve('typescript'),
    }).then((output) => {
      // check that bundled tests work
      eval(output)
    })
  })

  describe('throws errors when typescript path and tsify are given together', function () {
    it('plugin', function () {
      expect(() => bundle('typescript/test1.ts', {
        browserifyOptions: {
          plugin: ['tsify'],
        },
        typescript: require.resolve('typescript'),
      })).to.throw('Please only do one or the other.')
    })

    it('transform', function () {
      expect(() => bundle('typescript/test2.ts', {
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
      return bundle('typescript/test3.ts')
      .then(() => {
        expect(true).to.eq('should not be here')
      })
      .catch((err) => {
        expect(err.message).to.include('\'import\' and \'export\' may appear only with \'sourceType: module\'')
      })
    })

    it('cannot handle .tsx file when the path is not given', function () {
      return bundle('typescript/test4.tsx')
      .then(() => {
        expect(true).to.eq('should not be here')
      })
      .catch((err) => {
        expect(err.message).to.include('\'import\' and \'export\' may appear only with \'sourceType: module\'')
      })
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
