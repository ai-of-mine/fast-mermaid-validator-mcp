/*
 * Derived from upstream mermaid-js/mermaid — MIT License
 *   Copyright (c) 2014-2026 Knut Sveidqvist and Mermaid contributors
 *
 * v11 xychartDb — port of `diagrams/xychart/xychartDb.ts` (validation-only).
 */

const { createCommonDb } = require('./commonDb');

function createXychartDb() {
  const common = createCommonDb();
  let hasSetXAxis = false;
  let hasSetYAxis = false;
  let plotIndex = 0;
  const plots = [];
  const config = {};
  const themeConfig = {};
  let plotColorPalette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];

  return {
    clear() {
      hasSetXAxis = false; hasSetYAxis = false; plotIndex = 0;
      plots.length = 0; common.clear();
    },
    setTmpSVGG()         { /* no-op */ },
    setOrientation()     { /* no-op */ },
    setXAxisTitle(t)     { hasSetXAxis = true; void t; },
    setXAxisBand()       { hasSetXAxis = true; },
    setXAxisRangeData()  { hasSetXAxis = true; },
    setYAxisTitle()      { hasSetYAxis = true; },
    setYAxisRangeData()  { hasSetYAxis = true; },
    setYAxisRangeFromPlotData() { hasSetYAxis = true; },
    transformDataWithoutCategory(d) { return d; },
    setLineData(_, data) { plots.push({ type: 'line', index: plotIndex++, data }); },
    setBarData(_, data)  { plots.push({ type: 'bar', index: plotIndex++, data }); },
    getDrawableElem()    { return []; },
    getChartThemeConfig() { return themeConfig; },
    getChartConfig()     { return config; },
    getPlotColorFromPalette(i) { return plotColorPalette[i % plotColorPalette.length]; },
    isBandAxisData()     { return false; },
    isLinearAxisData()   { return true; },
    setAccTitle:       (t) => common.setAccTitle(t),
    getAccTitle:       () => common.getAccTitle(),
    setAccDescription: (t) => common.setAccDescription(t),
    getAccDescription: () => common.getAccDescription(),
    setDiagramTitle:   (t) => common.setDiagramTitle(t),
    getDiagramTitle:   () => common.getDiagramTitle(),
    getCommonDb:       () => common
  };
}

module.exports = { createXychartDb };
