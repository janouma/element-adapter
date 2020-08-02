/* eslint-env jest */

describe('lib/query_processor', () => {
  describe('#runQuery', () => {
    let runQuery
    let length
    let constant
    let greaterThanOrEqual
    let lesserThan
    let lesserThanOrEqual

    jest.isolateModules(() => {
      ({ length, constant } = require('../../src/lib/calculators'));

      ({
        default: {
          '>=': greaterThanOrEqual,
          '<': lesserThan,
          '<=': lesserThanOrEqual
        }
      } = require('../../src/lib/comparators'));

      ({ runQuery } = require('../../src/lib/query_processor'))
    })

    // literal query: `width >= 6.25em && height < 50%, aspect-ratio <= 16/9, width >= 680px`
    const query = [
      [
        { width: greaterThanOrEqual(length(6.25, 'em')) },
        { height: lesserThan(length(50, 'h%')) }
      ],

      [{ 'aspect-ratio': lesserThanOrEqual(constant(16 / 9)) }],
      [{ width: greaterThanOrEqual(constant(680)) }]
    ]

    const unitsMeasurements = {
      em: 1,
      'h%': 2
    }

    it('should eval query to true when criteria are met', () => {
      const props = {
        // 7 is >= 6.25 * 1
        width: 7,

        // 98 is < 50 * 2
        height: 98,

        // 16/9 is <= 16/9
        'aspect-ratio': 16 / 9
      }

      expect(runQuery({ query, unitsMeasurements, props })).toBe(true)
    })

    it('should eval query to false when criteria are not met', () => {
      const props = {
        // 6 is NOT >= 6.25 * 1
        // 6 is NOT >= 680
        width: 6,

        // 98 is < 50 * 2
        height: 98,

        // 16/9 is NOT <= 16/8
        'aspect-ratio': 16 / 8
      }

      expect(runQuery({ query, unitsMeasurements, props })).toBe(false)
    })
  })

  describe('#compileQueryList', () => {
    let compileQueryList

    jest.doMock('../../src/lib/calculators', () => ({
      length: (x, unit) => () => `length(${x}, ${unit})`,
      constant: x => () => `constant(${x})`
    }))

    jest.doMock('../../src/lib/comparators', () => ({
      '>': valueFn => `greaterThan(${valueFn()})`,
      '>=': valueFn => `greaterThanOrEqual(${valueFn()})`,
      '<': valueFn => `lesserThan(${valueFn()})`,
      '<=': valueFn => `lesserThanOrEqual(${valueFn()})`,
      '==': valueFn => `equal(${valueFn()})`
    }))

    jest.isolateModules(() => ({ compileQueryList } = require('../../src/lib/query_processor')))

    it('should compile query list', () => {
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
})
