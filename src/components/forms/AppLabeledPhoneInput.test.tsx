import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLabeledPhoneInput from './AppLabeledPhoneInput';

describe('AppLabeledPhoneInput', () => {
  it('shows the South African flag and dial code by default', () => {
    render(<AppLabeledPhoneInput label="Phone" value="" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /27/ })).toHaveTextContent('🇿🇦');
    expect(screen.getByRole('button', { name: /27/ })).toHaveTextContent('+27');
  });

  it('emits an international number and rejects a short one after blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppLabeledPhoneInput label="Phone" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Phone'), '210125184');
    expect(onChange).toHaveBeenLastCalledWith('+27210125184');

    await user.clear(screen.getByLabelText('Phone'));
    await user.type(screen.getByLabelText('Phone'), '123');
    await user.tab();
    expect(screen.getByText('Enter 9 digits for South Africa')).toBeInTheDocument();
  });

  it('switches country from the picker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppLabeledPhoneInput label="Phone" value="+27210125184" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /27/ }));
    await user.type(screen.getByLabelText('Search countries'), 'united kingdom');
    await user.click(screen.getByRole('button', { name: /United Kingdom/ }));

    expect(screen.getByRole('button', { name: /44/ })).toHaveTextContent('🇬🇧');
    expect(onChange).toHaveBeenCalledWith('+44210125184');
  });
});
