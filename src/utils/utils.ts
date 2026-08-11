export const getDecimalPlaces = (num: number) => {
  if (Math.floor(num) === num) return 0
  const str = num.toString()
  if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length
  }
  return 0
}
