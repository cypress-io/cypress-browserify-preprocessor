import mul from './mul'

context('mul.js imports default', function () {
  it('imports function', () => {
    expect(mul, 'mul').to.be.a('function')
  })
  it('can multiply numbers', function () {
    expect(mul(3, 2)).to.eq(6)
  })
})
