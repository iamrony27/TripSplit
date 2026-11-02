import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Searchbar, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTrips } from '../../src/context/TripContext';
import { useAuth } from '../../src/context/AuthContext';
import { TopAppBar } from '../../src/components/common/TopAppBar';
import { AvatarStack } from '../../src/components/common/AvatarStack';
import { M3Colors } from '../../src/theme/colors';
import { M3Typography } from '../../src/theme/typography';
import { M3Shapes } from '../../src/theme/shapes';
import { formatCurrency } from '../../src/services/currency/exchangeRateService';

export default function TripsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { trips, activeTripId, setActiveTripId, deleteTrip } = useTrips();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrips = trips.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteTrip = (tripId: string, title: string) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${title}"? This will permanently delete all associated expenses and records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(tripId);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete trip.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="My Trips"
        subtitle="TripSplit"
        avatarUrl={user?.photoUrl}
        onProfilePress={() => router.push('/(tabs)/profile')}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search trips..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor={M3Colors.primary}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="wallet-travel" size={56} color={M3Colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No trips match your search' : 'No trips yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different keyword'
                : 'Create a trip to start sharing expenses with friends.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                onPress={() => router.push('/trip/create')}
                style={styles.createBtn}
              >
                <MaterialCommunityIcons name="plus" size={20} color={M3Colors.onPrimary} />
                <Text style={styles.createBtnText}>Create First Trip</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTrips.map((trip) => {
            const isActive = trip.id === activeTripId;
            return (
              <TouchableOpacity
                key={trip.id}
                onPress={() => {
                  setActiveTripId(trip.id);
                  router.push({ pathname: '/trip/[id]', params: { id: trip.id } });
                }}
                style={[styles.tripCard, isActive && styles.tripCardActive]}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    {trip.description ? (
                      <Text style={styles.cardDesc} numberOfLines={1}>
                        {trip.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyText}>{trip.baseCurrency || 'INR'}</Text>
                  </View>
                </View>

                <View style={styles.cardSpendRow}>
                  <View>
                    <Text style={styles.spendLabel}>TOTAL SPEND</Text>
                    <Text style={styles.spendAmount}>
                      {formatCurrency(trip.totalSpend || 0, trip.baseCurrency || 'INR')}
                    </Text>
                  </View>

                  {isActive ? (
                    <View style={styles.activePill}>
                      <MaterialCommunityIcons name="check-circle" size={14} color={M3Colors.primary} />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setActiveTripId(trip.id)}
                      style={styles.makeActiveBtn}
                    >
                      <Text style={styles.makeActiveText}>Set Active</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.membersRow}>
                    <AvatarStack members={trip.members} maxVisible={3} size={26} />
                    <Text style={styles.membersCountText}>
                      {trip.members.length} {trip.members.length === 1 ? 'member' : 'members'}
                    </Text>
                  </View>

                  <View style={styles.footerActions}>
                    <TouchableOpacity
                      onPress={() => handleDeleteTrip(trip.id, trip.title)}
                      style={styles.deleteIconBtn}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={M3Colors.error} />
                    </TouchableOpacity>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={M3Colors.onSurfaceVariant} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="New Trip"
        onPress={() => router.push('/trip/create')}
        style={styles.fab}
        color={M3Colors.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  searchContainer: {
    paddingHorizontal: M3Shapes.spacing.md,
    paddingVertical: 8,
  },
  searchbar: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.pill,
    elevation: 0,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    height: 48,
  },
  searchInput: {
    minHeight: 0,
    ...M3Typography.bodyMedium,
  },
  scrollContent: {
    padding: M3Shapes.spacing.md,
    paddingBottom: 96,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 8,
  },
  emptyTitle: {
    ...M3Typography.titleMd,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  emptySubtitle: {
    ...M3Typography.bodyMedium,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: M3Shapes.pill,
    marginTop: 12,
  },
  createBtnText: {
    ...M3Typography.labelMd,
    color: M3Colors.onPrimary,
    fontWeight: '700',
  },
  tripCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.cardLarge,
    padding: M3Shapes.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tripCardActive: {
    borderColor: M3Colors.primary,
    backgroundColor: M3Colors.surfaceContainerLowest,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    ...M3Typography.titleMedium,
    color: M3Colors.onSurface,
    fontWeight: '700',
  },
  cardDesc: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  currencyBadge: {
    backgroundColor: M3Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: M3Shapes.pill,
  },
  currencyText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  cardSpendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  spendLabel: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spendAmount: {
    ...M3Typography.headlineSm,
    color: M3Colors.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: M3Colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.pill,
  },
  activePillText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  makeActiveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.pill,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  makeActiveText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    paddingTop: 10,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membersCountText: {
    ...M3Typography.bodySm,
    color: M3Colors.onSurfaceVariant,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteIconBtn: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: M3Colors.primary,
    borderRadius: M3Shapes.pill,
  },
});
