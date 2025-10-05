import cx from 'clsx';
import {
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
  Group,
  Button,
} from '@mantine/core';
import {
  IconListSearch,
  IconFileSearch,
  IconDatabaseSearch,
  IconBook,
  IconSearch,
} from '@tabler/icons-react';
import classes from './AdvancedSearchToggle.module.css';
import { useMediaQuery } from '@mantine/hooks';

interface SearchHighlightToggleProps {
  isMobile: boolean | undefined;
  onToggle?: () => void;
}

const SearchHighlightToggle = ({ isMobile, onToggle }: SearchHighlightToggleProps) => {
  return (
    <Group justify="center">
      <Tooltip label="Open Book Search (Ctrl + F)">
        <ActionIcon
          className={classes.actionIcon}
          variant="default"
          size={isMobile ? 'md' : 'lg'}
          aria-label="Toggle in-page search"
          onClick={onToggle}
        >
          <IconFileSearch className={cx(classes.icon)} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

export default SearchHighlightToggle;
