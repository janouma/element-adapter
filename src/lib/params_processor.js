import { WATCHABLE_PROPERTIES, CSS_UNITS_BUT_PX } from './constants'

export const parseTarget = target => {
  if (!target) {
    throw new Error('target must be provided')
  }

  const elements = 'length' in Object(target) ? Array.from(target) : [target]

  if (elements.length < 1) {
    throw new Error('at least one Element must be provided as target')
  }

  if (elements.some(item => !(item instanceof window.Element))) {
    throw new Error(`target must be an Element or a list of Elements. Actual:\n[${
      elements.map(i => String(i))
        .join(', ')
    }]`)
  }

  return elements
}

const INTEGER_COMPARISON_PATTERN = '(((>|<)=?)|==)\\s+\\d+'
const FLOAT_COMPARISON_PATTERN = `${INTEGER_COMPARISON_PATTERN}(\\.\\d+)?`

const DIMENSION_PROP_COMPARISON_PATTERN =
  `(width|height)\\s+${FLOAT_COMPARISON_PATTERN}(${CSS_UNITS_BUT_PX.join('|')}|px)`

const INTEGER_PROP_COMPARISON_PATTERN = `(characters|children)\\s+${INTEGER_COMPARISON_PATTERN}`
const ASPECT_RATIO_COMPARISON_PATTERN = `aspect-ratio\\s+${FLOAT_COMPARISON_PATTERN}`
const ORIENTATION_COMPARISON_PATTERN = 'orientation\\s+==\\s+(landscape|portrait|square)'

const COMPARISON_PATTERN =
  `(${DIMENSION_PROP_COMPARISON_PATTERN}|${INTEGER_PROP_COMPARISON_PATTERN}|${ASPECT_RATIO_COMPARISON_PATTERN}|${ORIENTATION_COMPARISON_PATTERN})`

const EXPRESSION_PATTERN = `${COMPARISON_PATTERN}(\\s+&&\\s+${COMPARISON_PATTERN})*`
const QUERY_VALIDATOR_PATTERN = new RegExp(`^\\s*${EXPRESSION_PATTERN}(\\s*,\\s*${EXPRESSION_PATTERN})*\\s*$`)

export const validateQueries = queries => {
  for (const query of Object.values(queries)) {
    if (!query || !query.match(QUERY_VALIDATOR_PATTERN)) {
      throw new Error(`invalid query "${query}"`)
    }
  }
}

export const validateOptions = ({ watchedProperties }) => {
  if (
    watchedProperties &&
    (
      !Array.isArray(watchedProperties) ||
      watchedProperties.length < 1 ||
      !watchedProperties.every(prop => WATCHABLE_PROPERTIES.includes(prop))
    )
  ) {
    throw new Error(`watchedProperties must be an array with at least one of ${WATCHABLE_PROPERTIES.join(', ')}`)
  }
}
