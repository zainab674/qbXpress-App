
import React from 'react';
import { Address, NamedAddress } from '../types';

interface AddressSelectorProps {
  /** The entity (customer or vendor) whose addresses to list */
  entity: {
    address?: string;
    BillAddr?: Address;
    ShipAddr?: Address;
    addresses?: NamedAddress[];
    name?: string;
  } | null;
  /** Current address text value */
  value: string;
  /** Called when user picks an address or types manually */
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

/** Format an Address object into a readable string */
function formatAddress(addr: Address | NamedAddress | undefined): string {
  if (!addr) return '';
  const lines = [addr.Line1, addr.Line2, addr.Line3, addr.Line4].filter(Boolean);
  const cityLine = `${addr.City || ''}${addr.City && addr.CountrySubDivisionCode ? ', ' : ''}${addr.CountrySubDivisionCode || ''} ${addr.PostalCode || ''}`.trim();
  if (cityLine) lines.push(cityLine);
  if (addr.Country) lines.push(addr.Country);
  return lines.join('\n');
}

/** Build a list of { label, value } from all entity addresses */
function buildAddressOptions(entity: AddressSelectorProps['entity']): { label: string; value: string }[] {
  if (!entity) return [];
  const opts: { label: string; value: string }[] = [];

  // Legacy flat address
  if (entity.address) {
    opts.push({ label: 'Primary', value: entity.address });
  }

  // Structured BillAddr
  const billFmt = formatAddress(entity.BillAddr);
  if (billFmt && !opts.some(o => o.value === billFmt)) {
    opts.push({ label: 'Billing', value: billFmt });
  }

  // Structured ShipAddr
  const shipFmt = formatAddress(entity.ShipAddr);
  if (shipFmt && !opts.some(o => o.value === shipFmt)) {
    opts.push({ label: 'Shipping', value: shipFmt });
  }

  // Named addresses
  if (entity.addresses?.length) {
    for (const a of entity.addresses) {
      const fmt = formatAddress(a);
      if (fmt && !opts.some(o => o.value === fmt)) {
        opts.push({ label: a.label || 'Other', value: fmt });
      }
    }
  }

  return opts;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({ entity, value, onChange, label, placeholder }) => {
  const options = buildAddressOptions(entity);
  const hasMultiple = options.length > 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</label>
        {hasMultiple && (
          <select
            className="text-[9px] border border-blue-200 rounded px-1.5 py-0.5 bg-blue-50/50 font-bold text-blue-800 outline-none cursor-pointer"
            value={value}
            onChange={e => onChange(e.target.value)}
          >
            {options.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>
      <textarea
        className="w-full border border-gray-200 rounded p-2 text-xs h-20 outline-none focus:ring-1 ring-blue-200 bg-[#fafbfc] italic text-gray-600"
        placeholder={placeholder || 'Address'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};

export { AddressSelector, formatAddress, buildAddressOptions };
export default AddressSelector;
