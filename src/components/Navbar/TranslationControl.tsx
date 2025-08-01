import { useState } from 'react';
import { SegmentedControl } from '@mantine/core';
import classes from './TranslationControl.module.css';

interface TranslationControlProps {
  textType: string;
  setTextType: (value: string) => void;
}

function TranslationControl({ textType, setTextType }: TranslationControlProps) {
  return (
    <SegmentedControl
      fullWidth
      value={textType}
      onChange={setTextType}
      data={[
        { label: 'Translation', value: 'tran' },
        { label: 'Line by Line', value: 'both' },
        { label: 'Original Text', value: 'or' },
      ]}
      classNames={{
        indicator: classes.indicator,
        root: classes.root,
      }}
    />
  );
}

export default TranslationControl;
