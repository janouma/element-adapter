import { WATCHABLE_PROPERTIES } from './constants'

import {
  isInputElement,
  isContentEditableElt,
  observeMutations
} from '../utils/dom'

import {
  createDimensionListener,
  createInputListener,
  createChildrenListener
} from './listeners_factories'

import {
  areAnyEltDimensionsWatched,
  areAnyEltCharactersWatched,
  areAnyEltChildrenWatched,
  areContentEditableCharsWatched,
  areEltChildrenWatched,
  computeInitialProps,
  adapt
} from './adapters'

const INVALID = {}

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
    WATCHABLE_PROPERTIES.forEach(prop => e.style.removeProperty(`--ea-${prop}`))
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

  const inputListener = areAnyEltCharactersWatched(watchedProperties) &&
    elements.some(isInputElement) &&
    createInputListener(context)

  const chilrenListener = (
    (areAnyEltChildrenWatched(watchedProperties) && !elements.every(isInputElement)) ||
    (areAnyEltCharactersWatched(watchedProperties) && elements.some(isContentEditableElt))
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

    if (mutationObserver && areEltChildrenWatched(watchedProperties, elt)) {
      mutationObserver && observeMutations(
        mutationObserver,
        elt,
        areContentEditableCharsWatched(watchedProperties, elt)
      )
    }

    adapt({
      elt,
      props,
      queries: compiledQueries,
      units,
      percentUnits
    })
  }

  return {
    unobserve: () => {
      propsCache.set(INVALID, true)

      unobserve({
        elements,
        mutationObserver,
        resizeObserver,
        inputListener,
        behaviourCssClasses: Object.keys(compiledQueries)
      })
    },

    applyStyle: () => {
      if (!propsCache.get(INVALID)) {
        elements.forEach(elt => adapt({
          elt,
          props: propsCache.get(elt),
          queries: compiledQueries,
          units,
          percentUnits
        }))
      }
    }
  }
}

export default observe
