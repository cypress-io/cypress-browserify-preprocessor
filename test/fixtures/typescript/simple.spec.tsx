import { multiply } from './math'

describe('simple .tsx spec', () => {
  it('can import another module and add', () => {
    const EXPECTED = 6
    const result = multiply(2, 3)

    if (result !== EXPECTED) {
      throw new Error(`multiplying 2*3 did not equal ${EXPECTED}. received: ${result}`)
    }
  })
})
