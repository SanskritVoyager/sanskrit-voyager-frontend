import { Text } from '@mantine/core';
import BookSelect from '@/components/Navbar/BookSelect';
import Logo from '@/utils/logo';
import classes from './Welcome.module.css';

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
        Choose a book to begin reading. Dictionary lookup is always available in the search bar.
      </Text>

      <div className={classes.bookPicker}>
        <BookSelect
          setBookTitle={setBookTitle}
          bookTitle={bookTitle}
          label="Start reading"
          placeholder="Choose a book"
        />
      </div>

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
