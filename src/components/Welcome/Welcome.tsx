import { Text } from '@mantine/core';
import Logo from '@/utils/logo';
import { WelcomeSearch } from './WelcomeSearch';
import classes from './Welcome.module.css';

const suggestedTexts = [
  {
    title: 'Pātañjalayogaśāstra',
    href: '/book/patanjalayogasastra_sarit',
  },
  {
    title: 'Madhyāntavibhāgakārikā',
    href: '/book/maitreya-madhyantavibhagakarika',
  },
  {
    title: 'Bhairavastava',
    href: '/book/abhinavagupta-bhairavastava',
  },
];

interface WelcomeProps {
  onLookupWord: (word: string) => void;
  onSearchTexts: (query: string) => void;
}

export function Welcome({ onLookupWord, onSearchTexts }: WelcomeProps) {
  return (
    <div className={classes.welcome}>
      <div className={classes.titleRow}>
        <Logo className={classes.logo} size={54} />
        <Text component="h1" className={classes.title}>
          Welcome to Sanskrit Voyager
        </Text>
      </div>

      <Text className={classes.description}>
        Search for a book to read, a word to look up, or a passage across all texts. Now added
        the Digital Corpus of Sanskrit with translations.
      </Text>

      <div className={classes.searchBox}>
        <WelcomeSearch onLookupWord={onLookupWord} onSearchTexts={onSearchTexts} />
      </div>

      <Text className={classes.suggestedText}>
        Suggested texts:{' '}
        {suggestedTexts.map((text, index) => (
          <span key={text.href}>
            {index > 0 && <span className={classes.separator}> · </span>}
            <a href={text.href} className={classes.suggestedLink}>
              {text.title}
            </a>
          </span>
        ))}
      </Text>

      <Text className={classes.helpText}>
        Need help?{' '}
        <a href="/docs" className={classes.docsLink}>
          Read the docs
        </a>
        .
      </Text>
    </div>
  );
}

export default Welcome;
