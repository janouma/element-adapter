/* eslint-env jest */

import {
  measureNonPercentUnits,
  measurePercentUnits,
  computeOrientation,
  computeRatio
} from '../../src/utils/dimensions'

describe('utils/dimensions', () => {
  const unitsPixelValues = {
    em: 16,
    ch: 5,
    'w%': 12.5,
    'h%': 4.275
  }

  jest.spyOn(window.Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function getBoundingClientRect () {
      const width = this.style.getPropertyValue('width')
      const height = this.style.getPropertyValue('height')
      const wunit = width && (width.endsWith('%') ? 'w%' : width.slice(-2))
      const hunit = height && (height.endsWith('%') ? 'h%' : height.slice(-2))

      return {
        width: unitsPixelValues[wunit],
        height: unitsPixelValues[hunit]
      }
    }).mockName('getBoundingClientRect')

  afterEach(() => jest.clearAllMocks())

  afterAll(() => window.Element.prototype.getBoundingClientRect.mockRestore())

  describe('#measureNonPercentUnits', () => {
    const units = ['em', 'ch']
    let elt

    beforeEach(() => {
      elt = document.createElement('div')
      jest.spyOn(elt, 'appendChild').mockName('appendChild')
    })

    it('should return the pixel value of one unit given an array of units', () => {
      const measurements = measureNonPercentUnits(elt, units)

      expect(measurements).toEqual({
        em: 16,
        ch: 5
      })
    })

    it('should not modify elt layout', () => {
      measureNonPercentUnits(elt, units)

      const { calls: [[sample]] } = elt.appendChild.mock

      expect(sample.style.getPropertyValue('position')).toBe('absolute')
    })

    it('should retore elt markup after measurement', () => {
      measureNonPercentUnits(elt, units)
      expect(elt.outerHTML).toEqual('<div></div>')
    })
  })

  describe('#measurePercentUnits', () => {
    const units = ['w%', 'h%']
    let parent
    let elt

    beforeEach(() => {
      parent = document.createElement('section')
      elt = document.createElement('div')
      parent.appendChild(elt)

      jest.spyOn(parent, 'appendChild').mockName('appendChild')
    })

    it('should return the pixel value of one unit given an array of units', () => {
      const measurements = measurePercentUnits(elt, units)

      expect(measurements).toEqual({
        'w%': 12.5,
        'h%': 4.275
      })
    })

    it('should not modify elt layout', () => {
      measurePercentUnits(elt, units)

      const { calls: [[sample]] } = parent.appendChild.mock

      expect(sample.style.getPropertyValue('position')).toBe('absolute')
    })

    it('should retore elt markup after measurement', () => {
      measurePercentUnits(elt, units)
      expect(parent.outerHTML).toEqual('<section><div></div></section>')
    })
  })

  describe('#computeOrientation', () => {
    it.each`
      case                    | orientation     | width | height

      ${'width > height'}     | ${'landscape'}  | ${16} | ${9}
      ${'width < height'}     | ${'portrait'}   | ${9}  | ${16}
      ${'width == height'}    | ${'square'}     | ${16} | ${16}
    `('should return "$orientation" when $case', ({ orientation, width, height }) => {
      expect(computeOrientation(width, height)).toBe(orientation)
    })
  })

  describe('#computeRatio', () => {
    it('should return 1 if width and height equal 0', () => {
      expect(computeRatio(0, 0)).toBe(1)
    })

    it('should return Infinity if height equal 0', () => {
      expect(computeRatio(1, 0)).toBe(Infinity)
    })

    it('should return NaN if width or height is undefined', () => {
      expect(Number.isNaN(computeRatio(undefined, 1))).toBe(true)
      expect(Number.isNaN(computeRatio(undefined, 0))).toBe(true)
    })
  })
})
