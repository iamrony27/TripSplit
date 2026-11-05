import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { M3Colors } from '../../theme/colors';
import { M3Typography } from '../../theme/typography';
import { M3Shapes } from '../../theme/shapes';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  initialDate?: string; // Format: YYYY-MM-DD
  title?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseYMD(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return new Date();
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  title = 'Select Date',
}) => {
  const parsedInitial = useMemo(() => parseYMD(initialDate), [initialDate]);

  const [currentYear, setCurrentYear] = useState(parsedInitial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(parsedInitial.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsedInitial.getDate());

  // Reset when opened
  React.useEffect(() => {
    if (visible) {
      const d = parseYMD(initialDate);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  }, [visible, initialDate]);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOffset = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const handleSelectYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setCurrentYear(yest.getFullYear());
    setCurrentMonth(yest.getMonth());
    setSelectedDay(yest.getDate());
  };

  const handleConfirm = () => {
    const chosen = new Date(currentYear, currentMonth, selectedDay);
    onSelectDate(formatYMD(chosen));
    onClose();
  };

  const selectedDateObj = useMemo(() => {
    return new Date(currentYear, currentMonth, selectedDay);
  }, [currentYear, currentMonth, selectedDay]);

  const formattedHeaderDate = useMemo(() => {
    return selectedDateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateObj]);

  const todayStr = useMemo(() => formatYMD(new Date()), []);

  // Calendar cells
  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; dateStr?: string; isToday?: boolean }> = [];
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push({ day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        dateStr: cellDateStr,
        isToday: cellDateStr === todayStr,
      });
    }
    return cells;
  }, [firstDayOffset, daysInMonth, currentYear, currentMonth, todayStr]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>{title.toUpperCase()}</Text>
            <Text style={styles.headerTitle}>{formattedHeaderDate}</Text>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            <TouchableOpacity style={styles.presetChip} onPress={handleSelectToday}>
              <Text style={styles.presetText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={handleSelectYesterday}>
              <Text style={styles.presetText}>Yesterday</Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={M3Colors.onSurface} />
            </TouchableOpacity>

            <Text style={styles.monthNavTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={M3Colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Labels */}
          <View style={styles.daysOfWeekRow}>
            {DAYS_OF_WEEK.map((dw) => (
              <Text key={dw} style={styles.dayOfWeekText}>
                {dw}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.gridContainer}>
            {calendarCells.map((cell, idx) => {
              if (cell.day === null) {
                return <View key={`empty-${idx}`} style={styles.emptyDayCell} />;
              }
              const isSelected = cell.day === selectedDay;
              return (
                <TouchableOpacity
                  key={`day-${cell.day}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    cell.isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDay(cell.day!)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      cell.isToday && !isSelected && styles.dayCellTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Button onPress={onClose} textColor={M3Colors.onSurfaceVariant}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleConfirm} buttonColor={M3Colors.primary}>
              OK
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  style?: any;
  error?: boolean;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  style,
  error,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const displayDate = useMemo(() => {
    if (!value) return '';
    try {
      const d = parseYMD(value);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return value;
    }
  }, [value]);

  return (
    <>
      <TouchableOpacity onPress={() => setModalOpen(true)} activeOpacity={0.8}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayDate ? `${displayDate} (${value})` : ''}
            mode="outlined"
            style={style}
            outlineColor={M3Colors.outlineVariant}
            activeOutlineColor={M3Colors.primary}
            error={error}
            editable={false}
            left={<TextInput.Icon icon="calendar-month" color={M3Colors.primary} />}
            right={<TextInput.Icon icon="chevron-down" color={M3Colors.outline} />}
          />
        </View>
      </TouchableOpacity>

      <DatePickerModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectDate={onChange}
        initialDate={value}
        title={label}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1FAE5',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: M3Colors.surfaceContainerHigh,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: M3Colors.primary,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  monthNavTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: M3Colors.onSurfaceVariant,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  emptyDayCell: {
    width: `${100 / 7}%`,
    height: 38,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: M3Colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: M3Colors.primary,
  },
  dayCellText: {
    fontSize: 14,
    color: M3Colors.onSurface,
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: M3Colors.primary,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: M3Colors.surfaceContainerHigh,
  },
});
