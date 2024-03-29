import { length, constant } from './calculators'
import comparators from './comparators'
import { percentUnitsByDimension } from '../utils/dimensions'
import { CSS_UNITS_BUT_PX } from './constants'
import { dedup } from '../utils/array'

const LENGTH_PATTERN = new RegExp(`^(\\d+(\\.\\d+)?)(${CSS_UNITS_BUT_PX.join('|')})$`)
const ABS_NUMBER_PATTERN = /^\d+(\.\d+)?(px)?$/

const compileQuery = query => {
  const booleanExpressions = query
    .trim()
    .toLowerCase()
    .split(/\s*,\s*/)

  const compiledQuery = []
  const units = []
  const percentUnits = []
  const watchedProperties = []

  for (const booleanExpr of booleanExpressions) {
    const comparisonExpressions = booleanExpr.split(/\s*&&\s*/)
    const compiledBooleanExpressions = []

    for (const comparisonExpr of comparisonExpressions) {
      const [property, comparator, srcValue] = comparisonExpr.split(/\s+/)
      const [/* whole match */, numberLiteral, /* fraction */, srcUnit] = srcValue.match(LENGTH_PATTERN) || []
      const unit = srcUnit === '%' ? percentUnitsByDimension[property] : srcUnit
      const number = unit && parseFloat(numberLiteral)
      let valueCalculator

      watchedProperties.push(property)

      if (unit) {
        const unitClassification = srcUnit === '%' ? percentUnits : units
        unitClassification.push(unit)
        valueCalculator = length(number, unit)
      } else {
        const parsedValue = srcValue.match(ABS_NUMBER_PATTERN) ? parseFloat(srcValue) : srcValue
        valueCalculator = constant(parsedValue)
      }

      compiledBooleanExpressions.push({ [property]: comparators[comparator](valueCalculator) })
    }

    compiledQuery.push(compiledBooleanExpressions)
  }

  return {
    query: compiledQuery,
    units,
    percentUnits,
    watchedProperties
  }
}

export const runQuery = ({ query, unitsMeasurements, props }) =>
  query.some(booleanExpr => booleanExpr.every(comparison => {
    const [[prop, compare]] = Object.entries(comparison)
    return compare(unitsMeasurements, props[prop])
  }))

export const compileQueryList = queries => {
  const compiledQueries = new Map()
  const units = []
  const percentUnits = []
  const watchedProperties = []

  for (const [query, behaviour] of Object.entries(queries)) {
    const compilationOut = compileQuery(query)

    compiledQueries.set(behaviour, compilationOut.query)
    units.push(...compilationOut.units)
    percentUnits.push(...compilationOut.percentUnits)
    watchedProperties.push(...compilationOut.watchedProperties)
  }

  return {
    compiledQueries,
    units: dedup(units),
    percentUnits: dedup(percentUnits),
    watchedProperties: dedup(watchedProperties)
  }
}
