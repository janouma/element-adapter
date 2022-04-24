import { dedup } from './utils/array'
import { compileQueryList } from './lib/query_processor'
import observe from './lib/observer'
import { parseTarget, validateQueries, validateOptions } from './lib/params_processor'

export default function addAdaptiveBehaviour ({ target, queries = {}, ...options } = {}) {
  validateQueries(queries)
  validateOptions(options)

  const elements = parseTarget(target)

  const {
    compiledQueries,
    units,
    percentUnits,
    watchedProperties
  } = compileQueryList(queries)

  if (watchedProperties.length < 1 && !options.watchedProperties) {
    throw new Error('at least one query or one watched properties must be provided')
  }

  const {
    unobserve: removeAdaptiveBehaviour,
    applyAdaptiveBehaviour
  } = observe({
    elements,
    compiledQueries,
    units,
    percentUnits,

    watchedProperties: dedup([
      ...watchedProperties,
      ...(options.watchedProperties || [])
    ])
  })

  return {
    removeAdaptiveBehaviour,
    applyAdaptiveBehaviour
  }
}
