import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

const ruleName = 'nursery/colors-in-root-only';

const messages = ruleMessages(ruleName, {
  rejected: (color) =>
    `Couleur « ${color} » interdite ici : déclarez-la comme variable dans « :root » (styles.scss) puis utilisez var(--…).`,
});

const HEX_COLOR = /#[0-9a-f]{3,8}\b/i;
// `color-mix()` is allowed: it only blends variables (and `transparent`).
const COLOR_FUNCTION =
  /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|lighten|darken|saturate|desaturate|mix|tint|shade|adjust-hue)\(/i;

// prettier-ignore
const NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
]);

/** Properties whose values are never colors, even when a word looks like one. */
const NON_COLOR_PROPERTIES =
  /^(font|font-family|animation|animation-name|grid-area|grid-template-areas|content|counter-.*|transition|transition-property|will-change|list-style-type)$/i;

/** Returns the first color literal found in a declaration value, or null. */
function findColor(prop, value) {
  // Ignore strings: they can contain anything (`content: 'red'`).
  const stripped = value.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '');

  const hex = stripped.match(HEX_COLOR);
  if (hex) {
    return hex[0];
  }
  const fn = stripped.match(COLOR_FUNCTION);
  if (fn) {
    return `${fn[1]}()`;
  }
  if (NON_COLOR_PROPERTIES.test(prop)) {
    return null;
  }
  // `--color-red` or `$red` are names, not colors: only bare words count.
  for (const [word] of stripped.matchAll(/(?<![\w$-])[a-z]+(?![\w-])/gi)) {
    if (NAMED_COLORS.has(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/** True when the declaration sits in a `:root` rule (possibly inside @media). */
function isInRoot(decl) {
  const rule = decl.parent;
  if (rule?.type !== 'rule') {
    return false;
  }
  if (rule.parent?.type === 'rule') {
    return false; // nested rule, e.g. `.a { :root & {} }`
  }
  return rule.selectors.every((selector) => selector.trim().startsWith(':root'));
}

/**
 * Colors are defined once, as custom properties in `:root`, and consumed
 * everywhere else through `var(--…)`. This keeps the palette in one place and
 * makes a future dark theme a matter of redefining the variables.
 * `transparent`, `currentColor` and `inherit` remain allowed.
 */
const ruleFunction = (primary) => (root, result) => {
  if (!primary) {
    return;
  }
  root.walkDecls((decl) => {
    const color = findColor(decl.prop, decl.value);
    if (!color) {
      return;
    }
    if (decl.prop.startsWith('--') && isInRoot(decl)) {
      return;
    }
    report({
      ruleName,
      result,
      node: decl,
      word: color,
      message: messages.rejected(color),
    });
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default createPlugin(ruleName, ruleFunction);
