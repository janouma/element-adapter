import addAdaptiveBehaviour from '../../dist/element-adapter.esm.js'

const { HTMLElement, customElements } = window
const template = document.createElement('template')

template.innerHTML = `
<link rel="stylesheet" href="expanding_input/style.css" />
<input type="text" value="Type">
`

class ExpandingInput extends HTMLElement {
  constructor () {
    super()

    this.shadow = this.attachShadow({ mode: 'closed' })
    this.shadow.appendChild(template.content.cloneNode(true))
  }

  connectedCallback () {
    ({ removeAdaptiveBehaviour: this.removeAdaptiveBehaviour } = addAdaptiveBehaviour({
      target: this.shadow.querySelector('input'),
      watchedProperties: ['characters']
    }))
  }

  disconnectedCallback () {
    this.removeAdaptiveBehaviour()
  }
}

customElements.define('expanding-input', ExpandingInput)
