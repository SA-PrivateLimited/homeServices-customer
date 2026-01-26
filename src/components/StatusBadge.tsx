import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {ConsultationStatus} from '../types/common';

interface StatusBadgeProps {
  status: ConsultationStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({status}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'scheduled':
        return '#2196F3'; // Blue
      case 'ongoing':
        return '#FF9800'; // Orange
      case 'completed':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#757575'; // Gray
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const backgroundColor = getStatusColor();

  return (
    <View style={[styles.badge, {backgroundColor}]}>
      <Text style={styles.text}>{getStatusLabel()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;
