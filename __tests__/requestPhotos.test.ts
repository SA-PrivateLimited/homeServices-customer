import {
  photoUrlFromRef,
  photoUrlsFromRequest,
} from '../src/utils/requestPhotos';

describe('requestPhotos', () => {
  it('reads a string URL', () => {
    expect(photoUrlFromRef(' https://cdn.example/a.jpg ')).toBe(
      'https://cdn.example/a.jpg',
    );
  });

  it('reads an asset ref object', () => {
    expect(photoUrlFromRef({key: 'k', url: 'https://cdn.example/b.png'})).toBe(
      'https://cdn.example/b.png',
    );
  });

  it('filters invalid and duplicate URLs', () => {
    expect(
      photoUrlsFromRequest([
        'https://cdn.example/a.jpg',
        {url: 'https://cdn.example/a.jpg'},
        'file://local.jpg',
        'not-a-url',
        {key: 'x'},
        null,
      ]),
    ).toEqual(['https://cdn.example/a.jpg']);
  });
});
