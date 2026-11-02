import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ToastType = 'success' | 'edit' | 'delete' | 'info' | 'error';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem {
  id: number;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
    });
  };

  const showToast = (options: ToastOptions | string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const item: ToastItem =
      typeof options === 'string'
        ? { id: Date.now(), message: options, type: 'info', duration: 3500 }
        : {
            id: Date.now(),
            title: options.title,
            message: options.message,
            type: options.type || 'info',
            duration: options.duration || 3500,
          };

    setCurrentToast(item);

    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 6,
        speed: 14,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    hideTimerRef.current = setTimeout(() => {
      hideToast();
    }, item.duration);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const toastTheme = useMemo(() => {
    const type = currentToast?.type || 'info';
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle' as const,
          color: '#10B981', // Emerald
          bg: '#142E23',
          border: '#10B981',
          defaultTitle: 'Success',
        };
      case 'edit':
        return {
          icon: 'pencil-circle' as const,
          color: '#38BDF8', // Cyan / Sky blue
          bg: '#122B38',
          border: '#38BDF8',
          defaultTitle: 'Updated',
        };
      case 'delete':
        return {
          icon: 'trash-can-outline' as const,
          color: '#F87171', // Red / Rose
          bg: '#331B1E',
          border: '#F87171',
          defaultTitle: 'Deleted',
        };
      case 'error':
        return {
          icon: 'alert-circle-outline' as const,
          color: '#FB7185',
          bg: '#36181C',
          border: '#FB7185',
          defaultTitle: 'Notice',
        };
      case 'info':
      default:
        return {
          icon: 'information-outline' as const,
          color: '#A78BFA', // Purple
          bg: '#231E33',
          border: '#A78BFA',
          defaultTitle: 'Notification',
        };
    }
  }, [currentToast?.type]);

  const topInset = Math.max(insets.top, 24) + 8;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {currentToast && (
        <Portal>
          <Animated.View
            style={[
              styles.toastContainer,
              {
                top: topInset,
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={hideToast}
              style={[
                styles.toastCard,
                {
                  backgroundColor: toastTheme.bg,
                  borderColor: toastTheme.border,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${toastTheme.color}25` }]}>
                <MaterialCommunityIcons
                  name={toastTheme.icon}
                  size={24}
                  color={toastTheme.color}
                />
              </View>

              <View style={styles.textCol}>
                <Text style={styles.titleText}>
                  {currentToast.title || toastTheme.defaultTitle}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>
                  {currentToast.message}
                </Text>
              </View>

              <TouchableOpacity
                onPress={hideToast}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialCommunityIcons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </Portal>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
