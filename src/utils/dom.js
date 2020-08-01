export const isInputElement = elt =>
  (elt.tagName === 'INPUT' && !['button', 'submit', 'image'].includes(elt.getAttribute('type'))) ||
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

export const findFirstEditableAncestor = elt => {
  return !elt.parentElement.isContentEditable
    ? elt
    : findFirstEditableAncestor(elt.parentElement)
}
