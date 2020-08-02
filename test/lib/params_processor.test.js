/* eslint-env jest */

import { parseTarget } from '../../src/lib/params_processor'

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
})
