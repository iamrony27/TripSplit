import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DEFAULT_CATEGORIES } from '../../constants/categories';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface CategoryPickerProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Category</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: isSelected ? M3Colors.primary : cat.color },
                ]}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={16}
                  color={isSelected ? M3Colors.onPrimary : M3Colors.onSurface}
                />
              </View>
              <Text
                style={[
                  styles.chipLabel,
                  isSelected ? styles.chipLabelSelected : styles.chipLabelUnselected,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: M3Shapes.spacing.sm,
  },
  header: {
    paddingHorizontal: M3Shapes.spacing.md,
    marginBottom: M3Shapes.spacing.xs,
  },
  title: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: M3Shapes.spacing.md,
    gap: M3Shapes.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: M3Shapes.pill,
    gap: 8,
  },
  chipSelected: {
    backgroundColor: M3Colors.secondaryFixed,
    borderColor: M3Colors.secondary,
    borderWidth: 1,
  },
  chipUnselected: {
    backgroundColor: M3Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: M3Shapes.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    ...M3Typography.labelMd,
  },
  chipLabelSelected: {
    color: M3Colors.onSecondaryFixed,
    fontWeight: '700',
  },
  chipLabelUnselected: {
    color: M3Colors.onSurfaceVariant,
  },
});
