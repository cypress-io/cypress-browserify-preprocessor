// math exports default object
// so if we want a property, first we need to grab the default
import math from './math'
const { add } = math

const x: number = 3

context('math.ts', function () {
  it('imports function', () => {
    expect(add, 'add').to.be.a('function')
  })
  it('can add numbers', function () {
    expect(add(1, 2)).to.eq(3)
  })
  it('test ts-typed variable', function () {
    expect(x).to.eq(3)
  })
  it('test iterator', () => {
    const arr = [...Array(100).keys()]

    expect(arr[0] + arr[1]).to.eq(1)
  })
})
