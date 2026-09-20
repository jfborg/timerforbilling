import { mapDbErrorMessage } from './errors';

describe('mapDbErrorMessage', () => {
  it('maps letter_not_found to 404', () => {
    expect(mapDbErrorMessage('letter_not_found')).toEqual({
      status: 404,
      body: { error: 'letter_not_found' },
    });
  });

  it('maps forbidden and locked to 403', () => {
    expect(mapDbErrorMessage('forbidden').status).toBe(403);
    expect(mapDbErrorMessage('locked').status).toBe(403);
  });

  it('maps already_claimed and already_opened to 409', () => {
    expect(mapDbErrorMessage('already_claimed').status).toBe(409);
    expect(mapDbErrorMessage('already_opened').status).toBe(409);
  });

  it('maps validation failures to 400', () => {
    expect(mapDbErrorMessage('body_text_required').status).toBe(400);
    expect(mapDbErrorMessage('unlock_at_too_soon').status).toBe(400);
    expect(mapDbErrorMessage('unlock_at_too_far').status).toBe(400);
    expect(mapDbErrorMessage('cannot_claim_own_letter').status).toBe(400);
  });

  it('falls back to 500 for an unrecognized message', () => {
    expect(mapDbErrorMessage('something_unexpected')).toEqual({
      status: 500,
      body: { error: 'internal_error' },
    });
  });
});
