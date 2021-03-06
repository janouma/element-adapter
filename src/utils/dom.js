const nonInputTypes = [
  'button',
  'submit',
  'image',
  'checkbox',
  'radio',
  'hidden',
  'range',
  'reset'
]

export const isInputElement = elt =>
  (elt.tagName === 'INPUT' && !nonInputTypes.includes(elt.getAttribute('type'))) ||
  elt.tagName === 'TEXTAREA'

export const countCharacters = elt => {
  if (isInputElement(elt)) {
    return elt.value.trim().length
  }

  if (elt.isContentEditable) {
    return elt.textContent.trim().length
  }

  return 0
}

export const isContentEditableElt = elt => elt.isContentEditable

export const findCurrentTarget = (elements, target) => {
  const currentTarget = elements.find(e => e === target)

  if (currentTarget) {
    return currentTarget
  }

  if (target.parentNode) {
    return findCurrentTarget(elements, target.parentNode)
  }
}

export const observeMutations = (
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
