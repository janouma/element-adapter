/*
width
height
orientation
aspectRatio
characters
characters for editable divs
children


// DOC DRAFT
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
  ],

  classF: [
    [ {characters: equal(constant(0))} ]
  ]
}
*/

const watchableProperties = [
  'width',
  'height',
  'aspect-ratio',
  'orientation',
  'children',
  'characters'
]

const length = (x, unit) => unitsMeasurements => x * unitsMeasurements[unit]

const constant = x => unitsMeasurements => x

const isSameType = (a, b) => {
  const aType = typeof a
  const bType = typeof b

  if (aType === bType) {
    return true
  }

  throw new Error(`type mismatch: a(${a}) is ${aType} and b(${b}) is ${bType}`)
}

const dedup = array => array.length > 0
  ? Array.from(new Set(array))
  : array

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
  const watchedProperties = []

  for (const booleanExpr of booleanExpressions) {
    const comparisonExpressions = booleanExpr.split(/\s*&&\s*/)
    const compiledBooleanExpressions = []

    for (const comparisonExpr of comparisonExpressions) {
      const [property, comparator, srcValue] = comparisonExpr.split(/\s+/)
      const [/* whole match */, numberLiteral, /* fraction */, srcUnit] = srcValue.match(LENGTH_PATTERN) || []
      const unit = srcUnit === '%' ? percentUnitsByDimension[property] : srcUnit
      const number = unit && parseFloat(numberLiteral)
      let valueCalculator

      watchedProperties.push(property)

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
    percentUnits,
    watchedProperties
  }
}

const compileQueryList = queries => {
  const compiledQueries = {}
  const units = []
  const percentUnits = []
  const watchedProperties = []

  for (const [cssClass, query] of Object.entries(queries)) {
    const compilationOut = compileQuery(query)

    compiledQueries[cssClass] = compilationOut.query
    units.push(...compilationOut.units)
    percentUnits.push(...compilationOut.percentUnits)
    watchedProperties.push(...compilationOut.watchedProperties)
  }

  return {
    compiledQueries,
    units,
    percentUnits,
    watchedProperties
  }
}

const runQuery = ({query, unitsMeasurements, props}) => 
  query.some(subQuery => subQuery.every((expression) => {
    const [[ prop, compare ]] = Object.entries(expression)
    return compare(unitsMeasurements, props[prop])
  }))

const adapt = ({ elt, props, queries, unitsMeasurements }) => {
  const queryProps = {
    ...props,
    characters: props.characters || 0,
    children: props.children || 0
  }

  for (const [cls, query] of Object.entries(queries)) {
    elt.classList.toggle(
      cls,

      runQuery({
        query,
        unitsMeasurements,
        props: queryProps
      })
    )
  }

  for (const [prop, value] of Object.entries(props)) {
    elt.style.setProperty(
      `--ea-${prop}`,
      isDimension(prop) ? `${value}px` : value
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

const isInputElement = elt =>
  (elt.tagName === 'INPUT' && !['button', 'submit', 'image'].includes(elt.getAttribute('type')))
  || elt.tagName === 'TEXTAREA'

const countCharacters = elt => {
  if (isInputElement(elt)) {
    return elt.value.trim().length
  }

  if (elt.isContentEditable) {
    return elt.textContent.trim().length
  }

  return 0
}

const isContentEditableElt = elt => elt.isContentEditable

const findFirstEditableAncestor = elt => {
  return !elt.parentElement.isContentEditable
    ? elt
    : findFirstEditableAncestor(elt.parentElement)
}

const isDimension = prop => ['width', 'height'].includes(prop)

const areAnyEltDimensionsWatched = watchedProperties => {
  const dimensionProps = ['width', 'height', 'orientation', 'aspect-ratio']
  return watchedProperties.some(prop => dimensionProps.includes(prop))
}

const areAnyEltCharactersWatched = watchedProperties => watchedProperties.includes('characters')

const areContentEditableCharsWatched = (watchedProperties, elt) => (
  areAnyEltCharactersWatched(watchedProperties) && elt.isContentEditable
)

const areAnyEltChildrenWatched = watchedProperties => watchedProperties.includes('children')

const areEltChildrenWatched = (watchedProperties, elt) => (
  areAnyEltChildrenWatched(watchedProperties)
  || (
    watchedProperties.includes('characters')
    && elt.isContentEditable
  )
)

const computeInitialProps = (elt, watchedProperties) => {
  const props = {}

  if (areAnyEltDimensionsWatched(watchedProperties)) {
    const { clientWidth, clientHeight } = elt
    const { paddingTop, paddingRight, paddingBottom, paddingLeft } = getComputedStyle(elt)
    const width = clientWidth - (parseInt(paddingLeft, 10) + parseInt(paddingRight, 10))
    const height = clientHeight - (parseInt(paddingTop, 10) + parseInt(paddingBottom, 10))

    Object.assign(props, {
      width,
      height,
      orientation: width > height ? 'landscape' : 'portrait',
      'aspect-ratio': width / height
    })
  }

  if (
    areAnyEltCharactersWatched(watchedProperties)
    && (
      elt.isContentEditable
      || isInputElement(elt)
    )
  ) {
    props.characters = countCharacters(elt)
  }
  
  if (
    areAnyEltChildrenWatched(watchedProperties)
    && !elt.isContentEditable
    && !isInputElement(elt)
  ) {
    props.children = elt.childElementCount
  }

  return props
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
      orientation: width > height ? 'landscape' : width < height ? 'portrait' : 'square',
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
      characters: countCharacters(elt)
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
  watchedProperties
}) => (mutations, observer) => {
  observer.disconnect()

  for (const { type, target } of mutations) {
    const { parentElement } = target

    if (parentElement && ['childList', 'characterData'].includes(type)) {
      let elt

      if (target.nodeType !== Node.TEXT_NODE) {
        elt = areContentEditableCharsWatched(watchedProperties, target)
          ? findFirstEditableAncestor(target)
          : target
      } else {
        elt = findFirstEditableAncestor(parentElement)
      }
      
      const props = { ...propsCache.get(elt) }

      if (
        areAnyEltChildrenWatched(watchedProperties)
        && !elt.isContentEditable
        && !isInputElement(elt)
      ) {
        props.children = elt.childElementCount
      }

      if (areContentEditableCharsWatched(watchedProperties, elt)) {
        props.characters = countCharacters(elt)
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
    observeMutations(
      observer,
      elt,
      areContentEditableCharsWatched(watchedProperties, elt)
    )
  }
}

const observe = (params) => {
  const propsCache = new WeakMap()
  const context = { ...params, propsCache }

  const {
    elements,
    compiledQueries,
    units,
    percentUnits,
    watchedProperties
  } = params

  const dimensionsListener = areAnyEltDimensionsWatched(watchedProperties) && createDimensionListener(context)
  const resizeObserver = dimensionsListener && new ResizeObserver(dimensionsListener)

  const inputListener = areAnyEltCharactersWatched(watchedProperties) && createInputListener(context)

  const chilrenListener = (
      areAnyEltChildrenWatched(watchedProperties)
      || (areAnyEltCharactersWatched(watchedProperties) && Array.from(elements).some(isContentEditableElt))
    )
    && createChildrenListener(context)

  const mutationObserver = chilrenListener && new MutationObserver(chilrenListener)

  for (const elt of elements) {
    const props = computeInitialProps(elt, watchedProperties)
    propsCache.set(elt, props)

    resizeObserver && resizeObserver.observe(elt)

    if (inputListener && isInputElement(elt)) {
      elt.addEventListener('input', inputListener)
    }

    mutationObserver && observeMutations(
      mutationObserver,
      elt,
      areContentEditableCharsWatched(watchedProperties, elt)
    )

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

  return () => unobserve({
    elements,
    mutationObserver,
    resizeObserver,
    inputListener,
    behaviourCssClasses: Object.keys(compiledQueries)
  })
}

const observeMutations = (
  observer,
  elt,
  includeCharacters = false
) => {
  observer.observe(
    elt,
    {
      childList: true,
      characterData: includeCharacters,
      subtree: includeCharacters
    }
  )
}

const unobserve = ({
  elements,
  mutationObserver,
  resizeObserver,
  inputListener,
  behaviourCssClasses
}) => {
  mutationObserver && mutationObserver.disconnect()

  for (const e of elements) {
    resizeObserver && resizeObserver.unobserve(e)

    if (inputListener && isInputElement(e)) {
      e.removeEventListener('input', inputListener)
    }

    e.classList.remove(...behaviourCssClasses)
    watchableProperties.map(prop => e.style.removeProperty(`--ea-${prop}`))
  }
}

export function addAdaptiveBehaviour ({ target, queries = {}, ...options } = {}) {
  if (!target) {
    throw new Error('target must be provided')
  }

  const elements = 'length' in Object(target) ? Array.from(target) : [target]

  if (elements.length < 1) {
    throw new Error('at least one Element must be provided as target')
  }

  if (elements.some(item => !(item instanceof Element))) {
    throw new Error(`target must be an Element or a list of Elements. Actual:\n[${
      elements.map(i => String(i))
        .join(', ')
    }]`)
  }

  if (
    options.watchedProperties
    && (
      !Array.isArray(options.watchedProperties)
      || options.watchedProperties.length < 1
      || !options.watchedProperties.every(prop => watchableProperties.includes(prop))
    )
  ) {
    throw new Error(`watchedProperties must be an array with at least one of ${watchableProperties.join(', ')}`)
  }

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
