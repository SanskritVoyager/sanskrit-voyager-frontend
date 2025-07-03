import { useState, ReactNode } from 'react';
import { Group, Code, Select, Stack, Textarea, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBellRinging,
  IconFingerprint,
  IconKey,
  IconSettings,
  Icon2fa,
  IconDatabaseImport,
  IconReceipt2,
  IconSwitchHorizontal,
  IconLogout,
  IconVocabularyOff,
  IconSettingsSearch,
  IconMessageCircle,
} from '@tabler/icons-react';
import classes from './NavbarSimple.module.css'; // You might need to adjust the CSS import

// Assuming these components and functions are defined elsewhere
import DictionarySelectComponent from './DictionarySelect';
import BookSelect from './BookSelect';
import TranslationControl from './TranslationControl';

interface NavbarProps {
  // Updated Props
  isMobile: boolean | undefined;
  isTablet: boolean | undefined;
  isSmallMobile: boolean | undefined;
  isNavbarVisible: boolean;
  setIsNavbarVisible: (value: boolean) => void;
  scheme: { value: string }; // Assuming scheme is an object with a value property
  setScheme: (value: any) => void;
  handleTransliteration: (text: string, value?: string) => void;
  text: string;
  setText: (value: string) => void;
  selectedDictionaries: any[]; // Replace 'any' with the actual type of selectedDictionaries
  setSelectedDictionaries: React.Dispatch<React.SetStateAction<string[]>>;
  bookTitle: string | null;
  setBookTitle: (value: string | null) => void;
  textType: string;
  setTextType: (value: string) => void;

  handleAdvancedSearch: {
    open: () => void;
    close: () => void;
    toggle: () => void;
  };
}

export function NavbarSimple({
  isMobile,
  isTablet,
  isSmallMobile,
  isNavbarVisible,
  setIsNavbarVisible,
  scheme,
  setScheme,
  handleTransliteration,
  text,
  setText,
  selectedDictionaries,
  setSelectedDictionaries,
  bookTitle,
  setBookTitle,
  textType,
  setTextType,
  handleAdvancedSearch,
}: NavbarProps) {
  const [active, setActive] = useState('Billing');

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        {/*<Group className={classes.header} justify="space-between">
          <Code fw={700}>Sanskrit Reader</Code>
        </Group>*/}

        {/* Content from NavbarSimple moved here */}
        <Stack gap="3px" justify="flex-end">
          <Select
            data={[
              { value: 'IAST', label: 'Romanic (IAST)' },
              { value: 'DEVANAGARI', label: 'Devanagari' },
              { value: 'HK', label: 'Harvard-Kyoto (HK)' },
              { value: 'SLP1', label: 'SLP1 (Sanskrit Library Phonetic)' },
              { value: 'Tamil', label: 'Tamil' },
              { value: 'Kolkata', label: 'Kolkata' },
              { value: 'Bengali', label: 'Bengali' },
              { value: 'Kannada', label: 'Kannada' },
              { value: 'WX', label: 'WX' },
              { value: 'ITRANS', label: 'ITRANS' },
            ]}
            value={scheme.value}
            label="Select Transliteration Scheme"
            placeholder="Pick Transliteration Scheme, default is IAST"
            onChange={(_value, option) => {
              setScheme(option);
              handleTransliteration(text, _value ?? undefined);
            }}
            style={{
              width: '100%',
              paddingTop: isSmallMobile ? '30px' : '60px',
            }}
          />

          <DictionarySelectComponent
            selectedDictionaries={selectedDictionaries}
            setSelectedDictionaries={setSelectedDictionaries}
          />

          <BookSelect setBookTitle={setBookTitle} bookTitle={bookTitle} />

          {bookTitle !== null && (
            <TranslationControl textType={textType} setTextType={setTextType} />
          )}
        </Stack>

        <Textarea
          value={text}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onInput={(event) => {
            const newText = event.currentTarget.value;
            setText(newText);
            handleTransliteration(newText);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pastedData = event.clipboardData.getData('text');
            setText(pastedData);
            handleTransliteration(pastedData);
          }}
          label="Write Text Here"
          description="Copy and paste text here to transliterate it."
          placeholder={
            'Write text here to transliterate it.' +
            '\n' +
            'A single word is automatically searched.' +
            '\n' +
            'Analyse words on click.'
          }
          style={{ width: '100%', paddingBottom: 16, paddingTop: '0px' }}
          autosize
          minRows={6}
          maxRows={8}
        />

        <Button
          className={classes.readingButton}
          leftSection={<IconVocabularyOff size={14} />}
          onClick={() => setIsNavbarVisible(false)}
          loaderProps={{ type: 'dots' }}
          style={{
            width: '100%',
          }}
        >
          Start Reading
        </Button>

        <Button
          className={classes.advancedSearchButton}
          fullWidth
          mt="sm"
          leftSection={
            <IconSettingsSearch className={classes.advancedSearchIcon} size={18} stroke={1.5} />
          }
          onClick={() => {
            handleAdvancedSearch.toggle();
          }}
          justify="left"
        >
          Corpus Search
        </Button>

        <Button
          component="a"
          href="https://forms.gle/tsMiRceuVK5c42MT7"
          target="_blank"
          rel="noopener noreferrer"
          fullWidth
          mt="sm"
          variant="subtle"
          leftSection={<IconMessageCircle size={18} stroke={1.5} />}
          justify="left"
        >
          Provide Feedback
        </Button>
      </div>
    </nav>
  );
}

export default NavbarSimple;
