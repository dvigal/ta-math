var TA = (function () {
  'use strict';

  /**
   * Mean of an array
   * @param {nubmer[]} array 
   * @return {number}
   */
  function mean(array) {
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
  function sd(array) {
    return rmsd(array, new Array(array.length).fill(mean(array)));
  }


  /**
   * Root-mean-square deviation, error measure of the differences between two functions
   * @param {number[]} f
   * @param {number[]} g
   * @return {number}
   */
  function rmsd(f, g) {
    const sqrDiff = pointwise((a, b) => (a - b) * (a - b), f, g);
    return (f.length != g.length) ? Infinity : Math.sqrt(mean(sqrDiff));
  }


  /**
   * Provides elementwise operation of some amount function, i.e. map() generalization.
   * @param {function} operation
   * @param {...number[]} functions 
   * @return {number[]}
   */
  function pointwise(operation, ...functions) {
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
  function rolling(operation, window, array) {
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
  function trueRange($high, $low, $close) {
    let tr = [$high[0] - $low[0]];
    for (let i = 1; i < $low.length; i++) {
      tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
    }
    return tr;
  }

  /* overlays */

  function sma($close, window) {
    return rolling(x => mean(x), window, $close);
  }

  function ema($close, window, weight = null, start = null) {
    weight = weight ? weight : 2 / (window + 1);
    let ema = [ start ? start : mean($close.slice(0, window)) ];
    for (let i = 1; i < $close.length; i++) {
      ema.push($close[i] * weight + ema[i - 1] * (1 - weight));
    }  return ema;
  }

  function bb($close, window, mult) {
    const middle = sma($close, window);
    const upper = pointwise((a, b) => a + b * mult, middle, stddev($close, window));
    const lower = pointwise((a, b) => a - b * mult, middle, stddev($close, window));
    return { lower : lower, middle : middle, upper : upper};
  }

  function ebb($close, window, mult) {
    const middle = ema($close, window);
    const upper = pointwise((a, b) => a + b * mult, middle, expdev($close, window));
    const lower = pointwise((a, b) => a - b * mult, middle, expdev($close, window));
    return { lower : lower, middle : middle, upper : upper};
  }

  function psar($high, $low, stepfactor, maxfactor) {
    let extreme = $low[0],  factor = 0;
    let isUp = true,   psar = [extreme];
    for (let i = 1; i < $high.length; i++) {
      let newsar = psar[i - 1] + factor * (extreme - psar[i - 1]);
      if ((isUp && newsar < $low[i]) || (!isUp && newsar > $high[i])) {
        if ((isUp && $high[i] > extreme) || (!isUp && $low[i] < extreme)) {
          extreme = (isUp) ? $high[i] : $low[i];
          factor = (factor <= maxfactor) ? factor + stepfactor : maxfactor;
        }    } else {
        isUp = !isUp;   factor = stepfactor;
        newsar = (isUp) ? Math.min($low.slice(-3)) : Math.max($high.slice(-3));
        extreme = (isUp) ? $high[i] : $low[i];
      }
      psar.push(newsar);
    }
    return psar;
  }

  function vbp($close, $volume, zones, left, right) {
    let vbp = new Array(zones).fill(0);
    let bottom = Infinity, top = -Infinity, total = 0;
    for (let i = left; i < (right ? right : $close.length); i++) {
      total += $volume[i];
      top = (top < $close[i]) ? $close[i] : top;
      bottom = (bottom > $close[i]) ? $close[i] : bottom;
    }
    for (let i = left; i < (right ? right : $close.length); i++) {
      vbp[Math.floor(($close[i] - bottom + 1e-14) / (top - bottom + 2e-14) * (zones - 1))] += $volume[i];
    }
    return { bottom: bottom, top: top, volume: vbp.map((x) => { return x / total })};
  }

  function keltner($high, $low, $close, wmiddle, wchannel, mult) {
    let middle = ema($close, wmiddle);
    let upper = pointwise((a, b) => a + mult * b, middle, atr($high, $low, $close, wchannel));
    let lower = pointwise((a, b) => a - mult * b, middle, atr($high, $low, $close, wchannel));
    return { lower: lower, middle: middle, upper: upper };
  }

  function zigzag($time, $high, $low, percent) {
    let lowest = $low[0],         thattime = $time[0],    isUp = true;
    let highest = $high[0],       time = [],              zigzag = [];
    for (let i = 1; i < $time.length; i++) {
      if (isUp) {
        if ($high[i] > highest) { thattime = $time[i];    highest = $high[i]; }      if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
          isUp = false;           time.push(thattime);    zigzag.push(highest);   lowest = $low[i];
        }
      } else {
        if ($low[i] < lowest) {   thattime = $time[i];    lowest = $low[i]; }      if ($high[i] > lowest + (highest - lowest) * percent / 100) {
          isUp = true;            time.push(thattime);    zigzag.push(lowest);    highest = $high[i];
        }
      }
    }  return { time : time, price : zigzag};
  }

  /**
   * Sliding window standart deviation
   * @param $close close price
   * @param window size of window
   */
  function stddev($close, window) {
    return rolling(x => sd(x), window, $close);
  }


  /**
   * Sliding window weighted standart deviation
   * @param $close close price
   * @param window window size
   */
  function expdev($close, window, weight = null) {
    let sqrDiff = pointwise((a, b) => (a - b) * (a - b), $close, ema($close, window));
    return pointwise(x => Math.sqrt(x), ema(sqrDiff, window, weight));
  }


  /**
   * Moving average convergence/divergence
   * @param $close close price
   * @param wshort short window size
   * @param wlong long window size
   * @param wsig signal window size
   */
  function macd($close, wshort, wlong, wsig) {
    const line = pointwise((a, b) => a - b, ema($close, wshort), ema($close, wlong));
    const signal = ema(line, wsig);
    const hist = pointwise((a, b) => a - b, line, signal);
    return { line : line, signal : signal, hist : hist };
  }

  function rsi($close, window) {
    let gains = [0], loss = [1e-14];
    for (let i = 1; i < $close.length; i++) {
      let diff = $close[i] - $close[i - 1];
      gains.push(diff >= 0 ? diff : 0);
      loss.push(diff < 0 ? -diff : 0);
    }
    return pointwise((a, b) => 100 - 100 / (1 + a / b), ema(gains, window, 1 / window), ema(loss, window, 1 / window));
  }

  function stoch($high, $low, $close, window, signal, smooth) {
    let lowest = rolling(x => Math.min(...x), window, $low);
    let highest = rolling(x => Math.max(...x), window, $high);
    let K = pointwise(function (h, l, c) {return 100 * (c - l) / (h - l)}, highest, lowest, $close); 
    if (smooth > 1) { K = sma(K, smooth); }  return { line : K, signal : sma(K, signal) };
  }

  function obv($close, $volume) {
    let obv = [0];
    for (let i = 1; i < $close.length; i++) {
      obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
    }
    return obv;
  }

  function adl($high, $low, $close, $volume) {
    let adl = [$volume[0] * (2*$close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
    for (let i = 1; i < $high.length; i++) {
      adl[i] = adl[i - 1] + $volume[i] * (2*$close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
    }
    return adl;
  }

  function atr($high, $low, $close, window) {
    let tr = trueRange($high, $low, $close);
    return ema(tr, window, 1 / window);
  }

  function vi($high, $low, $close, window) {
    let pv = [($high[0] - $low[0]) / 2], nv = [pv[0]];
    for(let i = 1; i < $high.length; i++) {
      pv.push(Math.abs($high[i] - $low[i-1]));
      nv.push(Math.abs($high[i-1] - $low[i]));
    }
    let apv = rolling(x => x.reduce((sum, a) => {return sum + a;}, 0), window, pv);
    let anv = rolling(x => x.reduce((sum, a) => {return sum + a;}, 0), window, nv);
    let atr = rolling(x => x.reduce((sum, a) => {return sum + a;}, 0), window, trueRange($high, $low, $close));
    return { plus : pointwise((a, b) => a / b, apv, atr), minus :   pointwise((a, b) => a / b, anv, atr) };
  }

  /**
   * Stock exchanges responce format
   * @param {number[][]} data
   */
  let exchangeFormat = (data) => {
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
   * Class for calculating technical analysis indicators and overlays
   */
  class TA {
    constructor(ohlcv, format = null) {
      this.format = (format == null) ? exchangeFormat : format;

      let proxy = (prop) => new Proxy(this.format(ohlcv)[prop], {
        get: (obj, key) => {
          if (key == 'length') {
            return this.format(ohlcv).length;
          } else if (key == 'slice') {
            return (start, end) => {
              var result = [];
              for (var i = start; i < end; i++) { result.push(obj(i)); }
              return result;
            }
          } else {
            try {
              if (key === parseInt(key).toString()) {
                return obj(key);
              }
            } catch(er) {}
          }
        }
      });

      this.$ = ['time', 'open', 'high', 'low', 'close', 'volume'];
      this.$.forEach(prop => this.$[prop] = proxy(prop));


      /* technical analysy method defenition */

      return {
        sma:    (window = 15)                           =>    sma(this.$.close, window),
        ema:    (window = 10)                           =>    ema(this.$.close, window),
        bb:     (window = 15, mult = 2)                 =>    bb(this.$.close, window, mult),
        ebb:    (window = 10, mult = 2)                 =>    ebb(this.$.close, window, mult),
        psar:   (factor = 0.02, maxfactor = 0.2)        =>    psar(this.$.high, this.$.low, factor, maxfactor),
        vbp:    (zones = 12, left = 0, right = null)    =>    vbp(this.$.close, this.$.volume, zones, left, right),
        keltner:(wmiddle = 20, wchannel = 10, mult = 2) =>    keltner(this.$.high, this.$.low, this.$.close, wmiddle, wchannel, mult),
        zigzag: (percent = 15)                          =>    zigzag(this.$.time, this.$.high, this.$.low, percent),

        stddev: (window = 15)                           =>    stddev(this.$.close, window),
        expdev: (window = 15)                           =>    expdev(this.$.close, window),
        macd:   (wshort = 12, wlong = 26, wsig = 9)     =>    macd(this.$.close, wshort, wlong, wsig),
        rsi:    (window = 14)                           =>    rsi(this.$.close, window),
        stoch:  (window = 14, signal = 3, smooth = 1)   =>    stoch(this.$.high, this.$.low, this.$.close, window, signal, smooth),
        obv:    ()                                      =>    obv(this.$.close, this.$.volume),
        adl:    ()                                      =>    adl(this.$.high, this.$.low, this.$.close, this.$.volume),
        atr:    (window = 14)                           =>    atr(this.$.high, this.$.low, this.$.close, window),
        vi:     (window = 14)                           =>    vi(this.$.high, this.$.low, this.$.close, window),
      }
    }
  }

  return TA;

}());
