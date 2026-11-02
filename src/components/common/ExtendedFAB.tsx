import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface ExtendedFABProps {
  label: string;
  iconName?: any;
  onPress: () => void;
  style?: object;
}

export const ExtendedFAB: React.FC<ExtendedFABProps> = ({
  label,
  iconName = 'plus',
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.fab, style]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons name={iconName} size={22} color={M3Colors.onPrimary} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50,
  },
  label: {
    ...M3Typography.labelLg,
    color: M3Colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
