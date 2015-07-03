import path from 'path';
import postcss from 'postcss';
import 'string.prototype.includes';

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

        // Construct a duplicate rule but with the image urls
        // replaced with retina versions
        const retinaRule = postcss.rule({ selector: decl.parent.selector });
        retinaRule.append(postcss.decl({
          prop: decl.prop,
          value: createRetinaUrl(decl.value, identifier)
        }));

        // Remove keyword from original declaration here as createRetinaUrl
        // needs it for regex search
        decl.value = removeKeyword(decl.value);

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

// Matches `url()` content as long as it is followed by `at-2x`
const urlPathRegex = /url\(([^\r\n]+)\)(?:[^\r\n]+)?at-2x/gm;

function createRetinaUrl(bgValue, identifier) {
  let match;
  // Loop over all occurances of `url()` and match the path
  while ((match = urlPathRegex.exec(bgValue)) !== null) {
    const [, imgUrl] = match;
    const extension = path.extname(imgUrl);

    if (extension === '.svg') {
      break;
    }

    // File name without extension
    const filename = path.basename(path.basename(imgUrl), extension);

    // Replace with retina filename
    bgValue = bgValue.replace(filename + extension, filename + identifier + extension);
  }

  // Remove all `at-2x` from final value
  return removeKeyword(bgValue);
}

function removeKeyword(str) {
  return str.replace(/\sat-2x/g, '');
}

function backgroundWithHiResURL(bgValue) {
  return bgValue.includes('url(') && bgValue.includes('at-2x');
}
