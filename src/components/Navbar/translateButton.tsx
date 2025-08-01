import { Button } from '@mantine/core';
import { IconVocabularyOff } from '@tabler/icons-react';

interface TranslateButtonProps {
  text: string;
  updateTranslate: (text: string) => void;
  loading: boolean;
}

const TranslateButton = ({ text, updateTranslate, loading }: TranslateButtonProps) => (
  <Button
    leftSection={<IconVocabularyOff size={14} />}
    onClick={() => updateTranslate(text)}
    loading={loading}
    disabled
    loaderProps={{ type: 'dots' }}
    style={{
      width: '100%',
      backgroundColor: 'transparent',
      color: 'light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-10)',
    }}
  >
    {loading ? 'Loading...' : 'Translate'}
  </Button>
);
