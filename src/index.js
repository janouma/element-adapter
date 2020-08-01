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

  const removeAdaptiveBehaviour = observe({
    elements,
    compiledQueries,
    units,
    percentUnits,

    watchedProperties: dedup([
      ...watchedProperties,
      ...(options.watchedProperties || [])
    ])
  })

  return removeAdaptiveBehaviour
}
