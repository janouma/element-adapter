export const percentUnitsByDimension = {
  width: 'w%',
  height: 'h%'
}

const dimensionsByPercentUnit = Object.entries(percentUnitsByDimension)
  .reduce((results, [dim, unit]) => ({
    ...results,
    [unit]: dim
  }), {})

const mesureUnits = (elt, units, measure) => {
  if (units.length === 0) { return }

  const sample = document.createElement('b')
  sample.style.position = 'absolute'

  elt.appendChild(sample)

  const measurements = units.reduce((mes, unit) => ({
    ...mes,
    [unit]: measure(sample, unit)
  }), {})

  elt.removeChild(sample)

  return measurements
}

export const measureNonPercentUnits = (elt, units) => mesureUnits(
  elt,
  units,

  (sample, unit) => {
    sample.style.width = `1${unit}`
    return sample.getBoundingClientRect().width
  }
)

export const measurePercentUnits = (elt, units) => mesureUnits(
  elt.parentNode,
  units,

  (sample, unit) => {
    const dimension = dimensionsByPercentUnit[unit]

    sample.style[dimension] = '1%'

    const { [dimension]: mesurement } = sample.getBoundingClientRect()
    return mesurement
  }
)

export const isDimension = prop => ['width', 'height'].includes(prop)

export const computeOrientation =
  (width, height) => width > height ? 'landscape' : width < height ? 'portrait' : 'square'

export const computeRatio = (width, height) => width === 0 && height === 0 ? 1 : width / height
