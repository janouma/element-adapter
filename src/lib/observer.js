import {
  measureNonPercentUnits,
  measurePercentUnits,
  isDimension,
  computeOrientation,
  computeRatio
} from '../utils/dimensions'

import { runQuery } from './query_processor'
import { WATCHABLE_PROPERTIES } from './constants'

import {
  isInputElement,
  countCharacters,
  isContentEditableElt,
  findFirstEditableAncestor
} from '../utils/dom'

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

const areAnyEltDimensionsWatched = watchedProperties => {
  const dimensionRelatedProps = ['width', 'height', 'orientation', 'aspect-ratio']
  return watchedProperties.some(prop => dimensionRelatedProps.includes(prop))
}

const areAnyEltCharactersWatched = watchedProperties => watchedProperties.includes('characters')

const areContentEditableCharsWatched = (watchedProperties, elt) => (
  areAnyEltCharactersWatched(watchedProperties) && elt.isContentEditable
)

const areAnyEltChildrenWatched = watchedProperties => watchedProperties.includes('children')

const computeInitialProps = (elt, watchedProperties) => {
  const props = {}

  if (areAnyEltDimensionsWatched(watchedProperties)) {
    const { clientWidth, clientHeight } = elt
    const { paddingTop, paddingRight, paddingBottom, paddingLeft } = window.getComputedStyle(elt)
    const width = clientWidth - (parseInt(paddingLeft, 10) + parseInt(paddingRight, 10))
    const height = clientHeight - (parseInt(paddingTop, 10) + parseInt(paddingBottom, 10))

    Object.assign(props, {
      width,
      height,
      orientation: computeOrientation(width, height),
      'aspect-ratio': computeRatio(width, height)
    })
  }

  if (
    areAnyEltCharactersWatched(watchedProperties) &&
    (
      elt.isContentEditable ||
      isInputElement(elt)
    )
  ) {
    props.characters = countCharacters(elt)
  }

  if (
    areAnyEltChildrenWatched(watchedProperties) &&
    !elt.isContentEditable &&
    !isInputElement(elt)
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
      orientation: computeOrientation(width, height),
      'aspect-ratio': computeRatio(width, height)
    }

    propsCache.set(elt, props)

    window.requestAnimationFrame(() => adapt({
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

      if (target.nodeType !== window.Node.TEXT_NODE) {
        elt = areContentEditableCharsWatched(watchedProperties, target)
          ? findFirstEditableAncestor(target)
          : target
      } else {
        elt = findFirstEditableAncestor(parentElement)
      }

      const props = { ...propsCache.get(elt) }

      if (
        areAnyEltChildrenWatched(watchedProperties) &&
        !elt.isContentEditable &&
        !isInputElement(elt)
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
    WATCHABLE_PROPERTIES.map(prop => e.style.removeProperty(`--ea-${prop}`))
  }
}

const observe = (params) => {
  const { ResizeObserver, MutationObserver } = window
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
    areAnyEltChildrenWatched(watchedProperties) ||
    (areAnyEltCharactersWatched(watchedProperties) && Array.from(elements).some(isContentEditableElt))
  ) &&
    createChildrenListener(context)

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

export default observe
