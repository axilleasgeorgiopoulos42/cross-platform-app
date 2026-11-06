import { colors } from '../../src/constants/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pwaColors = require('../../scripts/pwa/colors');

describe('pwa colors', () => {
  it('mirrors the theme background colours', () => {
    expect(pwaColors).toEqual({
      light: colors.light.background,
      dark: colors.dark.background,
    });
  });
});
