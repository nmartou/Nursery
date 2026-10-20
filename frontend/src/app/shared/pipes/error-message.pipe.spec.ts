import { ErrorMessagePipe } from './error-message.pipe';

describe('ErrorMessagePipe', () => {
  it('translates a key into the language of the interface', () => {
    expect(new ErrorMessagePipe().transform('closure.labelRequired')).toBe(
      'Le motif est obligatoire.',
    );
  });
});
