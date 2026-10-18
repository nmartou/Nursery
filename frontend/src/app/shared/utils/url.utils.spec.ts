import { buildUrl } from './url.utils';

describe('buildUrl', () => {
  it('joins base URL and path with a single slash', () => {
    expect(buildUrl('http://api/', '/nursery')).toBe('http://api/nursery');
    expect(buildUrl('http://api', 'nursery')).toBe('http://api/nursery');
  });
});
