/* eslint-env jest */

import { parseTarget, validateOptions, validateQueries } from '../../src/lib/params_processor'
import { WATCHABLE_PROPERTIES } from '../../src/lib/constants'

describe('lib/params_processor', () => {
  describe('#parseTarget', () => {
    it('should throw on missing target', () => {
      expect(() => parseTarget()).toThrow('target must be provided')
    })

    it('should throw on empty target list', () => {
      expect(() => parseTarget([])).toThrow('at least one Element must be provided as target')
    })

    it('should throw when target is a string', () => {
      expect(() => parseTarget('a')).toThrow(/^target must be an Element or a list of Elements. Actual:\n/)
    })

    it('should throw when target is not an Element', () => {
      expect(() => parseTarget({})).toThrow(/^target must be an Element or a list of Elements. Actual:\n/)
    })

    it('should throw when target is a list contaning a non-Elemnt item', () => {
      expect(() => parseTarget([
        document.createElement('div'),
        {}
      ])).toThrow(/^target must be an Element or a list of Elements. Actual:\n/)
    })

    it('should throw when target is a list contaning an undefined item', () => {
      expect(() => parseTarget([
        document.createElement('div'),
        null
      ])).toThrow(/^target must be an Element or a list of Elements. Actual:\n/)
    })

    it('should get an array of Elements from any array-like object of Elements', () => {
      const arrayOfElts = [
        document.createElement('div'),
        document.createElement('span')
      ]

      const arrayLikeOfElts = {
        length: arrayOfElts.length,
        forEach: arrayOfElts.forEach.bind(arrayOfElts),
        ...arrayOfElts
      }

      const elements = parseTarget(arrayLikeOfElts)

      expect(elements).toHaveLength(arrayOfElts.length)
      expect(elements.every(e => arrayOfElts.includes(e))).toBe(true)
    })

    it('should get an array of Elements from an array of Elements', () => {
      const arrayOfElements = [
        document.createElement('div'),
        document.createElement('span')
      ]

      const elements = parseTarget(arrayOfElements)

      expect(elements).toHaveLength(arrayOfElements.length)
      expect(elements.every(e => arrayOfElements.includes(e))).toBe(true)
    })

    it('should get an array of Elements from an Element', () => {
      const element = document.createElement('div')

      const elements = parseTarget(element)

      expect(elements).toHaveLength(1)
      expect(elements[0]).toBe(element)
    })
  })

  describe('#validateOptions', () => {
    it('should accept empty object', () => {
      expect(() => validateOptions({ watchedProperties: null })).not.toThrow()
    })

    it('should accept all watchable properties', () => {
      expect(() => validateOptions({ watchedProperties: WATCHABLE_PROPERTIES })).not.toThrow()
    })

    it('should reject any property missing from watchable ones', () => {
      expect(() => validateOptions({ watchedProperties: ['width', 'client-width'] }))
        .toThrow(`watchedProperties must be an array with at least one of ${WATCHABLE_PROPERTIES.join(', ')}`)
    })

    it('should reject  an empty array as "watchedProperties"', () => {
      expect(() => validateOptions({ watchedProperties: [] }))
        .toThrow(`watchedProperties must be an array with at least one of ${WATCHABLE_PROPERTIES.join(', ')}`)
    })

    it('should reject "watchedProperties" which is not an array', () => {
      expect(() => validateOptions({ watchedProperties: {} })).toThrow('watchedProperties must be an array')
    })
  })

  describe('#validateQueries', () => {
    it('should accept valid queries', () => {
      expect(() => validateQueries({
        classA: `width   >=    6.25em  &&   height  <  50%, aspect-ratio <= ${16 / 9}, width   >= 680px`,
        classB: '   orientation   ==  landscape  ',
        classC: '  width > 75%',
        classD: 'characters  > 10',
        classE: 'children >=  2 && children < 5  ',
        classF: 'characters   == 0',
        classG: 'width >= 75em,height >=  80%',
        classH: 'orientation == portrait',
        classI: 'orientation == square'
      })).not.toThrow()
    })

    it.each`
      case                                                    | query

      ${'query which is empty'}                               | ${''}
      ${'query which is blank'}                               | ${' '}
      ${'query having unknown property'}                      | ${'client-width >= 45px'}
      ${'query comparing length to unitless value'}           | ${'width >= 45.5'}
      ${'query comparing length to unkown unit value'}        | ${'width >= 33.3po'}
      ${'query comparing aspect-ratio to length'}             | ${'aspect-ratio >= 33.3ch'}
      ${'query comparing characters to length'}               | ${'characters >= 33ch'}
      ${'query comparing characters to float'}                | ${'characters >= 33.3'}
      ${'query comparing children to length'}                 | ${'children >= 33ch'}
      ${'query comparing children to float'}                  | ${'children >= 33.5'}
      ${'query comparing orientation to unknown value'}       | ${'orientation == 33.5'}
      ${'query comparing orientation with greater'}           | ${'orientation > landscape'}
      ${'query comparing orientation with greater or equal'}  | ${'orientation >= landscape'}
      ${'query comparing orientation with lesser'}            | ${'orientation < landscape'}
      ${'query comparing orientation with lesser or equal'}   | ${'orientation <= landscape'}
      ${'query having unknown comparison sign'}               | ${'width ~ 33.3em'}
      ${'query without space before comparator'}              | ${'width> 33.3em'}
      ${'query without space after comparator'}               | ${'width >33.3em'}
      ${'query without boolean operator'}                     | ${'width >= 45rem height < 33%'}
      ${'query without space before boolean operator'}        | ${'width >= 45rem&& height < 33%'}
      ${'query without space after boolean operator'}         | ${'width >= 45rem &&height < 33%'}
      ${'query having unknown boolean operator'}              | ${'width >= 45rem ^ height < 33%'}
      ${'query without expression separator'}                 | ${'width >= 45rem && height < 33% children <= 2'}
      ${'query having unknown expression separator'}          | ${'width >= 45rem && height < 33% | children <= 2'}
    `('should reject $case', ({ query }) => {
      expect(() => validateQueries({
        classA: query,
        classB: 'width > 75%'
      })).toThrow(`invalid query "${query}"`)
    })
  })
})
