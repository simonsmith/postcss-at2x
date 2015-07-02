import path from 'path';
import postcss from 'postcss';
import slash from 'slash';

const defaultResolutions = [
  '(min--moz-device-pixel-ratio: 1.5)',
  '(-o-min-device-pixel-ratio: 3/2)',
  '(-webkit-min-device-pixel-ratio: 1.5)',
  '(min-device-pixel-ratio: 1.5)',
  '(min-resolution: 144dpi)',
  '(min-resolution: 1.5dppx)'
];

export default postcss.plugin('postcss-at2x', at2x);

function at2x({ identifier = '@2x' } = {}) {
  return function(root) {
    root.eachRule((rule) => {

      const mediaParent = rule.parent;

      // If retina image is within a media query then ensure each size gets
      // the retina resolutions
      let retinaMediaParams;
      if (mediaParent.name === 'media') {
        retinaMediaParams = combineMediaQuery(mediaParent.params.split(/,\s*/), defaultResolutions);
      } else {
        retinaMediaParams = defaultResolutions.join(', ');
      }

      let mediaRule = postcss.atRule({ name: 'media', params: retinaMediaParams });

      // Check for any `background-size` declarations and keep a reference to it
      // These need to be added again to prevent it being overridden by usage of
      // the `background` shorthand
      let backgroundSize;
      rule.eachDecl('background-size', decl => backgroundSize = decl);

      rule.eachDecl(/^background/, (decl) => {
        // Exit if it's a normal background declaration
        if (!backgroundWithHiResURL(decl)) {
          return;
        }

        // Strip out `at-2x` from image url
        decl.value = decl.value.replace(/\s+(at-2x)\s*(;|$)/, '$2');

        // Construct a duplicate rule but with the image urls
        // replaced with retina versions
        let retinaRule = postcss.rule({ selector: decl.parent.selector });
        retinaRule.append(postcss.decl({
          prop: decl.prop,
          value: createRetinaUrl(decl.value, identifier)
        }));

        // Add back any `background-size` value
        if (backgroundSize) {
          retinaRule.append(postcss.decl(backgroundSize));
        }

        // Add the new rules to the bottom of the stylesheet
        mediaRule.append(retinaRule);
        root.append(mediaRule);
      });
    });
  };
}

/**
 * Add all the resolutions to each media query to scope them
 */
function combineMediaQuery(queries, resolutions) {
  return queries.reduce((finalQuery, query) => {
    resolutions.forEach(resolution => finalQuery.push(`${query} and ${resolution}`));
    return finalQuery;
  }, []).join(', ');
}

/**
 * Parse: `url(http://example.com)`
 * Return: `http://example.com`
 */
const urlRegex = /url\((.*?)\)/gm;

function createRetinaUrl(value, identifier) {
  let match, newValue;

  // Loop over all occurances of `url()`
  while ((match = urlRegex.exec(value)) !== null) {
    let [, url] = match;
    let extension = path.extname(url);

    if (extension === '.svg') {
      break;
    }

    // File name without extension
    let filename = path.basename(path.basename(url), extension);

    // Replace with retina filename
    newValue = value.replace(filename, filename + identifier);
  }

  return newValue;
}

function backgroundWithHiResURL(decl) {
  return decl.value.indexOf('url(') !== -1 &&
         decl.value.indexOf('at-2x') !== -1;
}
