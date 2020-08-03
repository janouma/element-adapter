/* eslint-env jest */

import { length, constant } from '../../src/lib/calculators'

describe('lib/calculators', () => {
  it('#length should return a calculator which calculate length according to units', () => {
    const unitsMeasurements = { em: 16 }
    const calculator = length(0.5, 'em')
    const computed = calculator(unitsMeasurements)

    expect(computed).toBe(8)
  })

  it('#constant should return a calculator which act like the identity function', () => {
    const value = 13.5
    const calculator = constant(value)
    const computed = calculator()

    expect(computed).toBe(value)
  })
})
