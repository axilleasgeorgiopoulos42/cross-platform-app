import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { EventForm, type EventFormValues } from '../../src/components/EventForm';
import { Typography } from '../../src/components/Typography';
import { useCalendarStore } from '../../src/domains/calendar/store';
import type { CalendarEvent } from '../../src/domains/calendar/types';
import { confirmAction } from '../../src/lib/confirm';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/constants/theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const fetchEvent = useCalendarStore((s) => s.fetchEvent);
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const found = id ? await fetchEvent(id) : null;
      if (cancelled) return;
      setEvent(found);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchEvent]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/calendar');
  }, []);

  const finish = () => {
    const err = useCalendarStore.getState().error;
    if (err) setErrorMsg(err);
    else router.back();
  };

  const handleSave = async (values: EventFormValues) => {
    if (!event) return;
    setErrorMsg(null);
    useCalendarStore.setState({ error: null });
    await updateEvent(event.id, values);
    finish();
  };

  const handleDelete = async () => {
    if (!event) return;
    const ok = await confirmAction('Delete event', 'This cannot be undone.', 'Delete');
    if (!ok) return;
    setErrorMsg(null);
    useCalendarStore.setState({ error: null });
    await deleteEvent(event.id);
    finish();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <EmptyState message="Not found" icon="alert-circle" />
        <Button title="Go back" onPress={goBack} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <EventForm
        key={event.id}
        initial={{ title: event.title, time: event.time, notes: event.notes }}
        submitLabel="Save"
        onSubmit={handleSave}
        resetOnSubmit={false}
      />
      {errorMsg ? (
        <Typography variant="caption" style={{ color: colors.destructive }}>
          {errorMsg}
        </Typography>
      ) : null}
      <Button title="Delete" variant="destructive" onPress={handleDelete} style={styles.delete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { flex: 1, padding: spacing.md },
  content: { padding: spacing.md, gap: spacing.md },
  delete: { marginTop: spacing.sm },
});
