import { BookOpen, CalendarDays, CheckSquare, Crosshair, Feather, FolderKanban, Gem, Heart, Home, Lightbulb, Package, Settings, Sparkles, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type ModuleDef = { path: string; label: string; icon: LucideIcon; page: LazyExoticComponent<ComponentType> };
export type ModuleGroup = { title: string; modules: ModuleDef[] };

/** Añadir un área nueva es añadir una entrada aquí. */
export const moduleGroups: ModuleGroup[] = [
  {
    title: 'Mi espacio',
    modules: [
      { path: '/overview', label: 'Overview', icon: Home, page: lazy(() => import('./overview')) },
      { path: '/tasks', label: 'Mis tareas', icon: CheckSquare, page: lazy(() => import('./tasks')) },
      { path: '/calendar', label: 'Calendario', icon: CalendarDays, page: lazy(() => import('./calendar')) },
      { path: '/projects', label: 'Proyectos', icon: FolderKanban, page: lazy(() => import('./projects')) },
      { path: '/habits', label: 'Hábitos', icon: Heart, page: lazy(() => import('./habits')) },
      { path: '/focus', label: 'Focus mode', icon: Crosshair, page: lazy(() => import('./focus')) },
    ],
  },
  {
    title: 'Trabajo y negocios',
    modules: [
      { path: '/content', label: 'Taikinsa Studio', icon: UtensilsCrossed, page: lazy(() => import('./content')) },
      { path: '/orders', label: 'Encargos USA', icon: Package, page: lazy(() => import('./orders')) },
      { path: '/brands', label: 'Mis marcas', icon: Gem, page: lazy(() => import('./brands')) },
      { path: '/finance', label: 'Finanzas', icon: Wallet, page: lazy(() => import('./finance')) },
    ],
  },
  {
    title: 'Vida creativa',
    modules: [
      { path: '/creative', label: 'Idea Vault', icon: Lightbulb, page: lazy(() => import('./ideas')) },
      { path: '/model', label: 'Modelaje', icon: Sparkles, page: lazy(() => import('./model')) },
      { path: '/study', label: 'Investigación', icon: BookOpen, page: lazy(() => import('./study')) },
      { path: '/journal', label: 'Mi diario', icon: Feather, page: lazy(() => import('./journal')) },
    ],
  },
  {
    title: 'Sistema',
    modules: [{ path: '/settings', label: 'Configuración', icon: Settings, page: lazy(() => import('./settings')) }],
  },
];

export const allModules = moduleGroups.flatMap((g) => g.modules);
