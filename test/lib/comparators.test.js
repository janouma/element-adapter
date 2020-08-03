/* eslint-env jest */

import comparators from '../../src/lib/comparators'

const {
  '>': greaterThan,
  '>=': greaterThanOrEqual,
  '<': lesserThan,
  '<=': lesserThanOrEqual,
  '==': equal
} = comparators

const computed = 8
const unitsMeasurements = { em: 16 }
const calculator = jest.fn(() => computed).mockName('calculator')
const calculatorFactory = () => calculator

const createComparisonTest = compare => ({ prop, expected }) => {
  expect(compare(unitsMeasurements, prop)).toBe(expected)
  expect(calculator).toHaveBeenCalledWith(unitsMeasurements)
}

const createTypeMismatchTest = compare => () => {
  const prop = '7'
  expect(() => compare(unitsMeasurements, prop))
    .toThrow(`type mismatch: a(${prop}) is ${typeof prop} and b(${computed}) is ${typeof computed}`)
}

describe('lib/comparators', () => {
  afterEach(() => calculator.mockClear())

  describe('#greaterThan', () => {
    const comparator = greaterThan(calculatorFactory())

    it.each`
      case                                              | prop      | expected

      ${'compared prop is greater than computed value'} | ${9}      | ${true}
      ${'compared prop is equal to computed value'}     | ${8}      | ${false}
      ${'compared prop is lesser than computed value'}  | ${7}      | ${false}
    `('should return $expected if $case', createComparisonTest(comparator))

    it('should throw if prop and computed types mismatch', createTypeMismatchTest(comparator))
  })

  describe('#greaterThanOrEqual', () => {
    const comparator = greaterThanOrEqual(calculatorFactory())

    it.each`
      case                                              | prop      | expected

      ${'compared prop is greater than computed value'} | ${9}      | ${true}
      ${'compared prop is equal to computed value'}     | ${8}      | ${true}
      ${'compared prop is lesser than computed value'}  | ${7}      | ${false}
    `('should return $expected if $case', createComparisonTest(comparator))

    it('should throw if prop and computed types mismatch', createTypeMismatchTest(comparator))
  })

  describe('#lesserThan', () => {
    const comparator = lesserThan(calculatorFactory())

    it.each`
      case                                              | prop      | expected

      ${'compared prop is lesser than computed value'}  | ${7}      | ${true}
      ${'compared prop is equal to computed value'}     | ${8}      | ${false}
      ${'compared prop is greater than computed value'} | ${9}      | ${false}
    `('should return $expected if $case', createComparisonTest(comparator))

    it('should throw if prop and computed types mismatch', createTypeMismatchTest(comparator))
  })

  describe('#lesserThanOrEqual', () => {
    const comparator = lesserThanOrEqual(calculatorFactory())

    it.each`
      case                                              | prop      | expected

      ${'compared prop is lesser than computed value'}  | ${7}      | ${true}
      ${'compared prop is equal to computed value'}     | ${8}      | ${true}
      ${'compared prop is greater than computed value'} | ${9}      | ${false}
    `('should return $expected if $case', createComparisonTest(comparator))

    it('should throw if prop and computed types mismatch', createTypeMismatchTest(comparator))
  })

  describe('#equal', () => {
    const comparator = equal(calculatorFactory())

    it.each`
      case                                              | prop      | expected

      ${'compared prop is equal to computed value'}     | ${8}      | ${true}
      ${'compared prop is different from computed'}     | ${9}      | ${false}
    `('should return $expected if $case', createComparisonTest(comparator))

    it('should throw if prop and computed types mismatch', createTypeMismatchTest(comparator))
  })
})
