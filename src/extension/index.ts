import arrow from './arrow'
import ray from './ray'

import circle from './circle'
import rect from './rect'
import parallelogram from './parallelogram'
import parallelChannel from './parallelChannel'
import triangle from './triangle'
import fibonacciCircle from './fibonacciCircle'
import fibonacciSegment from './fibonacciSegment'
import fibonacciSpiral from './fibonacciSpiral'
import fibonacciSpeedResistanceFan from './fibonacciSpeedResistanceFan'
import fibonacciExtension from './fibonacciExtension'
import fibRetracement from './fibRetracement'
import gannBox from './gannBox'
import gannFan from './gannFan'
import threeWaves from './threeWaves'
import fiveWaves from './fiveWaves'
import eightWaves from './eightWaves'
import anyWaves from './anyWaves'
import elliotWave from './elliotWave'
import abcd from './abcd'
import xabcd from './xabcd'
import longPosition from './longPosition'
import shortPosition from './shortPosition'
import brush from './brush'
import measure from './measure'
import vwap from './indicator/vwap'
import superTrend from './indicator/superTrend'
import hma from './indicator/hma'
import pivotPoints from './indicator/pivotPoints'
import ichimoku from './indicator/ichimoku'
import boll_tv from './indicator/boll_tv'
import rsi_tv from './indicator/rsi_tv'
import macd_tv from './indicator/macd_tv'
import cci from './indicator/cci'
import stochastic from './indicator/stochastic'
import ma_ribbon from './indicator/ma_ribbon'

const overlays = [
  arrow,
  circle, rect, triangle, parallelogram,
  fibonacciCircle, fibonacciSegment, fibonacciSpiral,
  fibonacciSpeedResistanceFan, fibonacciExtension, fibRetracement, gannBox,
  threeWaves, fiveWaves, eightWaves, anyWaves, abcd, xabcd,
  longPosition, shortPosition, ray, gannFan, elliotWave, parallelChannel, measure, brush
]

const indicators = [
  vwap, superTrend, hma, pivotPoints, ichimoku,
  boll_tv, rsi_tv, macd_tv, cci, stochastic, ma_ribbon
]

export { overlays, indicators }
