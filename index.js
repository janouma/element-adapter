/*
width
height
characters
children
scrollX
scrollY
orientation
aspectRatio

compiledQueries = {
  clsa: [
    [ {width: greaterThanOrEqual(length(6.25, 'em'))}, {height: lesserThan(length(50, 'h%'))} ],
    [ {'aspect-ratio': lesserThanOrEqual(constant(16/9))} ],
    [ {width: greaterThanOrEqual(constant(680))} ]
  ],

  clsb: [
    [ {orientation: equal(constant('landscape'))} ]
  ],

  clsc: [
    [ {width: greaterThan(length(75, 'w%'))} ]
  ]
}
*/

const length = (x, unit) => unitsMeasurements => x * unitsMeasurements[unit]

const constant = x => unitsMeasurements => x

const isSameType = (a, b) => {
  const aType = typeof a
  const bType = typeof b

  if (aType === bType) {
    return true
  }

  throw new Error(`type mismatch: a is ${aType} and b is ${bType}`)
}

const greaterThan = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a > b
}

const greaterThanOrEqual = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a >= b
}

const lesserThan = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a < b
}

const lesserThanOrEqual = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a <= b
}

const equal = fnb => (unitsMeasurements, a) => a === fnb(unitsMeasurements)

const comparators = {
  '>': greaterThan,
  '>=': greaterThanOrEqual,
  '<': lesserThan,
  '<=': lesserThanOrEqual,
  '==': equal
}

const LENGTH_PATTERN = /^(\d+(\.\d+)?)(%|cap|ch|em|ex|ic|lh|rem|rlh|vb|vh|vi|vw|vmin|vmax|mm|Q|cm|in|pt|pc)$/
const ABS_NUMBER_PATTERN = /^\d+(\.\d+)?(px)?$/

const percentUnitsByDimension = {
  width: 'w%',
  height: 'h%'
}

const dimensionsByPercentUnit = Object.entries(percentUnitsByDimension)
  .reduce((results, [dim, unit]) => ({
    ...results,
    [unit]: dim
  }), {})

const compileQuery = query => {
  const booleanExpressions = query
    .trim()
    .toLowerCase()
    .split(/\s*,\s*/)

  const compiledQuery = []
  const units = []
  const percentUnits = []

  for (const booleanExpr of booleanExpressions) {
    const comparisonExpressions = booleanExpr.split(/\s*&&\s*/)
    const compiledBooleanExpressions = []

    for (const comparisonExpr of comparisonExpressions) {
      const [property, comparator, srcValue] = comparisonExpr.split(/\s+/)
      const [/* whole match */, numberLiteral, /* fraction */, srcUnit] = srcValue.match(LENGTH_PATTERN) || []
      const unit = srcUnit === '%' ? percentUnitsByDimension[property] : srcUnit
      const number = unit && parseFloat(numberLiteral)
      let valueCalculator

      if (unit) {
        const unitClassification = srcUnit === '%' ? percentUnits : units
        unitClassification.push(unit)
        valueCalculator = length(number, unit)
      } else {
        const parsedValue = srcValue.match(ABS_NUMBER_PATTERN) ? parseFloat(srcValue) : srcValue
        valueCalculator = constant(parsedValue)
      }

      compiledBooleanExpressions.push({ [property]: comparators[comparator](valueCalculator) })
    }

    compiledQuery.push(compiledBooleanExpressions)
  }

  return {
    query: compiledQuery,
    units,
    percentUnits
  }
}

const compileQueryList = queries => {
  const compiledQueries = {}
  const units = []
  const percentUnits = []

  for (const [cssClass, query] of Object.entries(queries)) {
    const compilationOut = compileQuery(query)

    compiledQueries[cssClass] = compilationOut.query
    units.push(...compilationOut.units)
    percentUnits.push(...compilationOut.percentUnits)
  }

  return { compiledQueries, units, percentUnits }
}

const adapt = ({ elt, props, queries, unitsMeasurements }) => {
  for (const [cls, query] of Object.entries(queries)) {
    elt.classList.toggle(
      cls,
      query.some(subQuery => subQuery.every((expression) => {
        const [[ prop, compare ]] = Object.entries(expression)
        return compare(unitsMeasurements, props[prop])
      }))
    )
  }
}

const mesureUnits = (elt, units, measure) => {
  if (units.length === 0) { return }

  const sample = document.createElement('b')
  sample.style.position = 'absolute'
  
  elt.appendChild(sample)

  const mesurments = units.reduce((mes, unit) => ({
    ...mes,
    [unit]: measure(sample, unit)
  }), {})

  elt.removeChild(sample)

  return mesurments
}

const measureNonPercentUnits = (elt, units) => mesureUnits(
  elt,
  units,

  (sample, unit) => {
    sample.style.width = `1${unit}`
    return sample.getBoundingClientRect().width
  }
)

const measurePercentUnits = (elt, units) => mesureUnits(
  elt.parentNode,
  units,

  (sample, unit) => {
    const dimension = dimensionsByPercentUnit[unit]

    sample.style[dimension] = '1%'

    const { [dimension]: mesurement } = sample.getBoundingClientRect()
    return mesurement
  }
)

export function addAdaptiveBehaviour ({ target, queries = {} } = {}) {
  const validationErrorMsg = 'at least one node must be provided as target'

  if ('length' in target) {
    if (target.length < 1) {
      throw new Error(validationErrorMsg)
    }
  } else if (!target) {
    throw new Error(validationErrorMsg)
  }

  const elements = target.length > 0 ? target : [target]
  const { compiledQueries, units, percentUnits } = compileQueryList(queries)
  const propsCache = new WeakMap()

  const resizeObserver = new ResizeObserver(entries => {
    for (const { contentRect: { width, height }, target: elt } of entries) {
      const cachedProps = propsCache.get(elt)

      const props = {
        ...cachedProps,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        'aspect-ratio': width / height
      }

      propsCache.set(elt, props)

      // DEBUG
      // console.debug({elt, props})
      // END DEBUG

      requestAnimationFrame(() => adapt({
        elt,
        props,
        queries: compiledQueries,

        unitsMeasurements: {
          ...measureNonPercentUnits(elt, units),
          ...measurePercentUnits(elt, percentUnits)
        }
      }))
    }
  })

  for (const elt of elements) {
    resizeObserver.observe(elt)
  }

  const removeAdaptiveBehaviour = () => {
    for (const e of elements) {
      resizeObserver.unobserve(e)
      e.classList.remove(...Object.keys(compiledQueries))
    }
  }

  return removeAdaptiveBehaviour
}
