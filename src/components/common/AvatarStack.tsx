import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { TripMember } from '../../types/trip';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface AvatarStackProps {
  members: TripMember[];
  maxVisible?: number;
  size?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  maxVisible = 3,
  size = 28,
}) => {
  const visible = members.slice(0, maxVisible);
  const remaining = Math.max(0, members.length - maxVisible);

  return (
    <View style={styles.container}>
      {visible.map((m, index) => (
        <View
          key={m.id || index}
          style={[
            styles.avatarWrapper,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: index === 0 ? 0 : -8,
            },
          ]}
        >
          {m.photoUrl ? (
            <Image source={{ uri: m.photoUrl }} style={styles.image} />
          ) : (
            <View
              style={[
                styles.fallback,
                { backgroundColor: M3Colors.primaryFixed },
              ]}
            >
              <Text style={styles.initialText}>
                {m.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ))}

      {remaining > 0 && (
        <View
          style={[
            styles.avatarWrapper,
            styles.moreBadge,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -8,
            },
          ]}
        >
          <Text style={styles.moreText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: M3Colors.surfaceContainerLowest,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    ...M3Typography.labelSm,
    color: M3Colors.onPrimaryFixed,
    fontWeight: '700',
  },
  moreBadge: {
    backgroundColor: M3Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    ...M3Typography.labelSm,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 10,
  },
});
