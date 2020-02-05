const dom = require('./dom').default

context('imports default string', function () {
  it('works', () => {
    expect(dom, 'dom').to.be.a('string')
    expect(dom).to.equal('dom')
  })
})
