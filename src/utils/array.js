export const dedup = array => array.length > 0
  ? Array.from(new Set(array))
  : array
