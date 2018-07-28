/**
 * Stock exchanges responce format
 * @param {number[][]} data
 */
export let exchangeFormat = (data) => {
  return {
    length: data.length,
    time: (i) => data[i][0],
    open: (i) => data[i][1],
    high: (i) => data[i][2],
    low: (i) => data[i][3],
    close: (i) => data[i][4],
    volume: (i) => data[i][5]
  }
};


/**
 * Format that convenient for charts and analysis 
 * @param {number[][]} data
 */
export let simpleFormat = (data) => {
  return {
    length: data[0].length,
    time: (i) => data[0][i],
    open: (i) => data[1][i],
    high: (i) => data[2][i],
    low: (i) => data[3][i],
    close: (i) => data[4][i],
    volume: (i) => data[5][i]
  }
}