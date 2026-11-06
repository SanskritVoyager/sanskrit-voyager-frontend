import { useState, ReactNode } from 'react';
import { Group, Code, Select, Stack, Textarea, Button, Text } from '@mantine/core';
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
import Logo from '../../utils/logo';
import {
  TRANSLITERATION_SCHEMES,
  TransliterationScheme,
  parseTransliterationScheme,
} from '../../utils/transliterationSchemes';

interface NavbarProps {
  // Updated Props
  isMobile: boolean | undefined;
  isTablet: boolean | undefined;
  isSmallMobile: boolean | undefined;
  isNavbarVisible: boolean;
  setIsNavbarVisible: (value: boolean) => void;
  scheme: TransliterationScheme;
  setScheme: (scheme: TransliterationScheme) => void;
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

  // On mobile the navbar covers the whole viewport, so picking a book should
  // hand the screen over to the reading view. Short delay so the closing Select
  // stays visible long enough to register as feedback.
  const handleBookSelected = () => {
    if (!isMobile) return;
    setTimeout(() => setIsNavbarVisible(false), 300);
  };

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarHeader}>
        <Text className={classes.brandTitle}>Sanskrit Voyager</Text>
        <Logo size={32} className={classes.logo} />
      </div>

      <div className={classes.navbarMain}>
        {/* Content from NavbarSimple moved here */}
        <Stack gap="3px" justify="flex-end">

          
          <Select
            data={TRANSLITERATION_SCHEMES}
            value={scheme}
            label="Select Transliteration Scheme"
            description="Scheme for book text, the analysis tool and dictionary entries"
            placeholder="Pick Transliteration Scheme, default is IAST"
            onChange={(value) => {
              const picked = parseTransliterationScheme(value);
              if (!picked) return;
              setScheme(picked);
              handleTransliteration(text, picked);
            }}
            style={{
              width: '100%',
              paddingTop: '0px',
            }}
          />

          <DictionarySelectComponent
            selectedDictionaries={selectedDictionaries}
            setSelectedDictionaries={setSelectedDictionaries}
          />

          <BookSelect
            setBookTitle={setBookTitle}
            bookTitle={bookTitle}
            onSelect={handleBookSelected}
          />

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
          label="Text Analysis Tool"
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

        {/* Start Reading is mobile-only: on desktop/tablet the floating panel
            overlays the reading view, so the button is redundant. */}
        {isMobile && (text || bookTitle) && (
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
        )}
        

        {/*
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
          Book Search
        </Button>
        */}

        {/*{(isMobile) && (
          <Button
            className={classes.feedbackButton}
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
        )} */}
      </div>

      <div className={classes.navbarFooter}>
        <a className={classes.footerLink} href="/docs/">
          Documentation
        </a>
        <a className={classes.footerLink} href="/docs/about">
          About
        </a>
        <a
          className={classes.footerLink}
          href="https://github.com/SanskritVoyager/sanskrit-voyager-frontend"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}

export default NavbarSimple;