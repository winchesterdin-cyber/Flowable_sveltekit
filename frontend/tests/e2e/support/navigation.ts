import { navigationSchema } from '../../../src/lib/nav-schema';

export type NavigationEntry = {
  title: string;
  href: string;
};

export const getNavigationEntries = (): NavigationEntry[] =>
  navigationSchema.map(({ title, href }) => ({
    title,
    href
  }));
