import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';
import { formatCurrency } from '../../services/currency/exchangeRateService';

interface StatusBadgeProps {
  amount: number; // positive = owed to user, negative = user owes, 0 = settled
  currency?: string;
  variant?: 'compact' | 'expanded';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  amount,
  currency = 'INR',
  variant = 'compact',
}) => {
  const isCredit = amount > 0.009;
  const isDebit = amount < -0.009;

  let bg: string = M3Colors.settledContainer;
  let textColor: string = M3Colors.settled;
  let iconName: any = 'check-circle';
  let label = 'All Settled';

  if (isCredit) {
    bg = M3Colors.creditContainer;
    textColor = M3Colors.onCreditContainer;
    iconName = 'arrow-down';
    label = variant === 'expanded' ? `+${formatCurrency(amount, currency)} you get back` : `Owed ${formatCurrency(amount, currency)}`;
  } else if (isDebit) {
    bg = M3Colors.debitContainer;
    textColor = M3Colors.onDebitContainer;
    iconName = 'arrow-up';
    label = variant === 'expanded' ? `You owe ${formatCurrency(Math.abs(amount), currency)}` : `Owe ${formatCurrency(Math.abs(amount), currency)}`;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={iconName} size={14} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: M3Shapes.pill,
    gap: 3,
    alignSelf: 'flex-start',
  },
  text: {
    ...M3Typography.labelSm,
    fontWeight: '600',
  },
});
