import { divide } from './divide'

context('ES6 named export and import', function () {
  it('works', () => {
    expect(divide, 'divide').to.be.a('function')
    expect(divide(10, 2)).to.eq(5)
  })
})
