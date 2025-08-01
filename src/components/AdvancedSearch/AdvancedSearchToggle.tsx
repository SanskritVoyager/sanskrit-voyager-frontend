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
  IconDatabaseSearch,
  IconBook,
  IconSearch,
  IconFileSearch,
} from '@tabler/icons-react';
import classes from './AdvancedSearchToggle.module.css';
import { useMediaQuery } from '@mantine/hooks';

interface AdvancedSearchToggleProps {
  handleAdvancedSearch: {
    open: () => void;
    close: () => void;
    toggle: () => void;
  };
  isMobile: boolean | undefined;
}

const SearchToggle = ({ isMobile, handleAdvancedSearch }: AdvancedSearchToggleProps) => {
  return (
    <Group justify="center">
      <Tooltip label="Open Book Search (Ctrl + S)">
        <ActionIcon
          className={classes.actionIcon}
          onClick={() => handleAdvancedSearch.toggle()}
          variant="default"
          size={isMobile ? 'md' : 'lg'}
          aria-label="Toggle color scheme"
        >
          <IconListSearch className={cx(classes.icon)} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

export default SearchToggle;
