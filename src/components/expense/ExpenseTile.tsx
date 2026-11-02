import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Expense } from '../../types/expense';
import { getCategoryById } from '../../constants/categories';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';

interface ExpenseTileProps {
  expense: Expense;
  currentUserId?: string;
  payerName?: string;
  tripTitle?: string;
  onPress?: () => void;
}

export const ExpenseTile: React.FC<ExpenseTileProps> = ({
  expense,
  currentUserId,
  payerName,
  tripTitle,
  onPress,
}) => {
  const category = getCategoryById(expense.categoryId);
  const isPayer = currentUserId && expense.paidByMemberId === currentUserId;
  const userShare = currentUserId ? expense.shares[currentUserId] || 0 : 0;

  // Formatting date/time display
  const dateStr = expense.expenseDate || new Date(expense.createdAt).toLocaleDateString();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.leftRow}>
        <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
          <MaterialCommunityIcons
            name={category.icon as any}
            size={22}
            color={M3Colors.onSurface}
          />
        </View>

        <View style={styles.textColumn}>
          <Text style={styles.titleText} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {tripTitle ? `${tripTitle} • ` : ''}Paid by {payerName || 'Member'}
          </Text>
        </View>
      </View>

      <View style={styles.rightColumn}>
        <Text
          style={[
            styles.amountText,
            isPayer ? styles.amountPositive : styles.amountNeutral,
          ]}
        >
          {isPayer ? `+${formatCurrency(expense.amount - userShare, expense.originalCurrency)}` : formatCurrency(expense.amount, expense.originalCurrency)}
        </Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: M3Shapes.spacing.md,
    borderRadius: M3Shapes.card,
    backgroundColor: M3Colors.surfaceContainerLow,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: M3Shapes.spacing.md,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: M3Shapes.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  titleText: {
    ...M3Typography.titleSm,
    color: M3Colors.onSurface,
  },
  subtitleText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  rightColumn: {
    alignItems: 'flex-end',
    marginLeft: M3Shapes.spacing.sm,
  },
  amountText: {
    ...M3Typography.titleSm,
    fontWeight: '700',
  },
  amountPositive: {
    color: M3Colors.primary,
  },
  amountNeutral: {
    color: M3Colors.onSurface,
  },
  dateText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
});
