import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Typography } from '../../src/components/Typography';
import { MonthSwitcher } from '../../src/components/MonthSwitcher';
import { CalendarGrid } from '../../src/components/CalendarGrid';
import { EventItem } from '../../src/components/EventItem';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchBar } from '../../src/components/SearchBar';
import { FAB } from '../../src/components/FAB';
import { Modal } from '../../src/components/Modal';
import { EventForm, type EventFormValues } from '../../src/components/EventForm';
import { useCalendarStore } from '../../src/domains/calendar/store';
import { searchEvents } from '../../src/domains/calendar/search';
import { useTheme } from '../../src/hooks/useTheme';
import { useSwipe } from '../../src/hooks/useSwipe';
import { useTodayStart } from '../../src/hooks/useTodayStart';
import { startOfDay } from '../../src/lib/dates';
import { spacing } from '../../src/constants/theme';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const {
    events,
    allEvents,
    loadAllForSearch,
    selectedDate,
    currentMonth,
    loadMonth,
    selectDate,
    addEvent,
    deleteEvent,
    nextMonth,
    prevMonth,
  } = useCalendarStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Mount-only load of whichever month the store currently holds.
    const s = useCalendarStore.getState();
    s.loadMonth(s.currentMonth.year, s.currentMonth.month);
  }, []);

  const today = useTodayStart();

  const panHandlers = useSwipe({ onLeft: nextMonth, onRight: prevMonth });

  const jumpToToday = useCallback(() => {
    const now = new Date();
    loadMonth(now.getFullYear(), now.getMonth());
    selectDate(startOfDay(now.getTime()));
  }, [loadMonth, selectDate]);

  const selectedEvents = useMemo(() => {
    if (selectedDate == null) return [];
    const d = new Date(selectedDate);
    const dayStart = selectedDate;
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
    return events.filter((e) => e.date >= dayStart && e.date <= dayEnd);
  }, [events, selectedDate]);

  const toggleSearch = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setQuery('');
    } else {
      setSearchOpen(true);
      loadAllForSearch();
    }
  }, [searchOpen, loadAllForSearch]);

  const searching = searchOpen && query.trim() !== '';
  const results = useMemo(
    () => (searching ? searchEvents(allEvents, query) : []),
    [searching, allEvents, query],
  );

  const handleSave = useCallback(
    async (values: EventFormValues) => {
      await addEvent(values.title, values.date, values.time, values.notes);
      setModalVisible(false);
    },
    [addEvent],
  );

  const handleDelete = useCallback((id: string) => deleteEvent(id), [deleteEvent]);

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
        <MonthSwitcher
          year={currentMonth.year}
          month={currentMonth.month}
          onPrev={prevMonth}
          onNext={nextMonth}
        />
        <Pressable
          onPress={jumpToToday}
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          style={styles.todayBtn}
        >
          <Typography variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            Today
          </Typography>
        </Pressable>
        <Pressable
          onPress={toggleSearch}
          accessibilityRole="button"
          accessibilityLabel="Search events"
          style={styles.iconBtn}
        >
          <Feather
            name="search"
            size={20}
            color={searchOpen ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      </View>

      {searchOpen && (
        <View style={styles.searchBar}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search events" autoFocus />
        </View>
      )}

      {searching ? (
        <View style={styles.eventSection}>
          {results.length === 0 ? (
            <EmptyState message="No matching events" icon="search" />
          ) : (
            results.map((ev) => (
              <EventItem key={ev.id} event={ev} onDelete={handleDelete} showDate />
            ))
          )}
        </View>
      ) : (
        <>
          <View {...panHandlers}>
            <CalendarGrid
              year={currentMonth.year}
              month={currentMonth.month}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={selectDate}
              today={today}
            />
          </View>

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
        </>
      )}

      {!searching && <FAB onPress={() => setModalVisible(true)} disabled={selectedDate == null} />}

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Add Event">
        <EventForm
          initial={{ date: selectedDate ?? undefined }}
          submitLabel="Save"
          onSubmit={handleSave}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  todayBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  eventSection: {
    marginTop: spacing.lg,
    flex: 1,
  },
});
