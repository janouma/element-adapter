/*
width
height
orientation
aspectRatio
characters
children

compiledQueries = {
  classA: [
    [
      {width: greaterThanOrEqual(length(6.25, 'em'))},
      {height: lesserThan(length(50, 'h%'))}
    ],

    [ {'aspect-ratio': lesserThanOrEqual(constant(16/9))} ],
    [ {width: greaterThanOrEqual(constant(680))} ]
  ],

  classB: [
    [ {orientation: equal(constant('landscape'))} ]
  ],

  classC: [
    [ {width: greaterThan(length(75, 'w%'))} ]
  ],

  classD: [
    [ {characters: greaterThan(constant(10))} ]
  ],

  classE: [
    [
      {children: greaterThanOrEqual(constant(2))},
      {children: lesserThan(constant(5))}
    ]
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

const runQuery = ({query, unitsMeasurements, props}) => 
  query.some(subQuery => subQuery.every((expression) => {
    const [[ prop, compare ]] = Object.entries(expression)
    return compare(unitsMeasurements, props[prop])
  }))

const adapt = ({ elt, props, queries, unitsMeasurements }) => {
  for (const [cls, query] of Object.entries(queries)) {
    elt.classList.toggle(
      cls,
      runQuery({query, unitsMeasurements, props})
    )

    for (const [prop, value] of Object.entries(props)) {
      elt.style.setProperty(
        `--ea-${prop}`,
        isDimension(prop) ? `${value}px` : value
      )
    }
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

const isInputElement = elt =>
  (elt.tagName === 'INPUT' && !['button', 'submit', 'image'].includes(elt.getAttribute('type')))
  || elt.tagName === 'TEXTAREA'

const isDimension = prop => ['width', 'height'].includes(prop)

const computeInitialProps = elt => {
  const { clientWidth, clientHeight } = elt
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = getComputedStyle(elt)
  const width = clientWidth - (parseInt(paddingLeft, 10) + parseInt(paddingRight, 10))
  const height = clientHeight - (parseInt(paddingTop, 10) + parseInt(paddingBottom, 10))

  return {
    width,
    height,
    orientation: width > height ? 'landscape' : 'portrait',
    'aspect-ratio': width / height,
    children: elt.childElementCount,

    characters: isInputElement(elt)
      ? elt.value.trim().length
      : 0
  }
}

const createDimensionListener = ({
  propsCache,
  compiledQueries,
  units,
  percentUnits
}) => entries => {
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
}

const createInputListener = ({
  propsCache,
  compiledQueries,
  units,
  percentUnits
}) => ({ target: elt }) => {
  const characters = elt.value.trim().length
  const cachedProps = propsCache.get(elt)

  if (characters !== cachedProps.characters) {
    const props = {
      ...cachedProps,
      characters: elt.value.trim().length
    }

    propsCache.set(elt, props)

    adapt({
      elt,
      props,
      queries: compiledQueries,

      unitsMeasurements: {
        ...measureNonPercentUnits(elt, units),
        ...measurePercentUnits(elt, percentUnits)
      }
    })
  }
}

const createChildrenListener = ({
  propsCache,
  compiledQueries,
  units,
  percentUnits,
  elements,
  observedMutations
}) => (mutations, observer) => {
  observer.disconnect()

  for (const { type, target: elt } of mutations) {
    if (type === 'childList') {
      const cachedProps = propsCache.get(elt)

      const props = {
        ...cachedProps,
        children: elt.childElementCount
      }

      propsCache.set(elt, props)

      adapt({
        elt,
        props,
        queries: compiledQueries,
  
        unitsMeasurements: {
          ...measureNonPercentUnits(elt, units),
          ...measurePercentUnits(elt, percentUnits)
        }
      })
    }
  }

  for (const elt of elements) {
    observer.observe(elt, observedMutations)
  }
}

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
  const observedMutations = { childList: true }

  const context = {
    propsCache,
    compiledQueries,
    units,
    percentUnits,
    elements,
    observedMutations
  }

  const dimensionsListener = createDimensionListener(context)
  const resizeObserver = new ResizeObserver(dimensionsListener)

  const inputListener = createInputListener(context)

  const chilrenListener = createChildrenListener(context)
  const mutationObserver = new MutationObserver(chilrenListener)

  for (const elt of elements) {
    const props = computeInitialProps(elt)
    propsCache.set(elt, props)

    // DEBUG
    console.debug('initial props:', {elt, props})
    // END DEBUG

    resizeObserver.observe(elt)

    if (isInputElement(elt)) {
      elt.addEventListener('input', inputListener)
    }

    mutationObserver.observe(elt, observedMutations)

    adapt({
      elt,
      props,
      queries: compiledQueries,

      unitsMeasurements: {
        ...measureNonPercentUnits(elt, units),
        ...measurePercentUnits(elt, percentUnits)
      }
    })
  }

  const removeAdaptiveBehaviour = () => {
    mutationObserver.disconnect()

    for (const e of elements) {
      resizeObserver.unobserve(e)

      if (isInputElement(e)) {
        e.removeEventListener('input', inputListener)
      }

      e.classList.remove(...Object.keys(compiledQueries))
    }
  }

  return removeAdaptiveBehaviour
}
