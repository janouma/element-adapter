import addAdaptiveBehaviour from '../dist/element-adapter.js'

const {
  removeAdaptiveBehaviour,
  applyAdaptiveBehaviour
} = addAdaptiveBehaviour({
  target: document.querySelectorAll('.component'),

  queries: {
    [`width >= 6.25em && height < 50%, aspect-ratio <= ${16 / 9}, width >= 680px`]:
     'classA',

    'orientation == landscape':
      'classB',

    'orientation == portrait' (element, props) {
      console.debug(element, 'changed:\n', props)
    },

    'width > 75%':
      'classC',

    'characters > 10':
      'classD',

    'children >= 2 && children < 5':
      'classE',

    'characters == 0': 'classF'
  }

  // , watchedProperties: ['orientation']
})

document.querySelector('button.stop')
  .addEventListener(
    'click',
    () => removeAdaptiveBehaviour(),
    { once: true }
  )

document.querySelector('button.apply')
  .addEventListener(
    'click',
    () => applyAdaptiveBehaviour()
  )
