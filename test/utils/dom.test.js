/* eslint-env jest */

import {
  isInputElement,
  countCharacters,
  findFirstEditableAncestor,
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

  it('#findFirstEditableAncestor should find the first editable ancestor of a node', () => {
    const FIRST_ANCESTOR = 0
    const SND_ANCESTOR = 1
    const LEAF_NODE = 2

    const body = document.createElement('body')

    const nodes = [
      document.createElement('section'),
      document.createElement('div'),
      document.createTextNode('text node')
    ]

    body.appendChild(nodes[FIRST_ANCESTOR])
    nodes[FIRST_ANCESTOR].appendChild(nodes[SND_ANCESTOR])
    nodes[SND_ANCESTOR].appendChild(nodes[LEAF_NODE])

    nodes.forEach(n => {
      n.isContentEditable = true

      if (n.nodeType !== window.Node.TEXT_NODE) {
        n.setAttribute('contenteditable', n.isContentEditable)
      }
    })

    expect(findFirstEditableAncestor(nodes[LEAF_NODE])).toBe(nodes[FIRST_ANCESTOR])
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
