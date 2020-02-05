import { sub } from './sub'

context('sub.js', function () {
  it('imports function', () => {
    expect(sub, 'sub').to.be.a('function')
  })
  it('can subtract numbers', function () {
    expect(sub(1, 2)).to.eq(-1)
  })
})
