/* eslint-env jest */

import addAdaptiveBehaviour from '../src/index'
import { compileQueryList } from '../src/lib/query_processor'
import observe from '../src/lib/observer'
import { parseTarget, validateQueries, validateOptions } from '../src/lib/params_processor'

jest.mock('../src/lib/query_processor', () => ({
  compileQueryList: jest.fn().mockName('compileQueryList')
}))

jest.mock('../src/lib/observer', () => jest.fn().mockName('observe'))

jest.mock('../src/lib/params_processor', () => ({
  parseTarget: jest.fn().mockName('parseTarget'),
  validateQueries: jest.fn().mockName('validateQueries'),
  validateOptions: jest.fn().mockName('validateOptions')
}))

describe('index', () => {
  const compiled = {
    compiledQueries: 'compiled queries',
    units: ['em'],
    percentUnits: ['w%'],
    watchedProperties: ['width']
  }

  const elements = ['div']
  const removeAdaptiveBehaviour = () => {}

  compileQueryList.mockImplementation(() => compiled)
  parseTarget.mockImplementation(() => elements)
  observe.mockImplementation(() => removeAdaptiveBehaviour)

  afterEach(() => jest.clearAllMocks())

  it('should render elements adaptive', () => {
    const target = 'target'
    const queries = 'queries'
    const anyOptions = 'any options'

    const cleanUp = addAdaptiveBehaviour({ target, queries, anyOptions })

    expect(validateQueries).toHaveBeenCalledWith(queries)
    expect(validateOptions).toHaveBeenCalledWith({ anyOptions })
    expect(parseTarget).toHaveBeenCalledWith(target)
    expect(compileQueryList).toHaveBeenCalledWith(queries)

    expect(observe).toHaveBeenCalledWith({
      ...compiled,
      elements
    })

    expect(cleanUp).toBe(removeAdaptiveBehaviour)
  })

  it('should merge and dedup options.watchedProperties and compiled.watchedProperties', () => {
    const target = 'target'
    const queries = 'queries'
    const watchedProperties = ['width', 'height']
    const dedupedWatchedProperties = Array.from(new Set([...compiled.watchedProperties, ...watchedProperties]))

    addAdaptiveBehaviour({ target, queries, watchedProperties })

    expect(observe).toHaveBeenCalledWith(expect.objectContaining({ watchedProperties: dedupedWatchedProperties }))
  })

  it('should handle missing parameter', () => {
    expect(() => addAdaptiveBehaviour()).not.toThrow()
  })

  it('should set a default value for queries', () => {
    addAdaptiveBehaviour()
    expect(validateQueries).toHaveBeenCalledWith(expect.any(Object))
  })
})
