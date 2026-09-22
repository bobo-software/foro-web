/** National number lengths exclude the trunk prefix (leading 0). */
export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string;
  min: number;
  max: number;
}

export const DEFAULT_PHONE_COUNTRY = 'ZA';

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'DZ', name: 'Algeria', dial: '213', min: 9, max: 9 },
  { iso: 'AO', name: 'Angola', dial: '244', min: 9, max: 9 },
  { iso: 'AR', name: 'Argentina', dial: '54', min: 10, max: 10 },
  { iso: 'AU', name: 'Australia', dial: '61', min: 9, max: 9 },
  { iso: 'AT', name: 'Austria', dial: '43', min: 10, max: 13 },
  { iso: 'BH', name: 'Bahrain', dial: '973', min: 8, max: 8 },
  { iso: 'BD', name: 'Bangladesh', dial: '880', min: 10, max: 10 },
  { iso: 'BE', name: 'Belgium', dial: '32', min: 8, max: 9 },
  { iso: 'BW', name: 'Botswana', dial: '267', min: 7, max: 8 },
  { iso: 'BR', name: 'Brazil', dial: '55', min: 10, max: 11 },
  { iso: 'BI', name: 'Burundi', dial: '257', min: 8, max: 8 },
  { iso: 'CM', name: 'Cameroon', dial: '237', min: 9, max: 9 },
  { iso: 'CA', name: 'Canada', dial: '1', min: 10, max: 10 },
  { iso: 'CL', name: 'Chile', dial: '56', min: 9, max: 9 },
  { iso: 'CN', name: 'China', dial: '86', min: 11, max: 11 },
  { iso: 'CO', name: 'Colombia', dial: '57', min: 10, max: 10 },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '225', min: 10, max: 10 },
  { iso: 'CZ', name: 'Czechia', dial: '420', min: 9, max: 9 },
  { iso: 'CD', name: 'DR Congo', dial: '243', min: 9, max: 9 },
  { iso: 'DK', name: 'Denmark', dial: '45', min: 8, max: 8 },
  { iso: 'EG', name: 'Egypt', dial: '20', min: 10, max: 10 },
  { iso: 'SZ', name: 'Eswatini', dial: '268', min: 8, max: 8 },
  { iso: 'ET', name: 'Ethiopia', dial: '251', min: 9, max: 9 },
  { iso: 'FI', name: 'Finland', dial: '358', min: 9, max: 10 },
  { iso: 'FR', name: 'France', dial: '33', min: 9, max: 9 },
  { iso: 'DE', name: 'Germany', dial: '49', min: 10, max: 11 },
  { iso: 'GH', name: 'Ghana', dial: '233', min: 9, max: 9 },
  { iso: 'GR', name: 'Greece', dial: '30', min: 10, max: 10 },
  { iso: 'HK', name: 'Hong Kong', dial: '852', min: 8, max: 8 },
  { iso: 'HU', name: 'Hungary', dial: '36', min: 8, max: 9 },
  { iso: 'IN', name: 'India', dial: '91', min: 10, max: 10 },
  { iso: 'ID', name: 'Indonesia', dial: '62', min: 9, max: 12 },
  { iso: 'IE', name: 'Ireland', dial: '353', min: 7, max: 9 },
  { iso: 'IL', name: 'Israel', dial: '972', min: 8, max: 9 },
  { iso: 'IT', name: 'Italy', dial: '39', min: 9, max: 10 },
  { iso: 'JP', name: 'Japan', dial: '81', min: 10, max: 10 },
  { iso: 'KE', name: 'Kenya', dial: '254', min: 9, max: 9 },
  { iso: 'KW', name: 'Kuwait', dial: '965', min: 8, max: 8 },
  { iso: 'LS', name: 'Lesotho', dial: '266', min: 8, max: 8 },
  { iso: 'MG', name: 'Madagascar', dial: '261', min: 9, max: 9 },
  { iso: 'MW', name: 'Malawi', dial: '265', min: 7, max: 9 },
  { iso: 'MY', name: 'Malaysia', dial: '60', min: 9, max: 10 },
  { iso: 'MU', name: 'Mauritius', dial: '230', min: 7, max: 8 },
  { iso: 'MX', name: 'Mexico', dial: '52', min: 10, max: 10 },
  { iso: 'MA', name: 'Morocco', dial: '212', min: 9, max: 9 },
  { iso: 'MZ', name: 'Mozambique', dial: '258', min: 8, max: 9 },
  { iso: 'NA', name: 'Namibia', dial: '264', min: 8, max: 9 },
  { iso: 'NL', name: 'Netherlands', dial: '31', min: 9, max: 9 },
  { iso: 'NZ', name: 'New Zealand', dial: '64', min: 8, max: 10 },
  { iso: 'NG', name: 'Nigeria', dial: '234', min: 10, max: 10 },
  { iso: 'NO', name: 'Norway', dial: '47', min: 8, max: 8 },
  { iso: 'OM', name: 'Oman', dial: '968', min: 8, max: 8 },
  { iso: 'PK', name: 'Pakistan', dial: '92', min: 10, max: 10 },
  { iso: 'PE', name: 'Peru', dial: '51', min: 9, max: 9 },
  { iso: 'PH', name: 'Philippines', dial: '63', min: 10, max: 10 },
  { iso: 'PL', name: 'Poland', dial: '48', min: 9, max: 9 },
  { iso: 'PT', name: 'Portugal', dial: '351', min: 9, max: 9 },
  { iso: 'QA', name: 'Qatar', dial: '974', min: 8, max: 8 },
  { iso: 'RO', name: 'Romania', dial: '40', min: 9, max: 9 },
  { iso: 'RU', name: 'Russia', dial: '7', min: 10, max: 10 },
  { iso: 'RW', name: 'Rwanda', dial: '250', min: 9, max: 9 },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', min: 9, max: 9 },
  { iso: 'SN', name: 'Senegal', dial: '221', min: 9, max: 9 },
  { iso: 'SC', name: 'Seychelles', dial: '248', min: 7, max: 7 },
  { iso: 'SG', name: 'Singapore', dial: '65', min: 8, max: 8 },
  { iso: 'SK', name: 'Slovakia', dial: '421', min: 9, max: 9 },
  { iso: 'ZA', name: 'South Africa', dial: '27', min: 9, max: 9 },
  { iso: 'KR', name: 'South Korea', dial: '82', min: 9, max: 10 },
  { iso: 'ES', name: 'Spain', dial: '34', min: 9, max: 9 },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', min: 9, max: 9 },
  { iso: 'SE', name: 'Sweden', dial: '46', min: 7, max: 10 },
  { iso: 'CH', name: 'Switzerland', dial: '41', min: 9, max: 9 },
  { iso: 'TZ', name: 'Tanzania', dial: '255', min: 9, max: 9 },
  { iso: 'TH', name: 'Thailand', dial: '66', min: 9, max: 9 },
  { iso: 'TN', name: 'Tunisia', dial: '216', min: 8, max: 8 },
  { iso: 'TR', name: 'Turkey', dial: '90', min: 10, max: 10 },
  { iso: 'UG', name: 'Uganda', dial: '256', min: 9, max: 9 },
  { iso: 'UA', name: 'Ukraine', dial: '380', min: 9, max: 9 },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', min: 8, max: 9 },
  { iso: 'GB', name: 'United Kingdom', dial: '44', min: 10, max: 10 },
  { iso: 'US', name: 'United States', dial: '1', min: 10, max: 10 },
  { iso: 'VN', name: 'Vietnam', dial: '84', min: 9, max: 10 },
  { iso: 'ZM', name: 'Zambia', dial: '260', min: 9, max: 9 },
  { iso: 'ZW', name: 'Zimbabwe', dial: '263', min: 9, max: 9 },
];

const COUNTRY_BY_ISO = new Map(PHONE_COUNTRIES.map((country) => [country.iso, country]));

/** When several countries share a dial code and the caller has no preference, pick these first. */
const SHARED_DIAL_PREFERENCE = ['US', 'RU'];

export function getPhoneCountry(iso: string): PhoneCountry {
  return COUNTRY_BY_ISO.get(iso) ?? COUNTRY_BY_ISO.get(DEFAULT_PHONE_COUNTRY)!;
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function flagEmoji(iso: string): string {
  return [...iso.toUpperCase()]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Drop a single trunk prefix so `082…` stores as the national significant number. */
export function nationalDigits(raw: string): string {
  return digitsOnly(raw).replace(/^0/, '');
}

function matchDial(digits: string, preferredIso?: string): { country: PhoneCountry; national: string } | null {
  const matches = PHONE_COUNTRIES.filter((country) => digits.startsWith(country.dial));
  if (!matches.length) return null;
  const longest = Math.max(...matches.map((country) => country.dial.length));
  const tied = matches.filter((country) => country.dial.length === longest);
  const preferred = preferredIso ? tied.find((country) => country.iso === preferredIso) : undefined;
  const country =
    preferred ??
    tied.find((country) => SHARED_DIAL_PREFERENCE.includes(country.iso)) ??
    tied[0];
  return { country, national: digits.slice(country.dial.length) };
}

export function parsePhoneValue(
  value: string,
  fallbackIso = DEFAULT_PHONE_COUNTRY,
): { iso: string; national: string } {
  const trimmed = value.trim();
  if (!trimmed) return { iso: fallbackIso, national: '' };

  if (trimmed.startsWith('+')) {
    const matched = matchDial(digitsOnly(trimmed), fallbackIso);
    if (matched) return { iso: matched.country.iso, national: matched.national };
  }

  return { iso: fallbackIso, national: nationalDigits(trimmed) };
}

/** International form stored on the record, e.g. `+27210125184`. Empty national → `''`. */
export function composePhone(iso: string, nationalRaw: string): string {
  const national = nationalDigits(nationalRaw);
  if (!national) return '';
  return `+${getPhoneCountry(iso).dial}${national}`;
}

export function validatePhone(
  value: string,
  options?: { required?: boolean; fallbackIso?: string },
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return options?.required ? 'Phone number is required' : null;
  }

  const parsed = parsePhoneValue(trimmed, options?.fallbackIso);
  const country = getPhoneCountry(parsed.iso);
  if (!/^\d+$/.test(parsed.national)) {
    return 'Phone number can only contain digits';
  }
  if (parsed.national.length < country.min || parsed.national.length > country.max) {
    const range = country.min === country.max ? `${country.min}` : `${country.min}–${country.max}`;
    return `Enter ${range} digits for ${country.name}`;
  }
  if (country.dial.length + parsed.national.length > 15) {
    return 'Phone number is too long';
  }
  return null;
}

export function filterPhoneCountries(query: string): PhoneCountry[] {
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  if (!q) return PHONE_COUNTRIES;
  return PHONE_COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(q) ||
      country.dial.startsWith(q) ||
      country.iso.toLowerCase() === q,
  );
}
