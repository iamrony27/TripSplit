import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedPillsProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  containerStyle?: object;
}

export function SegmentedPills<T extends string>({
  options,
  selectedValue,
  onSelect,
  containerStyle,
}: SegmentedPillsProps<T>) {
  return (
    <View style={[styles.container, containerStyle]}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.pill,
              isSelected ? styles.pillSelected : styles.pillUnselected,
            ]}
            activeOpacity={0.7}
          >
            {option.icon}
            <Text
              style={[
                styles.label,
                isSelected ? styles.labelSelected : styles.labelUnselected,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.pill,
    padding: 3,
    alignItems: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: M3Shapes.pill,
    gap: 4,
  },
  pillSelected: {
    backgroundColor: M3Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillUnselected: {
    backgroundColor: 'transparent',
  },
  label: {
    ...M3Typography.labelMd,
    textAlign: 'center',
  },
  labelSelected: {
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  labelUnselected: {
    color: M3Colors.onSurfaceVariant,
    fontWeight: '500',
  },
});
