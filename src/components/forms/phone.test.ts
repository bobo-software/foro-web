import { describe, expect, it } from 'vitest';
import { composePhone, flagEmoji, parsePhoneValue, validatePhone } from './phone';

describe('phone', () => {
  it('maps an ISO code to a flag emoji', () => {
    expect(flagEmoji('ZA')).toBe('🇿🇦');
    expect(flagEmoji('gb')).toBe('🇬🇧');
  });

  it('composes and parses a South African number, dropping the trunk 0', () => {
    expect(composePhone('ZA', '0210125184')).toBe('+27210125184');
    expect(parsePhoneValue('+27210125184')).toEqual({ iso: 'ZA', national: '210125184' });
  });

  it('keeps a shared dial code on the preferred country', () => {
    expect(parsePhoneValue('+14155552671', 'CA')).toEqual({ iso: 'CA', national: '4155552671' });
    expect(parsePhoneValue('+14155552671')).toEqual({ iso: 'US', national: '4155552671' });
  });

  it('validates length for the matched country', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('', { required: true })).toBe('Phone number is required');
    expect(validatePhone('+27210125184')).toBeNull();
    expect(validatePhone('+27123')).toBe('Enter 9 digits for South Africa');
  });
});
