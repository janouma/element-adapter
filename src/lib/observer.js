import { WATCHABLE_PROPERTIES } from './constants'

import {
  isInputElement,
  isContentEditableElt,
  observeMutations
} from '../utils/dom'

import {
  applyStyle,
  areAnyEltDimensionsWatched,
  areAnyEltCharactersWatched,
  areAnyEltChildrenWatched,
  areContentEditableCharsWatched,
  computeInitialProps,
  createDimensionListener,
  createInputListener,
  createChildrenListener
} from './adapters'

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

  const inputListener = areAnyEltCharactersWatched(watchedProperties) &&
    elements.some(isInputElement) &&
    createInputListener(context)

  const chilrenListener = (
    areAnyEltChildrenWatched(watchedProperties) ||
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

    mutationObserver && observeMutations(
      mutationObserver,
      elt,
      areContentEditableCharsWatched(watchedProperties, elt)
    )

    applyStyle({
      elt,
      props,
      queries: compiledQueries,
      units,
      percentUnits
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
