import { MultiSelect } from '@mantine/core';
import { useState } from 'react';

interface DictionarySelectProps {
  selectedDictionaries: string[];
  setSelectedDictionaries: React.Dispatch<React.SetStateAction<string[]>>;
}

const DictionarySelectComponent = ({
  selectedDictionaries,
  setSelectedDictionaries,
}: DictionarySelectProps) => {
  const handleChange = (values: string[]) => {
    setSelectedDictionaries(values); // Directly update the parent state
    console.log(values);
  };

  return (
    <MultiSelect
      label="Dictionary"
      description="Select dictionaries"
      placeholder="Select dictionaries"
      data={[
        {
          group: 'Sanskrit-English',
          items: [
            { value: 'mw', label: 'Monier-Williams Sanskrit-English Dictionary' },
            { value: 'ap90', label: 'Apte Practical Sanskrit-English Dictionary' },
            { value: 'cae', label: 'Cappeller Sanskrit-English Dictionary' },
          ],
        },
        {
          group: 'Sanskrit-Concise',
          items: [{ value: 'ddsa', label: 'Macdonell A Practical Sanskrit Dictionary' }],
        },
        {
          group: 'Sanskrit-German',
          items: [{ value: 'gra', label: 'Grassmann Wörterbuch zum Rig Veda' }],
        },
        {
          group: 'Specialized Dictionaries',
          items: [{ value: 'bhs', label: 'Edgerton Buddhist Hybrid Sanskrit Dictionary' }],
        },
        //{
        //  group: 'Sanskrit to Sanskrit',
        //  items: [
        //    { value: 'armh', label: 'Abhidhānaratnamālā of Halāyudha' },
        //    { value: 'abch', label: 'Abhidhānacintāmaṇi of Hemacandrācārya' },
        //  ]
        //  },

        {
          group: 'Pali Dictionaries',
          items: [{ value: 'cped', label: 'Concise Pali English Dictionary' }],
        },
      ]}
      value={selectedDictionaries} // Bind the parent state
      onChange={handleChange} // Update state on change
      style={{ width: '100%', paddingTop: '0px', paddingBottom: '0px' }}
      styles={{
        input: {
          display: 'flex',
          alignItems: 'center', // Center the placeholder text vertically
          height: 'auto', // Ensure the height is auto to adjust to content
          width: '100%', // Ensure the width is 100% to fill the container
        },
      }}
    />
  );
};

export default DictionarySelectComponent;
