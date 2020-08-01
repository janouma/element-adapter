import addAdaptiveBehaviour from '../dist/element-adapter.js'

const removeAdaptiveBehaviour = addAdaptiveBehaviour({
  target: document.querySelectorAll('.component'),

  queries: {
    classA: `width >= 6.25em && height < 50%, aspect-ratio <= ${16 / 9}, width >= 680px`,
    classB: 'orientation == landscape',
    classC: 'width > 75%',
    classD: 'characters > 10',
    classE: 'children >= 2 && children < 5',
    classF: 'characters == 0'
  }

  // , watchedProperties: ['orientation']
})

document.querySelector('button')
  .addEventListener(
    'click',
    () => removeAdaptiveBehaviour(),
    { once: true }
  )