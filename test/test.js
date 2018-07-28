'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tape = _interopDefault(require('tape'));
var tapSpec = _interopDefault(require('tap-spec'));

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
 * Normalized root-mean-square deviation, error measure of the differences between two functions
 * @param {number[]} f 
 * @param {number[]} g
 * @return {number}
 */
function nrmsd(f, g) {
  return rmsd(f, g) / (Math.max(...f) - Math.min(...f));
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
 * Format that convenient for charts and analysis 
 * @param {number[][]} data
 */
let simpleFormat = (data) => {
  return {
    length: data[0].length,
    time: (i) => data[0][i],
    open: (i) => data[1][i],
    high: (i) => data[2][i],
    low: (i) => data[3][i],
    close: (i) => data[4][i],
    volume: (i) => data[5][i]
  }
};

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

let randomize = (tleft, right) => {
  return (right - tleft) * Math.random() + tleft;
};

// random ohlcv
let random = new Array(6).fill(0).map(x => x = new Array(50).fill(0));
for (let i = 0; i < random[0].length; i++) {
  let lcoh = [randomize(5000, 20000),randomize(5000, 20000),randomize(5000, 20000),randomize(5000, 20000)].sort();
  if(randomize(0,1)) { let temp = lcoh[1]; lcoh[1] = lcoh[2]; lcoh[2] = temp; }  random[0][i] = new Date('2018-01-01').getTime() + i * 60000;
  random[1][i] = lcoh[1];  //o
  random[2][i] = lcoh[3];  //h
  random[3][i] = lcoh[0];  //l
  random[4][i] = lcoh[2];  //c
  random[5][i] = randomize(5, 1000);
}let noize = new TA(random, simpleFormat);

tape.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);

tape('Mean & SD', (t) => {
  let data = [53.73,53.87,53.85,53.88,54.08,54.14,54.50,54.30,54.40,54.16];
  let delta = Math.abs(mean(data) - 54.09);
  t.ok(delta < 1e-2, `Direct mean test (${delta.toFixed(5)})`);
  let delta2 = Math.abs(sd(data) - 0.24);
  t.ok(delta2 < 1e-2, `Direct sd test (${delta2.toFixed(5)})`);
  t.end();
});

tape('RMSD', (t) => {
  t.ok(isFinite(rmsd(random[0], random[1])), 'Finite test');
  t.ok(rmsd(random[0],random[0]) == 0, 'Simple test');
  let delta = Math.abs(rmsd([-2,5,-8,9,-4],[0,0,0,0,0]) - 6.16);
  t.ok(delta < 1e-2, `Direct test (${delta.toFixed(5)})`);
  t.end();
});

tape('SMA', (t) => {
  let c = [22.27,22.19,22.08,22.17,22.18,22.13,22.23,22.43,22.24,22.29,22.15,22.39,22.38,22.61,23.36,
    24.05,23.75,23.83,23.95,23.63,23.82,23.87,23.65,23.19,23.10,23.33,22.68,23.10,22.40,22.17];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,22.22,22.21,22.23,22.26,22.31,22.42,22.61,
          22.77,22.91,23.08,23.21,23.38,23.53,23.65,23.71,23.69,23.61,23.51,23.43,23.28,23.13];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).sma(10);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(9), actual.slice(9));
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('EMA', (t) => {
  let c = [22.27,22.19,22.08,22.17,22.18,22.13,22.23,22.43,22.24,22.29,22.15,22.39,22.38,22.61,23.36,
    24.05,23.75,23.83,23.95,23.63,23.82,23.87,23.65,23.19,23.10,23.33,22.68,23.10,22.40,22.17];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,22.22,22.21,22.24,22.27,22.33,22.52,22.80,
          22.97,23.13,23.28,23.34,23.43,23.51,23.54,23.47,23.40,23.39,23.26,23.23,23.08,22.92];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).ema(10);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(9), actual.slice(9));
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('BB', (t) => {
  let c = [86.16,89.09,88.78,90.32,89.07,91.15,89.44,89.18,86.93,87.68,86.96,89.43,89.32,88.72,
    87.45,87.26,89.50,87.90,89.13,90.70,92.90,92.98,91.80,92.66,92.68,92.30,92.77,92.54,92.95,
    93.20,91.07,89.83,89.74,90.40,90.74,88.02,88.09,88.84,90.78,90.54,91.39,90.65];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,86.12,
    86.14,85.87,85.85,85.70,85.65,85.59,85.56,85.60,85.98,86.27,86.82,86.87,86.91,87.12,87.63,87.83,
    87.56,87.76,87.97,87.95,87.96,87.95];
  let bb = new TA([c,c,c,c,c,c], simpleFormat).bb(20,2);
  t.ok((bb.lower.every(isFinite) && bb.middle.every(isFinite) && bb.upper.every(isFinite)), 'Finite test');
  let delta = nrmsd(expected.slice(19), bb.lower.slice(19));
  t.ok(delta < 1e-2, `NRMSD test on lower (${delta.toFixed(5)})`);
  t.end();
});

tape('EBB', (t) => {
  let ebb = noize.ebb();  t.ok((ebb.lower.every(isFinite) && ebb.middle.every(isFinite) && ebb.upper.every(isFinite)), 'Finite test');
  t.end();
});

tape('PSAR', (t) => {
  let h = [48.11,48.30,48.17,48.60,48.33,48.40,48.55,48.45,48.70,48.72,48.90,48.87,48.82,49.05,49.20,49.35];
  let l = [47.25,47.77,47.91,47.90,47.74,48.10,48.06,48.07,47.79,48.14,48.39,48.37,48.24,48.64,48.94,48.86];
  let expected = [47.25,47.25,47.25,47.27,47.32,47.38,47.42,47.47,47.52,47.59,47.68,47.80,47.91,48.01,48.13,48.28];
  let actual = new TA([h,h,h,l,l,l], simpleFormat).psar();
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(1), actual.slice(1));
  t.ok(delta < 2e-2, `NRMSD uptrend test (${delta.toFixed(5)})`);
  t.end();
});

tape('VBP', (t) => {
  let vbp = noize.vbp();
  let delta = sd(vbp.volume);
  t.ok([vbp.bottom, vbp.top].every(isFinite) && vbp.volume.every(isFinite), 'Finite test');
  t.ok(vbp.bottom < vbp.top, 'Bottom lower than top');
  t.ok(delta < 0.1, `SD of uniform distribution (${delta.toFixed(5)})`);
  t.end();
});

tape('Keltner channel', (t) => {
  let keltner = noize.keltner();
  t.ok(keltner.lower.every(isFinite) && keltner.middle.every(isFinite) && keltner.upper.every(isFinite), 'Finite test');
  t.end();
});

tape('ZigZag', (t) => {
  let zz = noize.zigzag();
  t.ok(zz.time.every(isFinite) && zz.price.every(isFinite), 'Finite test');
  let isUpDown = true;
  zz.price.forEach((x, i) => {
    if(i > 1 && Math.sign((zz.price[i - 2] - zz.price[i - 1]) * (zz.price[i - 1] - zz.price[i])) != -1) {
      isUpDown = false;
    }
  });
  t.ok(isUpDown, "UpDown test");
  for (let i = 0; i < zz.time.length - 1; i++) {
    let tleft = random[0].indexOf(zz.time[i]);
    let tright = random[0].indexOf(zz.time[i + 1]);
    let isUp = zz.price[tleft] < zz.price[tright];
    for (let j = tleft; j <= tright; j++) {
      if (random[4][j] < zz.price[isUp ? tleft : tright] || random[4][j] > zz.price[isUp ? tright : tleft]) ;
  } }
  //t.ok(ok, "MinMax test");
  t.end();
});

tape('STDDEV', (t) => {
  let c = [52.22,52.78,53.02,53.67,53.67,53.74,53.45,53.72,53.39,52.51,52.32,51.45,51.60,52.43,52.47,
    52.91,52.07,53.12,52.77,52.73,52.09,53.19,53.73,53.87,53.85,53.88,54.08,54.14,54.50,54.30,54.40,54.16];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.51,0.73,0.86,0.83,0.79,0.72,0.68,
    0.58,0.51,0.52,0.53,0.48,0.49,0.58,0.62,0.67,0.62,0.66,0.69,0.65,0.36,0.24];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).stddev(10);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(10), actual.slice(10));
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('EXPDEV', (t) => {
  let ed = noize.expdev();  t.ok(ed.every(isFinite), 'Finite test');
  t.end();
});

tape('MACD', (t) => {
  let c = [16.39,16.50,16.45,16.43,16.52,16.51,16.423,16.41,16.47,16.45,16.32,16.36,16.34,16.59,16.54,16.52,
    16.44,16.47,16.5,16.45,16.28,16.07,16.08,16.1,16.1,16.09,16.43,16.49,16.59,16.65,16.78,16.86,16.86,16.76];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.05,0.01,-0.01,-0.02,-0.01,0.00,-0.01,0.00,
    0.03,0.09,0.12,0.13,0.13,0.12,0.05,-0.01,-0.06,-0.10,-0.14,-0.17,-0.18,-0.16];
  let macd = new TA([c,c,c,c,c,c], simpleFormat).macd(13,5,6);
  t.ok(macd.line.every(isFinite) && macd.signal.every(isFinite) && macd.hist.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(19), macd.line.slice(19));
  t.ok(delta < 2e-2, `NRMSD test on macd line (${delta.toFixed(5)})`);
  t.end();
});

tape('RSI', (t) => {
  let c = [58.18,58.57,58.48,58.43,58.32,58.05,57.96,57.64,57.83,58.05,58.54,58.11,58.46,57.77,56.77,56.93,57.40,57.57,57.13,56.30,
    55.95,56.17,56.52,56.80,57.72,56.46,56.58,55.73,55.28,55.18,54.78,54.88,54.04,54.04,54.73,53.69,53.49,53.32,53.60,54.75,
    54.35,54.86,53.90,54.76,55.58,55.81,56.55,57.40,57.69,57.88,58.67,58.51,57.45,57.02,57.25,56.59,57.34,57.04,58.34,58.09,
    58.47,59.08,58.96,59.10,57.58,57.68,57.49,57.22,55.78,56.31,53.7,53.36,50.15,52.57,50.42,52.64,53.1,53.88,53.43,53.11,
    50.5,49.59,49.77,51.82,52.23,51.38,52.67,54.13,54.49,54.58,54.08,52.81,52.82,54.16,53.91,52.72,53.39,54.1,54.88];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,34.97,37.27,43.60,45.73,41.37,34.66,32.28,35.29,
    39.86,43.31,52.88,42.34,43.49,37.73,35.08,34.50,32.20,33.40,28.81,28.81,37.04,31.19,30.20,29.35,32.71,44.42,41.70,46.22,
    39.95,46.90,52.55,54.02,58.50,62.95,64.36,65.29,68.92,67.38,58.13,54.84,56.27,51.27,56.05,53.77,61.13,59.18,61.21,64.27,
    63.21,63.96,51.71,52.35,50.96,48.96,39.96,44.04,32.38,31.22,22.88,36.62,31.29,40.86,42.65,45.64,44.21,43.17,35.78,33.63,
    34.47,43.29,44.89,42.23,47.33,52.45,53.64,53.95,51.87,46.91,46.95,52.50,51.42,46.51,49.44,52.41,55.51];
  let actual = new TA([c,c,c,c,c,c], simpleFormat).rsi(14);
  t.ok(actual.every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(14), actual.slice(14));
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('Stoch', (t) => {
  let h = [127.01,127.62,126.59,127.35,128.17,128.43,127.37,126.42,126.90,126.85,125.65,125.72,127.16,127.72,127.69,
    128.22,128.27,128.09,128.27,127.74,128.77,129.29,130.06,129.12,129.29,128.47,128.09,128.65,129.14,128.64];
  let l = [125.36,126.16,124.93,126.09,126.82,126.48,126.03,124.83,126.39,125.72,124.56,124.57,125.07,126.86,126.63,
    126.80,126.71,126.80,126.13,125.92,126.99,127.81,128.47,128.06,127.61,127.60,127.00,126.90,127.49,127.40];
  let c = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,127.29,127.18,128.01,127.11,127.73,
    127.06,127.33,128.71,127.87,128.58,128.60,127.93,128.11,127.60,127.60,128.69,128.27];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,70.44,67.61,89.20,65.81,
    81.75,64.52,74.53,98.58,70.10,73.06,73.42,61.23,60.96,40.39,40.39,66.83,56.73];
  let actual = new TA([h,h,h,l,c,c], simpleFormat).stoch();
  t.ok(actual.line.slice(13).every(isFinite) && actual.line.slice(15).every(isFinite), 'Finite test');
  let delta = nrmsd(expected.slice(13), actual.line.slice(13));
  t.ok(delta < 1e-2, `NRMSD uptrend test (${delta.toFixed(5)})`);
  t.end();
});

tape('OBV', (t) => {
  let c = [53.26,53.30,53.32,53.37,54.19,53.92,54.65,54.60];
  let v = [8000,8200,8100,8300,8900,9200,13300,10300];
  let expected = [0,8200,16300,24600,33500,24300,37600,27300];
  let actual = new TA([c,c,c,c,c,v], simpleFormat).obv();
  let delta = nrmsd(expected, actual);
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('ADL', (t) => {
  let h = [62.34,62.05,62.27,60.79,59.93,61.75,60.00,59.00];
  let l = [61.37,60.69,60.10,58.61,58.71,59.86,57.97,58.02];
  let c = [62.15,60.81,60.45,59.18,59.24,60.20,58.48,58.24];
  let v = [7849,11692,10575,13059,20734,29630,17705,7259];
  let expected = [4774,-4855,-12019,-18249,-21006,-39976,-48785,-52785];
  let actual = new TA([c,c,h,l,c,v], simpleFormat).adl();
  let delta = nrmsd(expected, actual);
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 1e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('ATR', (t) => {
  let h = [58.38,58.64,58.58,58.64,58.69,58.35,58.22,58.32,58.55,58.27,58.63,58.66,58.54,58.42,57.68,56.94,57.5,57.7,57.57,56.52,56.44,
    56.43,56.67,56.86,57.72,57.72,56.78,56.37,55.91,55.64,55.16,55.15,54.73,54.33,54.86,54.55,53.9,54.12,53.76,54.81,54.84,54.89,
    54.65,55.04,55.59,55.92,56.59,57.48,57.75,57.98,58.84,58.52,58.2,57.56,57.83,57.67,57.34,57.28,58.38,58.67,58.8,59.18,59.29,
    59.31,58.77,58.41,58.1,58.31,57.22,56.38,55.6,54.55,52.66,52.62,52.58,53.22,53.43,53.88,53.87,53.94,51.68,51.22,50.79,51.82,
    52.95,52.44,52.84,54.19,54.82,55.25,55.15,54.14,52.9,54.17,54.69,53.77,53.43,54.21,55.49];
  let l = [57.87,58.02,58.23,58.33,58.18,57.69,57.47,57.44,57.67,57.7,58.13,57.72,57.6,57.75,56.64,56.36,56.78,57.22,57.06,56.03,55.94,
    55.85,55.99,56.56,57.04,56.41,56.27,55.65,55.25,55.14,54.62,54.62,53.99,53.85,54.43,53.59,53.03,53.16,53.17,53.56,54.34,53.59,
    53.8,53.84,54.81,55.41,55.98,56.42,57.32,57.43,58.23,57.86,57.25,56.96,57.05,56.37,56.81,56.48,57.58,57.99,57.83,58.4,58.5,
    58.8,57.43,57.38,56.94,56.53,55.72,54.87,53.7,51.86,50.15,49.49,50.36,50.89,52.42,53.06,52.72,52.56,50.04,49.55,49.62,49.9,
    51.26,51.2,50.7,53.17,53.64,54.12,53.98,52.53,51.46,53.43,53.74,52.39,52.11,53.33,53.84];
  let c = [58.18,58.57,58.48,58.43,58.32,58.05,57.96,57.64,57.83,58.05,58.54,58.11,58.46,57.77,56.77,56.93,57.4,57.57,57.13,56.3,55.95,
    56.17,56.52,56.8,57.72,56.46,56.58,55.73,55.28,55.18,54.78,54.88,54.04,54.04,54.73,53.69,53.49,53.32,53.6,54.75,54.35,54.86,
    53.9,54.76,55.58,55.81,56.55,57.4,57.69,57.88,58.67,58.51,57.45,57.02,57.25,56.59,57.34,57.04,58.34,58.09,58.47,59.08,58.96,
    59.1,57.58,57.68,57.49,57.22,55.78,56.31,53.7,53.36,50.15,52.57,50.42,52.64,53.1,53.88,53.43,53.11,50.5,49.59,49.77,51.82,
    52.23,51.38,52.67,54.13,54.49,54.58,54.08,52.81,52.82,54.16,53.91,52.72,53.39,54.1,54.88];
  let expected = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.66,0.69,0.69,0.69,0.67,0.66,0.69,0.68,0.67,0.67,0.65,0.67,0.71,0.70,0.72,
    0.71,0.70,0.69,0.68,0.69,0.68,0.69,0.72,0.73,0.75,0.73,0.77,0.75,0.79,0.81,0.84,0.84,0.81,0.81,0.83,0.80,0.78,0.80,0.80,0.83,0.81,
    0.81,0.85,0.84,0.84,0.88,0.86,0.87,0.86,0.86,0.83,0.89,0.90,0.92,0.98,1.02,1.06,1.17,1.28,1.41,1.54,1.58,1.67,1.62,1.57,1.54,1.53,
    1.64,1.64,1.61,1.64,1.64,1.61,1.65,1.64,1.61,1.58,1.55,1.55,1.54,1.53,1.49,1.49,1.48,1.44,1.45];
  let actual = new TA([c,c,h,l,c,c], simpleFormat).atr();
  let delta = nrmsd(expected.slice(13), actual.slice(13));
  t.ok(actual.every(isFinite), 'Finite test');
  t.ok(delta < 2e-2, `NRMSD test (${delta.toFixed(5)})`);
  t.end();
});

tape('VI', (t) => {
  let h = [1380.39,1376.51,1362.34,1351.53,1343.98,1363.13,1389.19,1391.74,1387.16,1385.03,1375.13,1394.16,1399.63,1407.14,1404.14,
    1405.95,1405.98,1405.87,1410.03,1407.73,1417.44,1418.71,1418.13,1426.68,1416.12,1413.49,1413.46,1416.17,1413.63,1413.95];
  let l = [1371.21,1362.19,1337.56,1329.24,1331.50,1338.17,1360.05,1381.37,1379.17,1373.35,1354.65,1365.45,1391.04,1394.46,1396.13,
    1398.80,1395.62,1397.32,1400.60,1401.83,1404.15,1414.67,1412.12,1410.86,1406.78,1400.50,1398.04,1409.11,1405.59,1406.57];
  let c = [1376.51,1362.66,1350.52,1338.31,1337.89,1360.02,1385.97,1385.30,1379.32,1375.32,1365.00,1390.99,1394.23,1401.35,1402.22,
    1402.80,1405.87,1404.11,1403.93,1405.53,1415.51,1418.16,1418.13,1413.17,1413.49,1402.08,1411.13,1410.44,1409.30,1410.49];
  let expected1 = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,1.10,1.15,
    1.26,1.33,1.34,1.35,1.26,1.21,1.21,1.23,1.35,1.26,1.05,1.11,1.07,1.06];
  let expected2 = [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,0.89,0.87,
    0.79,0.73,0.66,0.75,0.82,0.82,0.80,0.73,0.72,0.85,0.90,0.93,0.93,0.94];
  let actual = new TA([c,c,h,l,c,c], simpleFormat).vi();
  let delta1 = nrmsd(expected1.slice(14), actual.plus.slice(14));
  let delta2 = nrmsd(expected2.slice(14), actual.minus.slice(14));
  t.ok(actual.plus.slice(14).every(isFinite) && actual.minus.slice(14).every(isFinite), 'Finite test');
  t.ok(delta1 + delta2 < 2e-2, `NRMSD test (${delta1.toFixed(5)}, ${delta2.toFixed(5)})`);
  t.end();
});

function* test(a) {
  for(let i = 0; i < a.length; i++) {
    yield a[i];
  }
}

let a = [2,3,4,5];
let gen = test(a);
console.log(gen.next().value);
