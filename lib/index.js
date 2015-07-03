import path from 'path';
import postcss from 'postcss';
import 'babel/polyfill';

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
    // Create an empty rule so that all the new rules can be appended to this
    // and then append it at the end. Adding them to original `root` means
    // PostCSS then loops over the new rules in the `eachRule`
    // and creates extra loops and sadness.
    const ruleContainer = postcss.root();

    // Create the standard retina media at rule here so that all rules
    // can be appended into one rather than duplicating the params each time
    const retinaMediaAtRule = postcss.atRule({
      name: 'media',
      params: defaultResolutions.join(', ')
    });

    root.eachRule((rule) => {
      const mediaParent = rule.parent;

      // Check for any `background-size` declarations and keep a reference to it
      // These need to be added again to prevent it being overridden by usage of
      // the `background` shorthand
      let backgroundSize;
      rule.eachDecl('background-size', decl => backgroundSize = decl);

      rule.eachDecl(/^background/, (decl) => {
        // Exit if it's a normal background declaration
        if (!backgroundWithHiResURL(decl.value)) {
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

        // If retina image is within a media query then ensure each size gets
        // the retina resolutions. Append these one at the time because each set
        // of atRule params will be different
        //
        // Otherwise just append them to the media rule declared previously
        if (mediaParent.name === 'media') {
          const params = combineMediaQuery(mediaParent.params.split(/,\s*/), defaultResolutions);
          const scopedRetinaMediaAtRule = postcss.atRule({ name: 'media', params });

          scopedRetinaMediaAtRule.append(retinaRule);
          ruleContainer.append(scopedRetinaMediaAtRule);
        } else {
          retinaMediaAtRule.append(retinaRule);
        }
      });
    });

    // There is a chance ruleContainer could be empty, so check for it
    if (retinaMediaAtRule.nodes) {
      ruleContainer.append(retinaMediaAtRule);
    }

    // Add all the new rules to the bottom of the stylesheet
    root.append(ruleContainer);
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
  let match;

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
    value = value.replace(new RegExp(`(${filename})(${extension})`, 'gm'), `$1${identifier}$2`);
  }

  return value;
}

function backgroundWithHiResURL(value) {
  return value.includes('url(') && value.includes('at-2x');
}
