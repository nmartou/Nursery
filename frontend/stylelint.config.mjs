/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['./stylelint-rules/colors-in-root-only.mjs'],
  rules: {
    // Colors only exist as custom properties in `:root` (src/styles.scss).
    'nursery/colors-in-root-only': true,
    'color-no-invalid-hex': true,

    // Blank lines group related variables in `:root`.
    'custom-property-empty-line-before': null,
    // Angular generates empty component stylesheets.
    'no-empty-source': null,
  },
};
