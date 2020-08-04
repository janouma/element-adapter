import {
  measureNonPercentUnits,
  measurePercentUnits,
  isDimension,
  computeOrientation,
  computeRatio
} from '../utils/dimensions'

import { runQuery } from './query_processor'

import {
  isInputElement,
  countCharacters,
  findFirstEditableAncestor,
  observeMutations
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

export const applyStyle = ({ elt, props, queries, units, percentUnits }) => {
  adapt({
    elt,
    props,
    queries,

    unitsMeasurements: {
      ...measureNonPercentUnits(elt, units),
      ...measurePercentUnits(elt, percentUnits)
    }
  })
}

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

export const createDimensionListener = ({
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

    window.requestAnimationFrame(() => applyStyle({
      elt,
      props,
      queries: compiledQueries,
      units,
      percentUnits
    }))
  }
}

export const createInputListener = ({
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

    applyStyle({
      elt,
      props,
      queries: compiledQueries,
      units,
      percentUnits
    })
  }
}

export const createChildrenListener = ({
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

      applyStyle({
        elt,
        props,
        queries: compiledQueries,
        units,
        percentUnits
      })
    }
  }

  for (const elt of elements) {
    if (areEltChildrenWatched(watchedProperties, elt)) {
      observeMutations(
        observer,
        elt,
        areContentEditableCharsWatched(watchedProperties, elt)
      )
    }
  }
}
