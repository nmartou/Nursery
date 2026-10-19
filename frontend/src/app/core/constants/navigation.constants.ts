import type { NavigationItem } from '../models/navigation-item.model';

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Accueil', route: '/accueil', icon: '🏠' },
  { label: 'Inscriptions', route: '/inscriptions', icon: '🧒' },
  { label: 'Rapports du jour', route: '/rapports', icon: '📋' },
];
