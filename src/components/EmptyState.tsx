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

type Props = Omit<EmptyStateProps, 'message'> & {message?: string};

const EmptyState: React.FC<Props> = ({icon, iconGlyph, message = '', ...rest}) => {
  const glyph =
    iconGlyph || (icon ? ICON_GLYPH[icon] || '📭' : undefined);
  return <PackageEmptyState {...rest} iconGlyph={glyph} message={message} />;
};

export default EmptyState;
