/**
 * Mean of an array
 * @param {nubmer[]} array 
 * @return {number}
 */
export function mean(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum / array.length;
}


/**
 * Standart deviation of an array
 * @param {number[]} array 
 * @return {number}
 */
export function sd(array) {
  return rmsd(array, new Array(array.length).fill(mean(array)));
}


/**
 * Root-mean-square deviation, error measure of the differences between two functions
 * @param {number[]} f
 * @param {number[]} g
 * @return {number}
 */
export function rmsd(f, g) {
  const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
  return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
}


/**
 * Normalized root-mean-square deviation, error measure of the differences between two functions
 * @param {number[]} f 
 * @param {number[]} g
 * @return {number}
 */
export function nrmsd(f, g) {
  return rmsd(f, g) / (Math.max(...f) - Math.min(...f));
}


/**
 * Provides elementwise operation of some amount function, i.e. map() generalization.
 * @param {function} operation
 * @param {...number[]} functions 
 * @return {number[]}
 */
export function pointwise(operation, ...functions) {
  let result = [];
  for (let i = 0; i < functions[0].length; i++) {
    let points = (i) => functions.map(array => array[i]);
    result[i] = operation(...points(i));
  }
  return result;
}


/**
 * Provides rolling window calculations
 * @param {function} operation 
 * @param {number} window 
 * @param {number[]} array
 * @return {[number[]]}
 */
export function rolling(operation, window, array) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let j = i + 1 - window;
    result.push(operation(array.slice((j > 0) ? j : 0, i + 1)));
  }
  return result;
}


/**
 * Calculates True Range in technical analysis
 * @param {number[]} $high
 * @param {number[]} $low
 * @param {number[]} $close
 * @return {number[]}
 */
export function trueRange($high, $low, $close) {
  let tr = [$high[0] - $low[0]];
  for (let i = 1; i < $low.length; i++) {
    tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
  }
  return tr;
}