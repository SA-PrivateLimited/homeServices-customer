import React from 'react';
import {EmptyState as PackageEmptyState, type EmptyStateProps} from 'sapvt-ltd-app-packages';

const ICON_GLYPH: Record<string, string> = {
  'person-remove-outline': '👤',
  'people-outline': '👥',
  'document-text-outline': '📄',
  'calendar-outline': '📅',
  'notifications-outline': '🔔',
  'search-outline': '🔍',
  inbox: '📭',
  'inbox-outline': '📭',
};

const EmptyState: React.FC<EmptyStateProps> = ({icon, iconGlyph, ...rest}) => {
  const glyph =
    iconGlyph || (icon ? ICON_GLYPH[icon] || '📭' : undefined);
  return <PackageEmptyState {...rest} iconGlyph={glyph} />;
};

export default EmptyState;
