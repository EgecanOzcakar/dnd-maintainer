import { useTranslation } from 'react-i18next';
import { DND_CLASSES, type ClassId } from '@/lib/dnd-helpers';

const isClassId = (value: string): value is ClassId => DND_CLASSES.some((c) => c.id === value);

/** Translates a stored class id to its display name; unknown values (legacy free text) pass through. */
export function useClassLabel(): (classId: string | null | undefined) => string {
  const { t } = useTranslation('gamedata');
  return (classId) => (classId && isClassId(classId) ? t(`classes.${classId}`) : (classId ?? ''));
}
