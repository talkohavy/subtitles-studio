import { StatusCodes } from '@src/common/constants';
import { handleCors } from './handleCors';

const ALLOWED_ORIGINS = ['http://localhost:3004', 'https://subtitles.example.com'];

function checkOrigin(origin: string | undefined): boolean {
  const originHandler = handleCors(ALLOWED_ORIGINS);

  let isAllowed = false;
  originHandler(origin as string, (error: Error | null) => {
    isAllowed = error === null;
  });

  return isAllowed;
}

describe('handleCors', () => {
  it('should allow requests with no origin', () => {
    const actualResult = checkOrigin(undefined);

    expect(actualResult).toBe(true);
  });

  it('should allow an exact allowed origin', () => {
    const actualResult = checkOrigin('http://localhost:3004');

    expect(actualResult).toBe(true);
  });

  it('should reject a subdomain of an allowed origin', () => {
    const actualResult = checkOrigin('https://preview.subtitles.example.com');

    expect(actualResult).toBe(false);
  });

  it('should reject an unknown origin', () => {
    const actualResult = checkOrigin('https://evil.com');

    expect(actualResult).toBe(false);
  });

  it('should reject with a 403, not a server error', () => {
    let rejection: any = null;
    handleCors(ALLOWED_ORIGINS)('https://evil.com', (error: Error | null) => {
      rejection = error;
    });

    expect(rejection?.statusCode).toBe(StatusCodes.FORBIDDEN);
  });
});
