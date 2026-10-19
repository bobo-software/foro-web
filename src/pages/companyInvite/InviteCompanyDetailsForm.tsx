import { useState, type FormEvent } from 'react';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import { CompanyAddressFields } from '@/pages/admin/companies/CompanyAddressFields';
import { useGooglePlacesAddress } from '@/hooks/useGooglePlacesAddress';
import type { CreateAddressDto } from '@/types/address';
import type { InviteCompanyDetails } from '@/services/companyInviteService';
import { PRIMARY_BUTTON } from './companyInviteShared';

interface Props {
  email: string;
  defaultContactName?: string;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (details: InviteCompanyDetails) => void;
}

/** The recipient's own company details — name, contact, registration numbers and address. */
export function InviteCompanyDetailsForm({ email, defaultContactName = '', submitting, submitLabel, onSubmit }: Props) {
  const [contactName, setContactName] = useState(defaultContactName);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [errors, setErrors] = useState<{ contactName?: string; name?: string }>({});
  const [addressLookup, setAddressLookup] = useState('');
  const [addressForm, setAddressForm] = useState<Partial<CreateAddressDto>>({ country: 'South Africa' });
  const { addressLookupRef, mapsStatus } = useGooglePlacesAddress((parsed, formatted) => {
    setAddressLookup(formatted);
    setAddressForm((prev) => ({ ...prev, ...parsed }));
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      contactName: contactName.trim() ? undefined : 'Enter your name',
      name: name.trim() ? undefined : 'Enter your company name',
    };
    setErrors(nextErrors);
    if (nextErrors.contactName || nextErrors.name) return;
    onSubmit({
      contact_name: contactName,
      name,
      phone,
      vat_number: vatNumber,
      registration_number: registrationNumber,
      address: {
        street_address: addressForm.street_address,
        street_address_2: addressForm.street_address_2,
        suburb: addressForm.suburb,
        town: addressForm.town,
        city: addressForm.city,
        province: addressForm.province,
        country: addressForm.country,
        postal_code: addressForm.postal_code,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInputLabeled
            id="invite_contact_name"
            label="Your full name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            error={errors.contactName}
            autoComplete="name"
            required
          />
          <AppInputLabeled id="invite_email" label="Email" type="email" value={email} onChange={() => {}} disabled />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your company</h2>
        <AppInputLabeled
          id="invite_company_name"
          label="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="organization"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInputLabeled
            id="invite_phone"
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <AppInputLabeled
            id="invite_vat"
            label="VAT number"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
          />
          <AppInputLabeled
            id="invite_registration"
            label="Registration number"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Address <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
        </h2>
        <CompanyAddressFields
          addressLookup={addressLookup}
          onAddressLookupChange={setAddressLookup}
          addressLookupRef={addressLookupRef}
          mapsStatus={mapsStatus}
          addressForm={addressForm}
          onAddressFieldChange={(key, value) => setAddressForm((prev) => ({ ...prev, [key]: value }))}
          disabled={submitting}
        />
      </section>

      <button type="submit" disabled={submitting} className={`w-full ${PRIMARY_BUTTON}`}>
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
