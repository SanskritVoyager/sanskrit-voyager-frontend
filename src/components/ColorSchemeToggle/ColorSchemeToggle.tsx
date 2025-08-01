import cx from 'clsx';
import {
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Group,
  Button,
} from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import classes from './ColorSchemeToggle.module.css';
import { useMediaQuery } from '@mantine/hooks';

export function ActionToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isMobile = useMediaQuery('(max-width: 755px)');

  return (
    <Group justify="center">
      <ActionIcon
        className={classes.actionIcon}
        onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
        variant="default"
        size={isMobile ? 'md' : 'lg'}
        aria-label="Toggle color scheme"
      >
        <IconSun className={cx(classes.icon, classes.light)} stroke={1.5} />
        <IconMoon className={cx(classes.icon, classes.dark)} stroke={1.5} />
      </ActionIcon>
    </Group>
  );
}

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Group justify="center" mt="xl">
      <Button onClick={() => setColorScheme('light')}>Light</Button>
      <Button onClick={() => setColorScheme('dark')}>Dark</Button>
      <Button onClick={() => setColorScheme('auto')}>Auto</Button>
    </Group>
  );
}
