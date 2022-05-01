/* eslint-env jest */

import { runQuery } from '../../src/lib/query_processor'
import { measureNonPercentUnits, measurePercentUnits } from '../../src/utils/dimensions'
import { WATCHABLE_PROPERTIES } from '../../src/lib/constants'

jest.mock('../../src/lib/query_processor', () => ({
  runQuery: jest.fn().mockName('runQuery')
}))

jest.mock('../../src/utils/dimensions', () => ({
  ...jest.requireActual('../../src/utils/dimensions'),

  measureNonPercentUnits: jest.fn().mockName('measureNonPercentUnits'),
  measurePercentUnits: jest.fn().mockName('measurePercentUnits')
}))

const units = ['em']
const nonPercentUnitsMesurements = { em: 16 }

const percentUnits = ['w%']
const percentUnitsMesurements = { 'w%': 13.346 }

measureNonPercentUnits.mockImplementation(() => nonPercentUnitsMesurements)
measurePercentUnits.mockImplementation(() => percentUnitsMesurements)

const unitsMeasurements = {
  ...nonPercentUnitsMesurements,
  ...percentUnitsMesurements
}

const notifySquareOrientation = jest.fn().mockName('notifySquareOrientation')
const notifyPortraitOrientation = jest.fn().mockName('notifyPortraitOrientation')
const orientationEqualPortrait = jest.fn(() => true).mockName('notifyPortraitOrientation')

const queries = new Map([
  ['classA', function widthGreaterThanConstant100 () { return true }],
  ['classB', function charactersLesserThanConstant10 () { return true }],
  ['classC', function childrenGreaterThanConstant3 () { return false }],
  [notifySquareOrientation, function orientationEqualSquare () { return true }],
  [notifyPortraitOrientation, orientationEqualPortrait]
])

runQuery.mockImplementation(({ query }) => query())

const div = document.createElement('div')

jest.spyOn(div, 'clientWidth', 'get').mockImplementation(() => 160)
jest.spyOn(div, 'clientHeight', 'get').mockImplementation(() => 90)
jest.spyOn(div.style, 'setProperty')

Object.assign(div.style, {
  paddingTop: '5px',
  paddingRight: '4px',
  paddingBottom: '10px',
  paddingLeft: '6px'
})

div.appendChild(document.createElement('span'))

const textarea = document.createElement('textarea')
textarea.value = 'textarea'

const editableSpan = document.createElement('span')
editableSpan.isContentEditable = true
editableSpan.setAttribute('contenteditable', editableSpan.isContentEditable)
editableSpan.textContent = 'editable content'

const elements = [div, textarea, editableSpan]

let computeInitialProps
let adapt
let clearFunctionBehaviourApplyCache

describe('lib/adapters', () => {
  beforeEach(() => jest.isolateModules(() => ({
    computeInitialProps,
    adapt,
    clearFunctionBehaviourApplyCache
  } = require('../../src/lib/adapters'))))

  afterEach(() => {
    jest.clearAllMocks()

    const behaviourCssClasses = [...queries.keys()].filter(behaviour => typeof behaviour === 'string')

    elements.forEach(e => {
      e.classList.remove(...behaviourCssClasses)
      WATCHABLE_PROPERTIES.forEach(prop => e.style.removeProperty(`--ea-${prop}`))
    })
  })

  describe('#adapt', () => {
    it('should apply behaviours according to queries results', () => {
      const props = {
        width: 160,
        characters: 8,
        children: 1
      }

      adapt({ elt: div, props, queries, units, percentUnits })

      orientationEqualPortrait.mockReturnValueOnce(false)

      adapt({ elt: div, props, queries, units, percentUnits })

      const compiledQueries = [...queries.values()]

      expect(runQuery).toHaveBeenCalledTimes(compiledQueries.length * 2)

      compiledQueries.forEach(query => expect(runQuery).toHaveBeenCalledWith({
        query,
        unitsMeasurements,
        props
      }))

      expect(Array.from(div.classList)).toEqual(['classA', 'classB'])
      expect(notifySquareOrientation).toHaveBeenCalledTimes(1)
      expect(notifySquareOrientation).toHaveBeenCalledWith(div, props)
      expect(notifyPortraitOrientation).toHaveBeenCalledTimes(1)
    })

    it('should set props css vars', () => {
      const props = {
        width: 160,
        height: 90,
        characters: 8,
        children: 1
      }

      const cssVars = {
        '--ea-width': `${props.width}px`,
        '--ea-height': `${props.height}px`,
        '--ea-characters': String(props.characters),
        '--ea-children': String(props.children)
      }

      adapt({ elt: div, props, queries, units, percentUnits })

      Object.entries(cssVars).forEach(
        ([name, value]) => expect(div.style.getPropertyValue(name)).toBe(value)
      )
    })

    it('should use default values for "characters" and "children" if missing while running queries', () => {
      const props = { width: 160 }
      const defaults = { characters: 0, children: 0 }

      adapt({ elt: div, props, queries, units, percentUnits });

      [...queries.values()].forEach(query => expect(runQuery).toHaveBeenCalledWith({
        query,
        unitsMeasurements,
        props: { ...props, ...defaults }
      }))

      Object.entries(defaults).forEach(
        ([prop, value]) => expect(div.style.setProperty)
          .not.toHaveBeenCalledWith(`--ea-${prop}`, value)
      )
    })
  })

  describe('#clearFunctionBehaviourApplyCache', () => {
    it('should actually clear cache', () => {
      const props = {
        width: 160,
        characters: 8,
        children: 1
      }

      const span = document.createElement('span')

      adapt({ elt: div, props, queries, units, percentUnits })
      adapt({ elt: span, props, queries, units, percentUnits })

      clearFunctionBehaviourApplyCache([div])

      adapt({ elt: div, props, queries, units, percentUnits })
      adapt({ elt: span, props, queries, units, percentUnits })

      expect(notifySquareOrientation).toHaveBeenCalledTimes(3)
    })
  })

  describe('#computeInitialProps', () => {
    it.each([
      'width',
      'height',
      'orientation',
      'aspect-ratio'
    ])('should compute dimensions if "%s" is watched', watchedProperty => {
      const props = computeInitialProps(div, [watchedProperty])
      const width = 150
      const height = 75

      expect(props).toEqual({
        width,
        height,
        orientation: 'landscape',
        'aspect-ratio': width / height
      })
    })

    it('should count children if children are watched', () => {
      const props = computeInitialProps(div, ['children'])
      expect(props).toEqual({ children: 1 })
    })

    it('should NOT count children of input elemnent', () => {
      const props = computeInitialProps(textarea, ['children'])
      expect(Object.keys(props)).toHaveLength(0)
    })

    it('should NOT count children of editable content', () => {
      const props = computeInitialProps(editableSpan, ['children'])
      expect(Object.keys(props)).toHaveLength(0)
    })

    it('should count characters of input element if characters are watched', () => {
      const props = computeInitialProps(textarea, ['characters'])
      expect(props).toEqual({ characters: textarea.value.length })
    })

    it('should count characters of editabled element', () => {
      const props = computeInitialProps(editableSpan, ['characters'])
      expect(props).toEqual({ characters: editableSpan.textContent.length })
    })

    it('should NOT count characters of anything other than input and editable elements', () => {
      const props = computeInitialProps(div, ['characters'])
      expect(Object.keys(props)).toHaveLength(0)
    })
  })
})
