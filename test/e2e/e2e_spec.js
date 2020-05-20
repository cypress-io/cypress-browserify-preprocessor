const _ = require('lodash')
const chai = require('chai')
const fs = require('fs-extra')
const path = require('path')
const snapshot = require('snap-shot-it')
const Bluebird = require('bluebird')

process.env.__TESTING__ = true

const preprocessor = require('../../index')

/* eslint-disable-next-line no-unused-vars */
const expect = chai.expect

const typescript = require.resolve('typescript')

beforeEach(() => {
  fs.removeSync(path.join(__dirname, '_test-output'))
  preprocessor.reset()
})

// do not generate source maps by default
const DEFAULT_OPTIONS = { browserifyOptions: { debug: false } }

const bundle = (fixtureName, options = DEFAULT_OPTIONS) => {
  const on = () => {}
  const filePath = path.join(__dirname, '..', 'fixtures', fixtureName)
  const outputPath = path.join(__dirname, '..', '_test-output', fixtureName)

  return preprocessor(options)({ filePath, outputPath, on }).then(() => {
    return fs.readFileSync(outputPath).toString()
  })
}

const parseSourceMap = (output) => {
  return _
  .chain(output)
  .split('//# sourceMappingURL=data:application/json;charset=utf-8;base64,')
  .last()
  .thru((str) => {
    const base64 = Buffer.from(str, 'base64').toString()

    return JSON.parse(base64)
  })
  .value()
}

const verifySourceContents = ({ sources, sourcesContent }) => {
  const zippedArrays = _.zip(sources, sourcesContent)

  return Bluebird.map(zippedArrays, ([sourcePath, sourceContent]) => {
    return fs.readFile(sourcePath, 'utf8')
    .then((str) => {
      expect(str).to.eq(sourceContent)
    })
  })
}

describe('browserify preprocessor - e2e', () => {
  it('correctly preprocesses the file', () => {
    return bundle('example_spec.js').then((output) => {
      snapshot(output)
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

  describe('typescript', () => {
    it('handles .ts file when the path is given', () => {
      return bundle('typescript/math_spec.ts', {
        typescript,
      }).then((output) => {
        // check that bundled tests work
        eval(output)

        const sourceMap = parseSourceMap(output)

        expect(sourceMap.sources).to.deep.eq([
          'node_modules/browser-pack/_prelude.js',
          'test/fixtures/typescript/math.ts',
          'test/fixtures/typescript/math_spec.ts',
        ])

        return verifySourceContents(sourceMap)
      })
    })

    it('handles simple .tsx file with imports', () => {
      return bundle('typescript/simple.spec.tsx', {
        typescript,
      }).then((output) => {
        // check that bundled tests work
        eval(output)

        const sourceMap = parseSourceMap(output)

        expect(sourceMap.sources).to.deep.eq([
          'node_modules/browser-pack/_prelude.js',
          'test/fixtures/typescript/math.ts',
          'test/fixtures/typescript/simple.spec.tsx',
        ])

        return verifySourceContents(sourceMap)
      })
    })

    it('handles .tsx file when the path is given', () => {
      return bundle('typescript/react_spec.tsx', {
        typescript,
      }).then((output) => {
        // check that bundled tests work
        eval(output)
      })
    })
  })
})
