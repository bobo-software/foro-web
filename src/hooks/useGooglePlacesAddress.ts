import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { CreateAddressDto } from '@/types/address';

declare global {
  interface Window {
    google?: any;
    __foroGoogleMapsPromise?: Promise<void>;
  }
}

/** ISO 3166-1 alpha-2 — Google Places `componentRestrictions` */
const SA_COUNTRY_CODE = 'za' as const;

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__foroGoogleMapsPromise) return window.__foroGoogleMapsPromise;

  window.__foroGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps Places'));
    document.head.appendChild(script);
  });

  return window.__foroGoogleMapsPromise;
}

function placeCountryIsSouthAfrica(place: any): boolean {
  const components = place?.address_components ?? [];
  const country = components.find((c: any) => Array.isArray(c.types) && c.types.includes('country'));
  const code = String(country?.short_name ?? '').toUpperCase();
  return code === 'ZA';
}

function parseGooglePlace(place: any): Partial<CreateAddressDto> {
  const components = place?.address_components ?? [];
  const byType = (type: string) => components.find((c: any) => Array.isArray(c.types) && c.types.includes(type));

  const streetNumber = byType('street_number')?.long_name ?? '';
  const route = byType('route')?.long_name ?? '';
  const streetAddress = [streetNumber, route].filter(Boolean).join(' ').trim();
  const suburb = byType('sublocality_level_1')?.long_name ?? byType('neighborhood')?.long_name ?? '';
  const city =
    byType('locality')?.long_name ??
    byType('postal_town')?.long_name ??
    byType('administrative_area_level_2')?.long_name ??
    '';
  const province = byType('administrative_area_level_1')?.long_name ?? '';
  const postalCode = byType('postal_code')?.long_name ?? '';
  const country = byType('country')?.long_name ?? 'South Africa';

  return {
    street_address: streetAddress || place?.formatted_address || '',
    suburb,
    city,
    province,
    postal_code: postalCode,
    country,
  };
}

/**
 * Attaches Google Places (South African addresses) to the input behind
 * `addressLookupRef`. Picking a suggestion calls `onPlace` with the parsed
 * fields and the formatted address; `mapsStatus` is 'failed' when there's no
 * `VITE_GOOGLE_MAPS_API_KEY` or the script won't load.
 */
export function useGooglePlacesAddress(onPlace: (address: Partial<CreateAddressDto>, formatted: string) => void) {
  const [mapsStatus, setMapsStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const googleMapsApiKey = useMemo(() => String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim(), []);
  const addressLookupRef = useRef<HTMLInputElement | null>(null);
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    if (!googleMapsApiKey || !addressLookupRef.current) {
      if (!googleMapsApiKey) setMapsStatus('failed');
      return;
    }

    let autocomplete: any;
    let mounted = true;

    loadGoogleMapsPlaces(googleMapsApiKey)
      .then(() => {
        if (!mounted || !window.google?.maps?.places || !addressLookupRef.current) return;
        autocomplete = new window.google.maps.places.Autocomplete(addressLookupRef.current, {
          fields: ['formatted_address', 'address_components'],
          types: ['address'],
          componentRestrictions: { country: SA_COUNTRY_CODE },
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components?.length) return;
          if (!placeCountryIsSouthAfrica(place)) {
            toast.error('Please choose a South African address');
            return;
          }
          onPlaceRef.current({ ...parseGooglePlace(place), country: 'South Africa' }, place?.formatted_address ?? '');
        });
        setMapsStatus('ready');
      })
      .catch(() => {
        if (mounted) setMapsStatus('failed');
      });

    return () => {
      mounted = false;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [googleMapsApiKey]);

  return { addressLookupRef, mapsStatus };
}
