/* eslint-env jest */

import times from 'lodash.times'
import observeAll from '../../src/lib/observer'

import {
  createDimensionListener,
  createInputListener,
  createChildrenListener
} from '../../src/lib/listeners_factories'

import {
  computeInitialProps,
  adapt,
  clearFunctionBehaviourApplyCache
} from '../../src/lib/adapters'

import { WATCHABLE_PROPERTIES } from '../../src/lib/constants'

jest.mock('../../src/lib/listeners_factories', () => ({
  createDimensionListener: jest.fn().mockName('createDimensionListener'),
  createInputListener: jest.fn().mockName('createInputListener'),
  createChildrenListener: jest.fn().mockName('createChildrenListener')
}))

jest.mock('../../src/lib/adapters', () => ({
  ...jest.requireActual('../../src/lib/adapters'),

  computeInitialProps: jest.fn().mockName('computeInitialProps'),
  adapt: jest.fn().mockName('adapt'),
  clearFunctionBehaviourApplyCache: jest.fn().mockName('clearFunctionBehaviourApplyCache')
}))

describe('lib/observer', () => {
  const observeResize = jest.fn().mockName('observe')
  const unobserveResize = jest.fn().mockName('unobserve')
  const originalResizeObserver = window.ResizeObserver

  const ResizeObserver =
    window.ResizeObserver =
      jest.fn(() => ({
        observe: observeResize,
        unobserve: unobserveResize
      })).mockName('ResizeObserver')

  const observeMutation = jest.fn().mockName('observe')
  const disconnectMutationObserver = jest.fn().mockName('disconnect')
  const originalMutationObserver = window.MutationObserver

  const MutationObserver =
    window.MutationObserver =
      jest.fn(() => ({
        observe: observeMutation,
        disconnect: disconnectMutationObserver
      })).mockName('MutationObserver')

  const inputListener = () => {}

  afterEach(() => jest.clearAllMocks())

  afterAll(() => Object.assign(window, {
    ResizeObserver: originalResizeObserver,
    MutationObserver: originalMutationObserver
  }))

  describe('#createDimensionListener', () => {
    const dimensionListener = () => {}
    createDimensionListener.mockImplementation(() => dimensionListener)

    const elements = [
      document.createElement('div'),
      document.createElement('span')
    ]

    const commonObserveParams = {
      elements,
      compiledQueries: new Map([[['classA'], ['{ width: greaterThan(constant(300)) }']]]),
      units: ['em'],
      percentUnits: ['w%']
    }

    it.each([
      'width',
      'height',
      'orientation',
      'aspect-ratio'
    ])('should observe dimensions if "%s" is watched', watchedProperty => {
      const params = {
        ...commonObserveParams,
        watchedProperties: [watchedProperty]
      }

      observeAll(params)

      expect(createDimensionListener).toHaveBeenCalledWith({
        ...params,
        propsCache: expect.any(WeakMap)
      })

      expect(ResizeObserver).toHaveBeenCalledTimes(1)
      expect(ResizeObserver).toHaveBeenCalledWith(dimensionListener)
      expect(observeResize).toHaveBeenCalledTimes(elements.length)
      elements.forEach(e => expect(observeResize).toHaveBeenCalledWith(e))
    })

    it.each([
      'children',
      'characters'
    ])('should NOT observe dimensions if only "%s" is watched', watchedProperty => {
      observeAll({
        ...commonObserveParams,
        watchedProperties: [watchedProperty]
      })

      expect(createDimensionListener).not.toHaveBeenCalled()
      expect(ResizeObserver).not.toHaveBeenCalled()
      expect(observeResize).not.toHaveBeenCalled()
    })
  })

  describe('#createInputListener', () => {
    createInputListener.mockImplementation(() => inputListener)

    const watchedProperties = ['characters']

    const textInput = document.createElement('input')
    textInput.setAttribute('type', 'text')

    const elements = [
      textInput,
      document.createElement('textarea')
    ]

    const commonObserveParams = {
      elements,
      compiledQueries: new Map([[['classA'], ['{ characters: greaterThan(constant(300)) }']]]),
      units: [],
      percentUnits: []
    }

    elements.forEach(e => jest.spyOn(e, 'addEventListener').mockName('addEventListener'))

    afterEach(() => textInput.setAttribute('type', 'text'))

    it('should listen to input if "characters" prop is watched', () => {
      const params = {
        ...commonObserveParams,
        watchedProperties
      }

      observeAll(params)

      expect(createInputListener).toHaveBeenCalledWith({
        ...params,
        propsCache: expect.any(WeakMap)
      })

      elements.forEach(e => expect(e.addEventListener).toHaveBeenCalledWith('input', inputListener))
    })

    it('should NOT listen to input if elt is not a textfield', () => {
      const div = document.createElement('div')
      textInput.setAttribute('type', 'image')
      jest.spyOn(div, 'addEventListener').mockName('addEventListener')

      const params = {
        ...commonObserveParams,
        elements: [...elements, div],
        watchedProperties
      }

      observeAll(params)

      expect(createInputListener).toHaveBeenCalledWith({
        ...params,
        propsCache: expect.any(WeakMap)
      })

      const [, textarea] = elements
      expect(textarea.addEventListener).toHaveBeenCalledWith('input', inputListener)

      expect(div.addEventListener).not.toHaveBeenCalled()
      expect(textInput.addEventListener).not.toHaveBeenCalled()
    })

    it('should NOT create input listener if none of the elements is a textfield', () => {
      const div = document.createElement('div')
      jest.spyOn(div, 'addEventListener').mockName('addEventListener')

      const span = document.createElement('span')
      jest.spyOn(span, 'addEventListener').mockName('addEventListener')

      const anythingButTextfields = [div, span]

      observeAll({
        ...commonObserveParams,
        elements: anythingButTextfields,
        watchedProperties
      })

      expect(createInputListener).not.toHaveBeenCalled()
      anythingButTextfields.forEach(e => expect(e.addEventListener).not.toHaveBeenCalled())
    })

    it.each([
      'width',
      'height',
      'orientation',
      'aspect-ratio',
      'children'
    ])('should NOT create input listener if only "%s" is watched', watchedProperty => {
      observeAll({
        ...commonObserveParams,
        watchedProperties: [watchedProperty]
      })

      expect(createInputListener).not.toHaveBeenCalled()
      elements.forEach(e => expect(e.addEventListener).not.toHaveBeenCalled())
    })
  })

  describe('#createChildrenListener', () => {
    const childrenListener = () => {}
    createChildrenListener.mockImplementation(() => childrenListener)

    const elements = [
      document.createElement('div'),
      document.createElement('span')
    ]

    const commonObserveParams = {
      elements,
      compiledQueries: new Map([[['classA'], ['{ children: greaterThan(constant(3)) }']]]),
      units: [],
      percentUnits: []
    }

    const watchedProperties = ['children']

    it('should observe children if "children" prop is watched', () => {
      const params = {
        ...commonObserveParams,
        watchedProperties
      }

      observeAll(params)

      expect(createChildrenListener).toHaveBeenCalledWith({
        ...params,
        propsCache: expect.any(WeakMap)
      })

      expect(MutationObserver).toHaveBeenCalledTimes(1)
      expect(MutationObserver).toHaveBeenCalledWith(childrenListener)
      expect(observeMutation).toHaveBeenCalledTimes(elements.length)

      elements.forEach(e => expect(observeMutation).toHaveBeenCalledWith(
        e,
        {
          childList: true,
          characterData: false,
          subtree: false
        }
      ))
    })

    it('should observe children if "characters" is watched on editable element', () => {
      const editableDiv = document.createElement('div')
      editableDiv.isContentEditable = true
      editableDiv.setAttribute('contenteditable', editableDiv.isContentEditable)

      const params = {
        ...commonObserveParams,
        elements: [...elements, editableDiv],
        watchedProperties: ['characters']
      }

      observeAll(params)

      expect(createChildrenListener).toHaveBeenCalledWith({
        ...params,
        propsCache: expect.any(WeakMap)
      })

      expect(observeMutation).toHaveBeenCalledTimes(1)

      expect(observeMutation).toHaveBeenCalledWith(
        editableDiv,
        {
          childList: true,
          characterData: true,
          subtree: true
        }
      )
    })

    it('should observe neither "characterData" nor "subtree" if "children" is watched but elt is non-editable', () => {
      const editableDiv = document.createElement('div')
      editableDiv.isContentEditable = true
      editableDiv.setAttribute('contenteditable', editableDiv.isContentEditable)

      const updatedElements = [...elements, editableDiv]

      const params = {
        ...commonObserveParams,
        elements: updatedElements,

        watchedProperties: [
          'children',
          'characters'
        ]
      }

      observeAll(params)

      expect(observeMutation).toHaveBeenCalledTimes(updatedElements.length)

      elements.forEach(e => expect(observeMutation).toHaveBeenCalledWith(
        e,
        {
          childList: true,
          characterData: false,
          subtree: false
        }
      ))

      expect(observeMutation).toHaveBeenCalledWith(
        editableDiv,
        {
          childList: true,
          characterData: true,
          subtree: true
        }
      )
    })

    it.each([
      'width',
      'height',
      'orientation',
      'aspect-ratio',
      'characters'
    ])('should NOT observe children if only %s is watched on non-editable elements', watchedProperty => {
      observeAll({
        ...commonObserveParams,
        watchedProperties: [watchedProperty]
      })

      expect(createChildrenListener).not.toHaveBeenCalled()
      expect(MutationObserver).not.toHaveBeenCalled()
      expect(observeMutation).not.toHaveBeenCalled()
    })

    it('should NOT observe children for input elements', () => {
      observeAll({
        ...commonObserveParams,

        elements: [
          ...elements,
          document.createElement('textarea')
        ],

        watchedProperties
      })

      expect(observeMutation).toHaveBeenCalledTimes(elements.length)

      elements.forEach(e => expect(observeMutation).toHaveBeenCalledWith(
        e,
        {
          childList: true,
          characterData: false,
          subtree: false
        }
      ))
    })

    it('should NOT create children listener if all elemnts are inputs', () => {
      const textInput = document.createElement('input')
      textInput.setAttribute('type', 'text')

      observeAll({
        ...commonObserveParams,

        elements: [
          textInput,
          document.createElement('textarea')
        ],

        watchedProperties
      })

      expect(createChildrenListener).not.toHaveBeenCalled()
      expect(MutationObserver).not.toHaveBeenCalled()
      expect(observeMutation).not.toHaveBeenCalled()
    })
  })

  it('should computeInitial props', () => {
    const elements = [
      document.createElement('div'),
      document.createElement('span')
    ]

    const watchedProperties = ['width']

    observeAll({
      elements,
      compiledQueries: new Map([[['classA'], ['{ width: greaterThan(constant(300)) }']]]),
      units: ['em'],
      percentUnits: ['w%'],
      watchedProperties
    })

    expect(computeInitialProps).toHaveBeenCalledTimes(elements.length)
    elements.forEach(e => expect(computeInitialProps).toHaveBeenCalledWith(e, watchedProperties))
  })

  it('should populate propsCache with initialProps', () => {
    const propsByElt = new WeakMap()

    const elements = [
      document.createElement('div'),
      document.createElement('span')
    ]

    const [div, span] = elements

    propsByElt.set(div, { width: 532 })
    propsByElt.set(span, { width: 266 })

    times(2, () => computeInitialProps.mockImplementationOnce(e => propsByElt.get(e)))

    observeAll({
      elements,
      compiledQueries: new Map([[['classA'], ['{ width: greaterThan(constant(300)) }']]]),
      units: ['em'],
      percentUnits: ['w%'],
      watchedProperties: ['width']
    })

    const { mock: { calls: [[{ propsCache }]] } } = createDimensionListener

    elements.forEach(e => expect(propsCache.get(e)).toBe(propsByElt.get(e)))
    expect.assertions(2)
  })

  it('should apply initial style based on initial props', () => {
    const propsByElt = new WeakMap()

    const elements = [
      document.createElement('div'),
      document.createElement('span')
    ]

    const [div, span] = elements
    const compiledQueries = new Map([[['classA'], ['{ width: greaterThan(constant(300)) }']]])
    const units = ['em']
    const percentUnits = ['w%']
    const watchedProperties = ['width']

    propsByElt.set(div, { width: 532 })
    propsByElt.set(span, { width: 266 })

    times(2, () => computeInitialProps.mockImplementationOnce(e => propsByElt.get(e)))

    observeAll({
      elements,
      compiledQueries,
      units,
      percentUnits,
      watchedProperties
    })

    expect(adapt).toHaveBeenCalledTimes(elements.length)

    elements.forEach(e => expect(adapt).toHaveBeenCalledWith({
      elt: e,
      props: propsByElt.get(e),
      queries: compiledQueries,
      units,
      percentUnits
    }))
  })

  describe('#cleanUp', () => {
    const elements = [
      document.createElement('div'),
      document.createElement('span'),
      document.createElement('textarea')
    ]

    elements.forEach(e => {
      jest.spyOn(e, 'removeEventListener')

      const style = { removeProperty: jest.fn().mockName('removeProperty') }
      jest.spyOn(e, 'style', 'get').mockImplementation(() => style)

      const classList = { remove: jest.fn().mockName('remove') }
      jest.spyOn(e, 'classList', 'get').mockImplementation(() => classList)
    })

    const params = {
      elements,

      compiledQueries: new Map([
        ['classA', '{ width: greaterThan(constant(300)) }'],
        ['classB', '{ characters: greaterThan(constant(300)) }'],
        ['classC', '{ children: greaterThan(constant(3)) }'],
        [function notifySquareScreen () {}, 'equal(constant(square))']
      ]),

      units: ['em'],
      percentUnits: ['w%'],

      watchedProperties: [
        'width',
        'children',
        'characters'
      ]
    }

    it('should stop observing when calling cleanUp function', () => {
      const { unobserve: cleanUp } = observeAll(params)

      cleanUp()

      expect(disconnectMutationObserver).toHaveBeenCalledTimes(1)
      expect(unobserveResize).toHaveBeenCalledTimes(elements.length)
      elements.forEach(e => expect(unobserveResize).toHaveBeenCalledWith(e))

      const [div, span, textarea] = elements

      expect(div.removeEventListener).not.toHaveBeenCalled()
      expect(span.removeEventListener).not.toHaveBeenCalled()
      expect(textarea.removeEventListener).toHaveBeenCalledWith('input', inputListener)
      expect(clearFunctionBehaviourApplyCache).toHaveBeenCalledWith(elements)
    })

    it('should not attempt to stop observing if no properties are watched', () => {
      const { unobserve: cleanUp } = observeAll({
        ...params,
        watchedProperties: []
      })

      cleanUp()

      expect(disconnectMutationObserver).not.toHaveBeenCalled()
      expect(unobserveResize).not.toHaveBeenCalled()
      elements.forEach(e => expect(e.removeEventListener).not.toHaveBeenCalled())
    })

    it('should clear all behavioural styles', () => {
      const { unobserve: cleanUp } = observeAll(params)

      cleanUp()

      const behaviourCssClasses = [...params.compiledQueries.keys()].filter(key => typeof key === 'string')

      elements.forEach(e => {
        expect(e.classList.remove)
          .toHaveBeenCalledWith(...behaviourCssClasses)

        expect(e.style.removeProperty).toHaveBeenCalledTimes(WATCHABLE_PROPERTIES.length)

        WATCHABLE_PROPERTIES.forEach(
          prop => expect(e.style.removeProperty)
            .toHaveBeenCalledWith(`--ea-${prop}`)
        )
      })
    })
  })

  describe('#refresh', () => {
    const elements = [
      document.createElement('div'),
      document.createElement('span')
    ]

    const compiledQueries = new Map([
      ['classA', '{ width: greaterThan(constant(300)) }'],
      ['classB', '{ characters: greaterThan(constant(300)) }'],
      ['classC', '{ children: greaterThan(constant(3)) }']
    ])

    const units = ['em']
    const percentUnits = ['w%']

    const params = {
      elements,
      compiledQueries,

      units,
      percentUnits,

      watchedProperties: [
        'width',
        'children',
        'characters'
      ]
    }

    it('should apply adaptive behaviour on elements', () => {
      const propsByElt = new WeakMap()
      const [div, span] = elements

      propsByElt.set(div, { width: 532 })
      propsByElt.set(span, { width: 266 })

      times(2, () => computeInitialProps.mockImplementationOnce(e => propsByElt.get(e)))

      const { applyAdaptiveBehaviour } = observeAll(params)

      adapt.mockClear()

      applyAdaptiveBehaviour()

      expect(adapt).toHaveBeenCalledTimes(elements.length)
      elements.forEach(e => expect(adapt).toHaveBeenCalledWith({
        elt: e,
        props: propsByElt.get(e),
        queries: compiledQueries,
        units,
        percentUnits
      }))
    })

    it('should do nothing after cleanUp have been called', () => {
      const {
        unobserve: cleanUp,
        applyAdaptiveBehaviour
      } = observeAll(params)

      adapt.mockClear()

      cleanUp()
      applyAdaptiveBehaviour()

      expect(adapt).not.toHaveBeenCalled()
    })
  })
})
