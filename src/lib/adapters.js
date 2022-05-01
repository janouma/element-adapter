import {
  measureNonPercentUnits,
  measurePercentUnits,
  isDimension,
  computeOrientation,
  computeRatio
} from '../utils/dimensions'

import {
  isInputElement,
  countCharacters
} from '../utils/dom'

import { runQuery } from './query_processor'

export const areAnyEltDimensionsWatched = watchedProperties => {
  const dimensionRelatedProps = ['width', 'height', 'orientation', 'aspect-ratio']
  return watchedProperties.some(prop => dimensionRelatedProps.includes(prop))
}

export const areAnyEltCharactersWatched = watchedProperties => watchedProperties.includes('characters')

export const areContentEditableCharsWatched = (watchedProperties, elt) => (
  areAnyEltCharactersWatched(watchedProperties) && elt.isContentEditable
)

export const areAnyEltChildrenWatched = watchedProperties => watchedProperties.includes('children')

export const areEltChildrenWatched = (watchedProperties, elt) =>
  !isInputElement(elt) &&
  (areContentEditableCharsWatched(watchedProperties, elt) || areAnyEltChildrenWatched(watchedProperties))

export const computeInitialProps = (elt, watchedProperties) => {
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

const functionBehaviourApplyCache = new WeakMap()

const applyAdaptiveBehaviour = ({ elt, props, queries, unitsMeasurements }) => {
  const queryProps = {
    ...props,
    characters: props.characters || 0,
    children: props.children || 0
  }

  for (const [behaviour, query] of queries.entries()) {
    const isQueryMatched = runQuery({
      query,
      unitsMeasurements,
      props: queryProps
    })

    if (typeof behaviour === 'string') {
      elt.classList.toggle(behaviour, isQueryMatched)
    } else {
      const previousMatch = Boolean(functionBehaviourApplyCache.get(elt)?.get(query))

      if (isQueryMatched !== previousMatch) {
        if (isQueryMatched) {
          behaviour(elt, queryProps)
        }

        if (!functionBehaviourApplyCache.get(elt)) {
          functionBehaviourApplyCache.set(elt, new WeakMap())
        }

        functionBehaviourApplyCache.get(elt).set(query, isQueryMatched)
      }
    }
  }

  for (const [prop, value] of Object.entries(props)) {
    elt.style.setProperty(
      `--ea-${prop}`,
      isDimension(prop) ? `${value}px` : value
    )
  }
}

export const adapt = ({ elt, props, queries, units, percentUnits }) => {
  applyAdaptiveBehaviour({
    elt,
    props,
    queries,

    unitsMeasurements: {
      ...measureNonPercentUnits(elt, units),
      ...measurePercentUnits(elt, percentUnits)
    }
  })
}

export function clearFunctionBehaviourApplyCache (elements) {
  for (const elt of elements) {
    functionBehaviourApplyCache.delete(elt)
  }
}
