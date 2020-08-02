/* eslint-env jest */

import { compileQueryList } from '../../src/lib/query_processor'

jest.mock('../../src/lib/calculators', () => ({
  length: (x, unit) => () => `length(${x}, ${unit})`,
  constant: x => () => `constant(${x})`
}))

jest.mock('../../src/lib/comparators', () => ({
  '>': valueFn => `greaterThan(${valueFn()})`,
  '>=': valueFn => `greaterThanOrEqual(${valueFn()})`,
  '<': valueFn => `lesserThan(${valueFn()})`,
  '<=': valueFn => `lesserThanOrEqual(${valueFn()})`,
  '==': valueFn => `equal(${valueFn()})`
}))

describe('lib/query_processor', () => {
  it('#compileQueryList should compile query list', () => {
    const compiled = compileQueryList({
      classA: `width >= 6.25em && height < 50%, aspect-ratio <= ${16 / 9}, width >= 680px`,
      classB: 'orientation == landscape && height < 10.325em',
      classC: 'width > 75%',
      classD: 'characters > 10 && height <= 13.56%',
      classE: 'children >= 2 && children < 5',
      classF: 'characters == 0'
    })

    const compiledQueries = {
      classA: [
        [
          { width: 'greaterThanOrEqual(length(6.25, em))' },
          { height: 'lesserThan(length(50, h%))' }
        ],

        [{ 'aspect-ratio': `lesserThanOrEqual(constant(${16 / 9}))` }],
        [{ width: 'greaterThanOrEqual(constant(680))' }]
      ],

      classB: [[
        { orientation: 'equal(constant(landscape))' },
        { height: 'lesserThan(length(10.325, em))' }
      ]],

      classC: [[{ width: 'greaterThan(length(75, w%))' }]],
      classD: [[
        { characters: 'greaterThan(constant(10))' },
        { height: 'lesserThanOrEqual(length(13.56, h%))' }
      ]],

      classE: [[
        { children: 'greaterThanOrEqual(constant(2))' },
        { children: 'lesserThan(constant(5))' }
      ]],

      classF: [[{ characters: 'equal(constant(0))' }]]
    }

    const units = ['em']

    const percentUnits = ['h%', 'w%']

    const watchedProperties = [
      'width',
      'height',
      'aspect-ratio',
      'orientation',
      'characters',
      'children'
    ]

    expect(compiled).toEqual({
      compiledQueries,
      units,
      percentUnits,
      watchedProperties
    })
  })
})
