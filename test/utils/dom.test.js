/* eslint-env jest */

import {
  isInputElement,
  countCharacters,
  findCurrentTarget,
  observeMutations
} from '../../src/utils/dom'

describe('utils/dom', () => {
  describe('#isInputElement', () => {
    it('should return true for a textarea', () => {
      expect(isInputElement(document.createElement('textarea'))).toBe(true)
    })

    it.each`
      type          | expected

      ${'text'}     | ${true}
      ${'color'}    | ${true}
      ${'date'}     | ${true}
      ${'datetime'} | ${true}
      ${'email'}    | ${true}
      ${'file'}     | ${true}
      ${'month'}    | ${true}
      ${'number'}   | ${true}
      ${'password'} | ${true}
      ${'tel'}      | ${true}
      ${'search'}   | ${true}
      ${'time'}     | ${true}
      ${'url'}      | ${true}
      ${'week'}     | ${true}
      ${'button'}   | ${false}
      ${'checkbox'} | ${false}
      ${'hidden'}   | ${false}
      ${'image'}    | ${false}
      ${'radio'}    | ${false}
      ${'range'}    | ${false}
      ${'reset'}    | ${false}
      ${'submit'}   | ${false}
    `('should return $expected for a "$type" input', ({ type, expected }) => {
      const textInput = document.createElement('input')
      textInput.setAttribute('type', type)

      expect(isInputElement(textInput)).toBe(expected)
    })

    it('should return false for non-input elements', () => {
      expect(isInputElement(document.createElement('div'))).toBe(false)
    })
  })

  describe('#countCharacters', () => {
    it('should count characters of an input elt', () => {
      const textInput = document.createElement('input')
      textInput.setAttribute('type', 'text')
      textInput.value = 'text input'

      expect(countCharacters(textInput)).toBe(textInput.value.length)
    })

    it('should count characters of a textarea', () => {
      const textarea = document.createElement('input')
      textarea.value = 'textarea'

      expect(countCharacters(textarea)).toBe(textarea.value.length)
    })

    it('should return 0 for non-input elements', () => {
      expect(countCharacters(document.createElement('div'))).toBe(0)
    })
  })

  describe('#findCurrentTarget', () => {
    const firstAncestor = document.createElement('section')
    const sndAncestor = document.createElement('div')
    const thirdAncestor = document.createElement('article')
    const leafNode = document.createTextNode('text node')

    const observedElts = [firstAncestor, thirdAncestor]

    firstAncestor.appendChild(sndAncestor)
    sndAncestor.appendChild(thirdAncestor)
    thirdAncestor.appendChild(leafNode)

    it('should return target if target is the actual currentTarget', () => {
      expect(findCurrentTarget(observedElts, firstAncestor)).toBe(firstAncestor)
    })

    it('should return closest observed parent', () => {
      expect(findCurrentTarget(observedElts, sndAncestor)).toBe(firstAncestor)
      expect(findCurrentTarget(observedElts, thirdAncestor)).toBe(thirdAncestor)
    })

    it('should works for text nodes', () => {
      expect(findCurrentTarget(observedElts, leafNode)).toBe(thirdAncestor)
    })

    it('should return nothing when current target is not included in node tree', () => {
      const div = document.createElement('div')
      const span = document.createElement('span')

      div.appendChild(span)

      expect(findCurrentTarget(observedElts, span)).not.toBeDefined()
    })
  })

  describe('#observeMutations', () => {
    const observer = { observe: jest.fn().mockName('observe') }
    const element = 'elt'

    afterEach(() => jest.clearAllMocks())

    it.each([
      true,
      false,
      undefined
    ])('should properly configure observer when "includeCharacters" argument is %s', includeCharacters => {
      observeMutations(observer, element, includeCharacters)

      expect(observer.observe).toHaveBeenCalledWith(element, {
        childList: true,
        characterData: Boolean(includeCharacters),
        subtree: Boolean(includeCharacters)
      })
    })
  })
})
