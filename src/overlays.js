import { sma, ema, stdev, expdev, pointwise, atr} from './core';

/* overlays */

export function bb($close, window, mult) {
  const middle = sma($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, stdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, stdev($close, window));
  return { lower : lower, middle : middle, upper : upper};
}

export function ebb($close, window, mult) {
  const middle = ema($close, window);
  const upper = pointwise((a, b) => a + b * mult, middle, expdev($close, window));
  const lower = pointwise((a, b) => a - b * mult, middle, expdev($close, window));
  return { lower : lower, middle : middle, upper : upper};
}

export function psar($high, $low, stepfactor, maxfactor) {
  let extreme = $low[0],  factor = 0;
  let isUp = true,   psar = [extreme];
  for (let i = 1; i < $high.length; i++) {
    let newsar = psar[i - 1] + factor * (extreme - psar[i - 1]);
    if ((isUp && newsar < $low[i]) || (!isUp && newsar > $high[i])) {
      if ((isUp && $high[i] > extreme) || (!isUp && $low[i] < extreme)) {
        extreme = (isUp) ? $high[i] : $low[i];
        factor = (factor <= maxfactor) ? factor + stepfactor : maxfactor;
      };
    } else {
      isUp = !isUp;   factor = stepfactor;
      newsar = (isUp) ? Math.min($low.slice(-3)) : Math.max($high.slice(-3));
      extreme = (isUp) ? $high[i] : $low[i];
    }
    console.log("sar=" + newsar + "extreme=" + extreme +" factor=" + factor + "dir=" + isUp);
    psar.push(newsar);
  }
  return psar;
}

export function vbp($close, $volume, zones, left, right) {
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

export function keltner($high, $low, $close, window, mult) {
  let middle = ema($close, window);
  let upper = pointwise((a, b) => a + mult * b, middle, atr($high, $low, $close, window));
  let lower = pointwise((a, b) => a - mult * b, middle, atr($high, $low, $close, window));
  return { lower: lower, middle: middle, upper: upper };
}

export function zigzag($time, $high, $low, percent) {
  let lowest = $low[0],         thattime = $time[0],    isUp = true;
  let highest = $high[0],       time = [],              zigzag = [];
  for (let i = 1; i < $time.length; i++) {
    if (isUp) {
      if ($high[i] > highest) { thattime = $time[i];    highest = $high[i]; };
      if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
        isUp = false;           time.push(thattime);    zigzag.push(highest);   lowest = $low[i];
      }
    } else {
      if ($low[i] < lowest) {   thattime = $time[i];    lowest = $low[i]; };
      if ($high[i] > lowest + (highest - lowest) * percent / 100) {
        isUp = true;            time.push(thattime);    zigzag.push(lowest);    highest = $high[i];
      }
    }
  };
  return { time : time, price : zigzag};
}