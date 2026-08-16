import {isTechnicalErrorText} from '../src/utils/userFacingError';

describe('isTechnicalErrorText', () => {
  it('rejects HTTP jargon', () => {
    expect(isTechnicalErrorText('Forbidden')).toBe(true);
    expect(isTechnicalErrorText('AxiosError')).toBe(true);
    expect(isTechnicalErrorText('Network Error')).toBe(true);
    expect(isTechnicalErrorText('500 Internal Server Error')).toBe(true);
    expect(isTechnicalErrorText('Upload failed (403)')).toBe(true);
  });

  it('allows product copy', () => {
    expect(
      isTechnicalErrorText('Could not upload the photo. Please try again.'),
    ).toBe(false);
  });
});
