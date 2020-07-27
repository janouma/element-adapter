import { makeAdaptive } from './index.js'

makeAdaptive(
  document.querySelectorAll('.component'),
  {
    classA: `width >= 100px && height < 50%; aspect-ratio <= ${16/9}; width >= 680px`,
    // classA: `width >= 100px && height < 50%`,
    classB: 'orientation == landscape',
    classC: 'width > 75%'
  }
)
