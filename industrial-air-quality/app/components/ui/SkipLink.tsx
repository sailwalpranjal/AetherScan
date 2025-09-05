import { ARIA_LABELS } from '@/lib/constants';
import styles from './SkipLink.module.css';

/**
 * Accessible skip link component for keyboard navigation
 * Follows WCAG 2.1 AAA guidelines for accessibility
 */
export function SkipLink(): React.JSX.Element {
  return (
    <a
      href="#main-content"
      className={styles['skipLink']}
      aria-label={ARIA_LABELS.skipToMain}
    >
      {ARIA_LABELS.skipToMain}
    </a>
  );
}