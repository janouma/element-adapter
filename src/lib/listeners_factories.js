import {
  computeOrientation,
  computeRatio
} from '../utils/dimensions'

import {
  countCharacters,
  findFirstEditableAncestor,
  observeMutations
} from '../utils/dom'

import {
  areAnyEltChildrenWatched,
  areContentEditableCharsWatched,
  areEltChildrenWatched,
  adapt
} from './adapters'

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

    window.requestAnimationFrame(() => adapt({
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

    adapt({
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
    const { parentNode } = target

    if (parentNode && ['childList', 'characterData'].includes(type)) {
      let elt
      let hasChildrenProp
      let hasCharactersProp

      if (target.nodeType !== window.Node.TEXT_NODE) {
        elt = areContentEditableCharsWatched(watchedProperties, target)
          ? findFirstEditableAncestor(target)
          : target
      } else {
        elt = findFirstEditableAncestor(parentNode)
      }

      const props = { ...propsCache.get(elt) }

      if (areAnyEltChildrenWatched(watchedProperties) && !elt.isContentEditable) {
        props.children = elt.childElementCount
        hasChildrenProp = true
      }

      if (areContentEditableCharsWatched(watchedProperties, elt)) {
        props.characters = countCharacters(elt)
        hasCharactersProp = true
      }

      if (hasChildrenProp || hasCharactersProp) {
        propsCache.set(elt, props)

        adapt({
          elt,
          props,
          queries: compiledQueries,
          units,
          percentUnits
        })
      }
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
