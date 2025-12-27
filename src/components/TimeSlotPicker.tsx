import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import type {TimeSlot} from '../types/consultation';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const renderSlot = ({item}: {item: TimeSlot}) => {
    const isSelected =
      selectedSlot?.startTime === item.startTime &&
      selectedSlot?.endTime === item.endTime;
    const isDisabled = item.isBooked;

    return (
      <TouchableOpacity
        style={[
          styles.slotButton,
          {
            backgroundColor: isSelected
              ? theme.primary
              : isDisabled
              ? theme.border
              : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !isDisabled && onSelectSlot(item)}
        disabled={isDisabled}>
        <Text
          style={[
            styles.slotTime,
            {
              color: isSelected ? '#fff' : isDisabled ? theme.textSecondary : theme.text,
            },
          ]}>
          {item.startTime}
        </Text>
        <Text
          style={[
            styles.slotDivider,
            {
              color: isSelected ? '#fff' : isDisabled ? theme.textSecondary : theme.textSecondary,
            },
          ]}>
          -
        </Text>
        <Text
          style={[
            styles.slotTime,
            {
              color: isSelected ? '#fff' : isDisabled ? theme.textSecondary : theme.text,
            },
          ]}>
          {item.endTime}
        </Text>
      </TouchableOpacity>
    );
  };

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
          No available slots for this date
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        renderItem={renderSlot}
        keyExtractor={(item, index) => `${item.startTime}-${index}`}
        numColumns={3}
        columnWrapperStyle={styles.row}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slotButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  slotDivider: {
    fontSize: 14,
    marginHorizontal: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default TimeSlotPicker;
