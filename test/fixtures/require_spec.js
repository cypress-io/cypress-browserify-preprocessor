context('non-top-level requires', function () {
  const math = require('./math')
  const dom = require('./dom')

  it('imports proper types of values', () => {
    expect(math.add, 'add').to.be.a('function')
    expect(dom, 'dom').to.be.a('string')
  })

  it('values are correct', function () {
    expect(math.add(1, 2)).to.eq(3)
    expect(dom, 'dom').to.equal('dom')
  })
})
