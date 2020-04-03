import React from 'react'
import { expect } from 'chai'

import MyComponent from './component'

describe('<MyComponent />', () => {
  it('renders an `.icon-star`', () => {
    const component = <MyComponent />

    expect(component.type().type).to.equal('div')
    expect(component.type().props.className).to.equal('icon-star')
    expect(component.type().props.children).to.equal('icon')
  })
})
