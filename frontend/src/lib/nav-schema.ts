import { LayoutDashboard, CheckSquare, Play, Database, FileText, Activity } from '@lucide/svelte';

export type NavigationItem = {
  title: string;
  href: string;
  icon: any;
  children?: NavigationItem[];
};

export const navigationSchema: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: CheckSquare
  },
  {
    title: 'Processes',
    href: '/processes',
    icon: Play
  },
  {
    title: 'My Processes',
    href: '/process-instances',
    icon: Activity
  },
  {
    title: 'Document Types',
    href: '/document-definitions/types',
    icon: FileText
  },
  {
    title: 'Database',
    href: '/database',
    icon: Database
  }
];
