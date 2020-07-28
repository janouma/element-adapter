/*
width
height
characters
children
scrollX
scrollY
orientation
aspectRatio

predicates = {
  clsa: [
    [ {width: greaterThanOrEqual(constant(100))}, {height: lesserThan(percentOfHeight(50))} ],
    [ {'aspect-ratio': lesserThanOrEqual(constant(16/9))} ],
    [ {width: greaterThanOrEqual(constant(680))} ]
  ],

  clsb: [
    [ {orientation: equal(constant('landscape'))} ]
  ],

  clsc: [
    [ {width: greaterThan(percentOfWidth(75))} ]
  ]
}
*/

const constant = x => parent => x

const percentOfWidth = x => parent => {
  const { width } = parent.getBoundingClientRect()
  const { paddingLeft, paddingRight } = getComputedStyle(parent)
  const contentWidth = width - (parseInt(paddingLeft, 10) + parseInt(paddingRight, 10))

  return (x / 100) * contentWidth
}

const percentOfHeight = x => parent => {
  const { height } = parent.getBoundingClientRect()
  const { paddingTop, paddingBottom } = getComputedStyle(parent)
  const contentHeight = height - (parseInt(paddingTop, 10) + parseInt(paddingBottom, 10))

  return (x / 100) * contentHeight
}

const percentCalculators = {
  width: percentOfWidth,
  height: percentOfHeight
}

const isSameType = (a, b) => {
  const aType = typeof a
  const bType = typeof b

  if (aType === bType) {
    return true
  }

  throw new Error(`type mismatch: a is ${aType} and b is ${bType}`)
}

const greaterThan = fnb => (parent, a) => {
  const b = fnb(parent)
  return isSameType(a, b) && a > b
}

const greaterThanOrEqual = fnb => (parent, a) => {
  const b = fnb(parent)
  return isSameType(a, b) && a >= b
}

const lesserThan = fnb => (parent, a) => {
  const b = fnb(parent)
  return isSameType(a, b) && a < b
}

const lesserThanOrEqual = fnb => (parent, a) => {
  const b = fnb(parent)
  return isSameType(a, b) && a <= b
}

const equal = fnb => (parent, a) => a === fnb(parent)

const compileQuery = query => query.trim()
  .toLowerCase()
  .split(/\s*,\s*/)
  .map(
    booleanExpr => booleanExpr.split(/\s*&&\s*/)
      .map(comparisonExpr => {
        const [property, comparator, srcValue] = comparisonExpr.split(/\s+/)

        const valueCalculator = srcValue.match(PERCENT_PATTERN)
          ? percentCalculators[property](parseFloat(srcValue))
          : constant( srcValue.match(ABS_NUMBER_PATTERN) ? parseFloat(srcValue) : srcValue )

        return { [property]: comparators[comparator](valueCalculator)}
      })
  )

const adapt = (elt, props, queries) => {
  for (const [cls, query] of Object.entries(queries)) {
    elt.classList.toggle(
      cls,
      query.some(subQuery => subQuery.every((expression) => {
        const [[ prop, compare ]] = Object.entries(expression)
        return compare(elt.parentNode, props[prop])
      }))
    )
  }
}

const comparators = {
  '>': greaterThan,
  '>=': greaterThanOrEqual,
  '<': lesserThan,
  '<=': lesserThanOrEqual,
  '==': equal
}

const PERCENT_PATTERN = /^\d+(\.\d+)?%$/
const ABS_NUMBER_PATTERN = /^\d+(\.\d+)?(px)?$/

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

  const compiledQueries = Object.entries(queries)
    .reduce((results, [cls, query]) => ({
      ...results,
      [cls]: compileQuery(query)
    }), {})

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
      console.debug({elt, props})
      // END DEBUG

      requestAnimationFrame(() => adapt(elt, props, compiledQueries))
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
