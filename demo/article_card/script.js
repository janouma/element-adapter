import addAdaptiveBehaviour from '../../dist/element-adapter.esm.js'

const { HTMLElement, customElements } = window

const template = document.createElement('template')

template.innerHTML = `
<link rel="stylesheet" href="article_card/style.css" />
<header>
  <slot name="title"></slot>
  <div class="gallery"><slot name="media"></slot></div>
  <slot name="summary"></slot>
</header>
<slot>Missing content</slot>
`

class ArticleCard extends HTMLElement {
  constructor () {
    super()

    this.contentRoot = document.createElement('div')
    this.contentRoot.setAttribute('id', 'content-root')
    this.contentRoot.appendChild(template.content.cloneNode(true))

    this.shadow = this.attachShadow({ mode: 'closed' })
    this.shadow.appendChild(this.contentRoot)
  }

  connectedCallback () {
    ({ removeAdaptiveBehaviour: this.removeAdaptiveBehaviour } = addAdaptiveBehaviour({
      target: this.contentRoot,

      queries: {
        'width-gt-188px': 'width > 188px',
        'width-gt-375px': 'width > 375px',
        'width-gt-768px': 'width > 768px'
      },

      watchedProperties: ['width']
    }))
  }

  disconnectedCallback () {
    this.removeAdaptiveBehaviour()
  }
}

customElements.define('article-card', ArticleCard)
