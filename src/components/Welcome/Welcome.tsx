import { Text } from '@mantine/core';
import BookSelect from '@/components/Navbar/BookSelect';
import Logo from '@/utils/logo';
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
  bookTitle: string | null;
  setBookTitle: (value: string | null) => void;
}

export function Welcome({ bookTitle, setBookTitle }: WelcomeProps) {
  return (
    <div className={classes.welcome}>
      <div className={classes.titleRow}>
        <Logo className={classes.logo} size={54} />
        <Text component="h1" className={classes.title}>
          Welcome to Sanskrit Voyager
        </Text>
      </div>

      <Text className={classes.description}>
        Choose a book to begin reading or use the dictionary lookup. Version 1.3 is here with a speed update. 
      </Text>

      <div className={classes.bookPicker}>
        <BookSelect
          setBookTitle={setBookTitle}
          bookTitle={bookTitle}
          label="Start reading"
          description={null}
          placeholder="Choose a text from GRETIL or SARIT"
        />
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
