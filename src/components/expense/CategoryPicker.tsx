import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DEFAULT_CATEGORIES } from '../../constants/categories';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryPickerProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategoryId,
  onSelectCategory,
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Initially show popular 8 categories; when expanded, show all 16
  const displayedCategories = expanded ? DEFAULT_CATEGORIES : DEFAULT_CATEGORIES.slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Category</Text>
          <Text style={styles.subtitle}>Select or let item name auto-detect</Text>
        </View>
        <TouchableOpacity onPress={toggleExpand} style={styles.expandBtn} activeOpacity={0.7}>
          <Text style={styles.expandText}>{expanded ? 'Show Less' : 'View All (16)'}</Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={M3Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Varied staggered multi-row flex-wrap layout */}
      <View style={styles.gridWrap}>
        {displayedCategories.map((cat, index) => {
          const isSelected = cat.id === selectedCategoryId;
          // Organic subtle size & padding variations for a lively, anti-boring staggered tag look
          const isFeatured = index % 3 === 0;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
                isFeatured && styles.chipFeatured,
              ]}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: isSelected ? M3Colors.primary : `${cat.color}22` },
                ]}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={isFeatured ? 17 : 15}
                  color={isSelected ? M3Colors.onPrimary : cat.textColor || cat.color}
                />
              </View>

              <Text
                style={[
                  styles.chipLabel,
                  isSelected ? styles.chipLabelSelected : styles.chipLabelUnselected,
                  isFeatured && styles.chipLabelFeatured,
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>

              {isSelected && (
                <View style={styles.checkBadge}>
                  <MaterialCommunityIcons name="check" size={12} color={M3Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: M3Shapes.spacing.sm,
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headerTitleRow: {
    flex: 1,
  },
  title: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...M3Typography.bodySmall,
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: M3Colors.primaryContainer,
    gap: 2,
  },
  expandText: {
    ...M3Typography.labelSmall,
    color: M3Colors.primary,
    fontWeight: '600',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 20,
    gap: 6,
  },
  chipFeatured: {
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 14,
  },
  chipSelected: {
    backgroundColor: M3Colors.primaryContainer,
    borderColor: M3Colors.primary,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: M3Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  chipUnselected: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderColor: M3Colors.outlineVariant,
    borderWidth: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    ...M3Typography.labelMedium,
    fontSize: 12,
  },
  chipLabelFeatured: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  chipLabelUnselected: {
    color: M3Colors.onSurface,
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
