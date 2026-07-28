(function () {
  'use strict';

  var container = document.getElementById('hero-title-container');
  if (!container) return;

  opentype.load('/assets/fonts/caveat-original.ttf', function (error, font) {
    if (error) {
      container.innerHTML = '<h1 class="hero-title">zetazero</h1>';
      return;
    }

    var text = 'zetazero';
    var fontSize = 110;
    var glyphs = font.stringToGlyphs(text);
    var totalWidth = 0;
    var glyphWidths = [];

    for (var index = 0; index < glyphs.length; index += 1) {
      var width = glyphs[index].advanceWidth * fontSize / font.unitsPerEm;
      glyphWidths.push(width);
      totalWidth += width;
    }

    var padding = 20;
    var svgWidth = totalWidth + padding * 2;
    var svgHeight = 140;
    var baseline = 105;
    var primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    var svg = '<svg id="hero-svg" class="hero-title-svg" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" xmlns="http://www.w3.org/2000/svg">';
    var x = padding;

    for (var glyphIndex = 0; glyphIndex < glyphs.length; glyphIndex += 1) {
      var path = glyphs[glyphIndex].getPath(x, baseline, fontSize);
      var pathData = path.toPathData({ flipY: true, decimalPlaces: 1 });
      svg += '<path d="' + pathData + '" fill="none" stroke="' + primary + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      x += glyphWidths[glyphIndex];
    }

    svg += '</svg>';
    container.innerHTML = svg;

    new Vivus('hero-svg', {
      type: 'oneByOne',
      duration: 200,
      animTimingFunction: Vivus.EASE
    });
  });
})();
