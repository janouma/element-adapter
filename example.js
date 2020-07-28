import { addAdaptiveBehaviour } from './index.js'

const removeAdaptiveBehaviour = addAdaptiveBehaviour({
  target: document.querySelectorAll('.component'),

  queries: {
    classA: `width >= 6.25em && height < 50%, aspect-ratio <= ${16/9}, width >= 680px`,
    // classA: `width >= 100px && height < 50%`,
    classB: 'orientation == landscape',
    classC: 'width > 75%'
  }
})

document.querySelector('button')
  .addEventListener(
    'click',
    () => removeAdaptiveBehaviour(),
    { once: true }
  )
