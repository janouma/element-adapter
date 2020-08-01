export const length = (x, unit) => unitsMeasurements => x * unitsMeasurements[unit]

export const constant = x => () => x
