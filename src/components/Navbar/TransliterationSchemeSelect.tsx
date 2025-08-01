import { useState } from 'react';
import { ComboboxItem, Select } from '@mantine/core';

export function TransliterationSchemeSelect() {
  const [value, setValue] = useState<ComboboxItem | null>(null);

  return (
    <Select
      label="Select Translitteration Scheme"
      placeholder="Pick Translitteration Scheme, default is ITRANS"
      data={['IAST', 'ITRANS', 'HK', 'SLP1', 'WX', 'Kolkata', 'Bengali', 'Tamil']}
      style={{ width: 300 }}
      value={value ? value.value : null}
      onChange={(_value, option) => setValue(option)}
    />
  );
}
