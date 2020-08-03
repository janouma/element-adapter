const isSameType = (a, b) => {
  const aType = typeof a
  const bType = typeof b

  if (aType === bType) {
    return true
  }

  throw new Error(`type mismatch: a(${a}) is ${aType} and b(${b}) is ${bType}`)
}

const greaterThan = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a > b
}

const greaterThanOrEqual = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a >= b
}

const lesserThan = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a < b
}

const lesserThanOrEqual = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a <= b
}

const equal = fnb => (unitsMeasurements, a) => {
  const b = fnb(unitsMeasurements)
  return isSameType(a, b) && a === fnb(unitsMeasurements)
}

export default {
  '>': greaterThan,
  '>=': greaterThanOrEqual,
  '<': lesserThan,
  '<=': lesserThanOrEqual,
  '==': equal
}
