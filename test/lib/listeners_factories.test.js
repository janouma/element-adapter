/* eslint-env jest */

import {
  createDimensionListener,
  createInputListener,
  createChildrenListener
} from '../../src/lib/listeners_factories'

import { adapt } from '../../src/lib/adapters'

jest.mock('../../src/lib/adapters', () => ({
  ...jest.requireActual('../../src/lib/adapters'),

  adapt: jest.fn().mockName('adapt')
}))

const compiledQueries = {
  classA: '{ width: greaterThan(constant(300)) }',
  classB: '{ characters: greaterThan(constant(300)) }',
  classC: '{ children: greaterThan(constant(3)) }'
}

const units = ['em']
const percentUnits = ['w%']

const propsCache = {
  map: new WeakMap(),
  get (k) { return this.map.get(k) },
  set (k, v) { this.map.set(k, v) },
  reset () { this.map = new WeakMap() }
}

describe('lib/listeners_factories', () => {
  afterEach(() => {
    jest.clearAllMocks()
    propsCache.reset()
  })

  describe('#createDimensionListener', () => {
    const entries = [
      {
        target: document.createElement('div'),
        contentRect: { width: 160, height: 90 },
        _cachedProps: { children: 2 }
      },
      {
        target: document.createElement('span'),
        contentRect: { width: 56, height: 134 },
        _cachedProps: { characters: 7 }
      }
    ]

    const processDimensions = createDimensionListener({
      propsCache,
      compiledQueries,
      units,
      percentUnits
    })

    jest.spyOn(window, 'requestAnimationFrame')
      .mockImplementation(fn => fn())

    beforeEach(() => entries.forEach(
      ({ target, _cachedProps }) => propsCache.set(target, _cachedProps)
    ))

    afterAll(() => window.requestAnimationFrame.mockRestore())

    it('should create listener that updates dimension props on element resize', () => {
      processDimensions(entries)

      entries.forEach(({
        target,
        _cachedProps,
        contentRect: { width, height }
      }) => expect(propsCache.get(target)).toEqual({
        ..._cachedProps,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        'aspect-ratio': width / height
      }))
    })

    it('should create listener that applies style to elements according to dimensions', () => {
      processDimensions(entries)

      entries.forEach(({
        target,
        _cachedProps,
        contentRect: { width, height }
      }) => {
        const props = {
          ..._cachedProps,
          width,
          height,
          orientation: width > height ? 'landscape' : 'portrait',
          'aspect-ratio': width / height
        }

        expect(adapt).toHaveBeenCalledWith({
          elt: target,
          props,
          queries: compiledQueries,
          units,
          percentUnits
        })
      })
    })
  })

  describe('#createInputListener', () => {
    const textarea = document.createElement('textarea')
    textarea.value = 'textarea'

    const cachedProps = { width: 160 }

    const processCharacters = createInputListener({
      propsCache,
      compiledQueries,
      units,
      percentUnits
    })

    beforeEach(() => propsCache.set(textarea, cachedProps))

    it('should create listener that updates characters prop on input', () => {
      processCharacters({ target: textarea })

      expect(propsCache.get(textarea)).toEqual({
        ...cachedProps,
        characters: textarea.value.length
      })
    })

    it('should create listener that applies style to elements according to characters', () => {
      processCharacters({ target: textarea })

      const props = {
        ...cachedProps,
        characters: textarea.value.length
      }

      expect(adapt).toHaveBeenCalledWith({
        elt: textarea,
        props,
        queries: compiledQueries,
        units,
        percentUnits
      })
    })
  })

  describe('#createChildrenListener', () => {
    const observer = {
      disconnect: jest.fn().mockName('disconnect'),
      observe: jest.fn().mockName('observe')
    };

    [
      'children',
      'characters'
    ].forEach(watchedProperty => {
      const textInput = document.createElement('input')
      textInput.setAttribute('type', 'text')

      const processChildren = createChildrenListener({
        propsCache,
        compiledQueries,
        units,
        percentUnits,

        elements: [
          document.createElement('textarea'),
          textInput
        ],

        watchedProperties: [watchedProperty]
      })

      describe(`when ${watchedProperty} are watched`, () => {
        it(`should stop observing before adapting style when ${watchedProperty} are watched`, () => {
          processChildren([], observer)
          expect(observer.disconnect).toHaveBeenCalledTimes(1)
        })

        it(`should not observe input elements after adapting style when ${watchedProperty} are watched`, () => {
          processChildren([], observer)
          expect(observer.observe).not.toHaveBeenCalled()
        })

        it.each([
          'childList',
          'characterData'
        ])('should ignore "%s" mutations on detached nodes', type => {
          const mutations = [
            {
              type,
              target: document.createTextNode('sqd dqdqs')
            },
            {
              type,
              target: document.createElement('div')
            }
          ]

          processChildren(mutations, observer)

          mutations.forEach(({ target }) => expect(propsCache.get(target)).not.toBeDefined())
          expect(adapt).not.toHaveBeenCalled()
        })
      })
    })

    describe('when children are watched', () => {
      const div = document.createElement('div')
      div.appendChild(document.createElement('b'))

      const span = document.createElement('span')

      const parent = document.createElement('section')

      parent.appendChild(div)
      parent.appendChild(span)

      const type = 'childList'

      const mutations = [
        {
          type,
          target: div,
          _cachedProps: { width: 160, height: 90 }
        },
        {
          type,
          target: span,
          _cachedProps: { width: 56, height: 134 }
        }
      ]

      const elements = mutations.map(({ target }) => target)
      const watchedProperties = ['children']

      const processChildren = createChildrenListener({
        propsCache,
        compiledQueries,
        units,
        percentUnits,
        elements,
        watchedProperties
      })

      beforeEach(() => mutations.forEach(
        ({ target, _cachedProps }) => propsCache.set(target, _cachedProps)
      ))

      it('should create listener that updates children prop on element mutation', () => {
        processChildren(mutations, observer)

        mutations.forEach(({
          target,
          _cachedProps
        }) => expect(propsCache.get(target)).toEqual({
          ..._cachedProps,
          children: target.childElementCount
        }))
      })

      it('should create listener that applies style to elements according to children', () => {
        processChildren(mutations, observer)

        mutations.forEach(({
          target,
          _cachedProps
        }) => {
          const props = {
            ..._cachedProps,
            children: target.childElementCount
          }

          expect(adapt).toHaveBeenCalledWith({
            elt: target,
            props,
            queries: compiledQueries,
            units,
            percentUnits
          })
        })
      })

      it('should observe elements after adapting style', () => {
        processChildren(mutations, observer)

        elements.forEach(e => expect(observer.observe).toHaveBeenCalledWith(
          e,
          {
            childList: true,
            characterData: false,
            subtree: false
          }
        ))
      })
    })

    describe('when characters are watched', () => {
      const grandParent = document.createElement('section')
      const flattenEditableTree = []

      const editableParentDiv = flattenEditableTree[0] = document.createElement('div')
      editableParentDiv.classList.add('parent')
      grandParent.appendChild(editableParentDiv)

      const editableChildDiv = flattenEditableTree[1] = document.createElement('div')
      editableChildDiv.classList.add('child')
      editableParentDiv.appendChild(editableChildDiv)

      const editableGrandChildText = flattenEditableTree[2] = document.createTextNode('grand child')
      editableChildDiv.appendChild(editableGrandChildText)

      flattenEditableTree.forEach(e => {
        e.isContentEditable = true

        if (e.nodeType !== window.Node.TEXT_NODE) {
          e.setAttribute('contenteditable', e.isContentEditable)
        }
      })

      const watchedProperties = ['characters'];

      [
        editableParentDiv,
        editableChildDiv,
        editableGrandChildText
      ].forEach(element => {
        const mutations = [{ type: 'characterData', target: element }]
        const cachedProps = { width: 160, height: 90 }

        const processChildren = createChildrenListener({
          propsCache,
          compiledQueries,
          units,
          percentUnits,
          elements: [editableParentDiv],
          watchedProperties
        })

        beforeEach(() => propsCache.set(editableParentDiv, cachedProps))

        it(
          `should create listener that updates characters prop on characterData from a ${element.classList || element.textContent} ${element.tagName || 'TEXT_NODE'} node`,
          () => {
            processChildren(mutations, observer)

            expect(propsCache.get(editableParentDiv)).toEqual({
              ...cachedProps,
              characters: editableParentDiv.textContent.length
            })
          }
        )

        it('should create listener that applies style to elements according to characterData', () => {
          processChildren(mutations, observer)

          expect(adapt).toHaveBeenCalledWith({
            elt: editableParentDiv,

            props: {
              ...cachedProps,
              characters: editableParentDiv.textContent.length
            },

            queries: compiledQueries,
            units,
            percentUnits
          })
        })

        it('should observe elements after adapting style', () => {
          processChildren(mutations, observer)

          expect(observer.observe).toHaveBeenCalledWith(
            editableParentDiv,
            {
              childList: true,
              characterData: true,
              subtree: true
            }
          )
        })
      })

      it('should not observe non-editable elements after adapting style when children are not watched', () => {
        const processChildren = createChildrenListener({
          propsCache,
          compiledQueries,
          units,
          percentUnits,
          elements: [document.createElement('div')],
          watchedProperties
        })

        processChildren([], observer)

        expect(observer.observe).not.toHaveBeenCalled()
      })
    })
  })
})
