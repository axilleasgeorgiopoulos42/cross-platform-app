import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { CalendarGrid } from '../../src/components/CalendarGrid';
import { EventItem } from '../../src/components/EventItem';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { Modal } from '../../src/components/Modal';
import { Button } from '../../src/components/Button';
import { useCalendarStore } from '../../src/domains/calendar/store';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing, radius } from '../../src/constants/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function todayTimestamp(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const {
    events,
    selectedDate,
    currentMonth,
    loading,
    loadMonth,
    selectDate,
    addEvent,
    deleteEvent,
    nextMonth,
    prevMonth,
  } = useCalendarStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [time, setTime] = useState('');

  useEffect(() => {
    loadMonth(currentMonth.year, currentMonth.month);
  }, []);

  const today = useMemo(() => todayTimestamp(), []);

  const selectedEvents = useMemo(() => {
    if (selectedDate == null) return [];
    const d = new Date(selectedDate);
    const dayStart = selectedDate;
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
    return events.filter((e) => e.date >= dayStart && e.date <= dayEnd);
  }, [events, selectedDate]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || selectedDate == null) return;
    await addEvent(title.trim(), selectedDate, allDay ? null : time || null);
    setTitle('');
    setTime('');
    setAllDay(true);
    setModalVisible(false);
  }, [title, selectedDate, allDay, time, addEvent]);

  const handleDelete = useCallback(
    (id: string) => deleteEvent(id),
    [deleteEvent],
  );

  const selectedLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={prevMonth} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <Typography variant="h2">
          {MONTHS[currentMonth.month]} {currentMonth.year}
        </Typography>
        <Pressable onPress={nextMonth} hitSlop={8}>
          <Feather name="chevron-right" size={24} color={colors.text} />
        </Pressable>
      </View>

      <CalendarGrid
        year={currentMonth.year}
        month={currentMonth.month}
        events={events}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        today={today}
      />

      {selectedDate != null && (
        <View style={styles.eventSection}>
          <Typography variant="h3">{selectedLabel}</Typography>
          {selectedEvents.length === 0 ? (
            <EmptyState message="No events" icon="calendar" />
          ) : (
            selectedEvents.map((ev) => (
              <EventItem key={ev.id} event={ev} onDelete={handleDelete} />
            ))
          )}
        </View>
      )}

      <FAB
        onPress={() => setModalVisible(true)}
        disabled={selectedDate == null}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Add Event"
      >
        <TextInput
          placeholder="Event title"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        />

        <View style={styles.switchRow}>
          <Typography variant="body">All day</Typography>
          <Switch
            value={allDay}
            onValueChange={setAllDay}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        {!allDay && (
          <TextInput
            placeholder="Time (e.g. 14:30)"
            placeholderTextColor={colors.textSecondary}
            value={time}
            onChangeText={setTime}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />
        )}

        <Button
          title="Save"
          onPress={handleSave}
          disabled={!title.trim()}
          style={styles.saveBtn}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eventSection: {
    marginTop: spacing.lg,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
