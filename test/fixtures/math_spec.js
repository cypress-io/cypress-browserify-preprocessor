import { add } from './math'

context('math.js', function () {
  it('imports function', () => {
    expect(add, 'add').to.be.a('function')
  })
  it('can add numbers', function () {
    expect(add(1, 2)).to.eq(3)
  })
})
