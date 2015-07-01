import path from 'path';
import postcss from 'postcss';
import slash from 'slash';

var query = [
  '(min--moz-device-pixel-ratio: 1.5)',
  '(-o-min-device-pixel-ratio: 3/2)',
  '(-webkit-min-device-pixel-ratio: 1.5)',
  '(min-device-pixel-ratio: 1.5)',
  '(min-resolution: 144dpi)',
  '(min-resolution: 1.5dppx)'
];

module.exports = postcss.plugin('postcss-at2x', at2x);

function at2x(opts) {
  opts = opts || {};
  var identifier = opts.identifier !== undefined ? opts.identifier : '@2x';

  return function(root) {
    root.eachRule(function(rule) {
      // Create an @media retina rule
      var mediaParent = rule.parent;
      var params = mediaParent.name === 'media' ?
                 combineMediaQuery(mediaParent.params.split(/,\s*/), query) :
                 query.join(', ');
      var media = postcss.atRule({ name: 'media', params: params });

      // Check for any `background-size` declarations. These need to be added
      // again to prevent it being overriden by usage of the `background`
      // shorthand
      var backgroundSize;
      rule.eachDecl('background-size', function(decl) {
        backgroundSize = decl;
      });

      rule.eachDecl(/^background/, function(decl) {
        if (!backgroundWithHiResURL(decl)) {
          return;
        }

        var newRule = postcss.rule({ selector: decl.parent.selector });
        newRule.append(postcss.decl({
          prop: decl.prop,
          value: parseUrl(decl, identifier)
        }));

        if (backgroundSize) {
          newRule.append(postcss.decl(backgroundSize));
        }

        media.append(newRule);
        root.append(media);
      });
    });
  };
}

/**
 * Combines existing media query with 2x media query.
 */
function combineMediaQuery(base, additional) {
  var finalQuery = [];
  base.forEach(function(b) {
    additional.forEach(function(a) {
      finalQuery.push(b + ' and ' + a);
    });
  });
  return finalQuery.join(', ');
}

function parseUrl(decl, identifier) {
  // Strip out `at-2x`
  var val = decl.value.replace(/\s+(at-2x)\s*(;|$)/, '$2');
  decl.value = val;

  var i = val.indexOf('url(');
  var url = val.slice(i + 4, val.indexOf(')', i));
  var ext = path.extname(url);

  // ignore .svg
  if (ext === '.svg') {
    return;
  }

  // @2x url value
  var retinaUrl = path.join(path.dirname(url), path.basename(url, ext) + identifier + ext);

  // path.join uses backslash on windows, which breaks in CSS. Reverse that
  retinaUrl = slash(retinaUrl);

  // Replace all instances of `url(a/path/test.png)` with `url(a/path/test@2x.png)`.
  // This preserves other values set by background such as no-repeat, color etc
  return val.replace(/url\((.*?)\)/g, 'url(' + retinaUrl + ')');
}

function backgroundWithHiResURL(decl) {
  return decl.value.indexOf('url(') !== -1 &&
         decl.value.indexOf('at-2x') !== -1;
}
