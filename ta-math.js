"use strict";

function TA(ohlcv) {

  /* GETTERS */

  let _ohlcv = [[],[],[],[],[],[]];

  let $ = {
    get time()    { return getAndSave(0) },
    get open()    { return getAndSave(1) },
    get high()    { return getAndSave(2) },
    get low()     { return getAndSave(3) },
    get close()   { return getAndSave(4) },
    get volume()  { return getAndSave(5) },
  }

  let getAndSave = function(i) {
    if(_ohlcv[i].length == 0) {
      ohlcv.forEach((item) => {
        _ohlcv[i].push(item[i]);
      });
    }
    return _ohlcv[i];
  }


  /* HELPER FUNCTIONS */

  let mean = function(array) {
    return array.reduce((sum, item) => {
        return sum + item;
    }, 0) / array.length;
  }

  let variance = function(array) {
    let meanFill = fillarray(array.length, mean(array));
    let sqrDiff = pointwise(array, meanFill, (a, b) => (a - b) * (a - b));
    return mean(sqrDiff);
  }
  
  let firstNotNaN = function(array) {
    let i = 0;
    while(isNaN(array[i]) && i++ < array.length) { };
    return i;
  }
  
  let glue = function(...arg) {
    let result = [];
    arg[0].forEach((_, i) => {
      let tuple = [];
      arg.forEach((_, j) => {
        tuple.push(arg[j][i]);
      });
      result.push(tuple);
    });
    return result;
  }

  let fillarray = function(length, value) {
    let result = []
    for(let i = 0; i < length; i++) {
      result.push(value);
    }
    return result;
  }

  let pointwise = function(f, g, operation) {
    let result = [];
    f.forEach((_, i) => {
      result.push(operation(f[i], g[i]));
    });
    return result;
  }

  /* TECHNICAL ANALYSIS */

  let sma = function($close, window) {
    let result = [];
    let first = firstNotNaN($close);
    $close.forEach((_, i) => {
      if (i + 1 < window + first) {
        result.push(NaN);
      } else {
        result.push(mean($close.slice(i + 1 - window, i + 1)));
      } 
    });
    return result;
  }

  let ema = function($close, window) {
    let result = [];
    let first = firstNotNaN($close);
    let mult = 2 / (window + 1);
    $close.forEach((item, i) => {
      if (i + 1 < window + first) {
        result.push(NaN);
      } else if (i + 1 == window + first) {
        result.push(mean($close.slice(i + 1 - window, i + 1)));
      } else {
        result.push((item - result[i - 1]) * mult + result[i - 1]);
      }
    });
    return result;
  }

  let std = function($close, window) {
    let result = [];
    let first = firstNotNaN($close);
    $close.forEach((_, i) => {
      if (i + 1 < window + first) {
        result.push(NaN);
      } else {
        result.push(Math.sqrt(variance($close.slice(i + 1 - window, i + 1))));
      } 
    });
    return result;
  }

  let bband = function($close, window, mult) {
    let middle = sma($close, window);
    let upper = pointwise(middle, std($close, window), (a, b) => a + b * mult);
    let lower = pointwise(middle, std($close, window), (a, b) => a - b * mult);
    return glue(upper, middle, lower);
  }

  let macd = function($close, wshort, wlong, wsig) {
    let macd_line = pointwise(ema($close, wshort), ema($close, wlong), (a, b) => a - b);
    let macd_signal = ema(macd_line, wsig);
    let macd_hist = pointwise(macd_line, macd_signal, (a, b) => a - b);
    return glue(macd_line, macd_signal, macd_hist);
  }

  let zigzag = function($time, $high, $low, percent) {
    let low = $low[0];    let high = $high[0];
    let isUp = true;      let result = [[$time[0], $low[0]]];
    for(let i = 1; i < $time.length; i++) {
      if(isUp) {
        high = ($high[i] > high) ? $high[i] : high;
        if($low[i] < low + (high - low) * (100 - percent) / 100) {
          isUp = false;   result.push([$time[0], $low[0]]);
        }
      } else {
        low = ($low[i] < low) ? $low[i] : low;
        if($high[i] > low + (high - low) * percent / 100) {
          isUp = true;    result.push([$time[0], $low[0]]);
        }
      }
    }
    return result.pop();
  }


  /* DEFINITION */

  return {
    sma:    (window = 15)                         =>  sma($.close, window),
    ema:    (window = 10)                         =>  ema($.close, window),
    std:    (window = 15)                         =>  std($.close, window),
    bband:  (window = 15, mult = 2)               =>  bband($.close, window, mult),
    macd:   (wshort = 12, wlong = 26, wsig = 9)   =>  macd($.close, wshort, wlong, wsig),
    zigzag: (percent = 10)                        =>  zigzag($.time, $.high, $.low, percent)
  }
}