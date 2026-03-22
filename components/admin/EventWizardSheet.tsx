import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { PreviewCard } from './PreviewCard';
import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { events as eventsApi } from '@/lib/api';
import type { EventCategory, EventCreatePayload } from '@/types';
import { EVENT_CATEGORY_COLORS, EVENT_CATEGORY_COLORS_DARK } from '@/types';

type RecurringOption = null | 'weekly' | 'monthly';

const CATEGORIES: EventCategory[] = ['lesson', 'lecture', 'quran_school', 'youth', 'sisters', 'community'];

interface EventWizardSheetProps {
  visible: boolean;
  onDismiss: () => void;
  mosqueId: string;
  mosqueName?: string;
  onPublished?: () => void;
}

export const EventWizardSheet = ({
  visible,
  onDismiss,
  mosqueId,
  mosqueName,
  onPublished,
}: EventWizardSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();

  // Wizard step (0-indexed: 0=Basics, 1=DateTime, 2=Details/Preview)
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory>('lesson');
  const [recurring, setRecurring] = useState<RecurringOption>(null);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [t('admin.stepBasics'), t('admin.stepDateTime'), t('admin.stepDetails')];

  const resetForm = useCallback(() => {
    setStep(0);
    setTitle('');
    setDescription('');
    setSpeaker('');
    setEventDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setCategory('lesson');
    setRecurring(null);
    setErrors({});
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  }, []);

  const handleDismiss = useCallback(() => {
    if (title || description) {
      Alert.alert(
        t('common.cancel'),
        t('admin.discardEvent'),
        [
          { text: t('admin.keepEditing'), style: 'cancel' },
          { text: t('admin.discard'), style: 'destructive', onPress: () => { resetForm(); onDismiss(); } },
        ],
      );
    } else {
      resetForm();
      onDismiss();
    }
  }, [title, description, resetForm, onDismiss, t]);

  const validateStep = useCallback((s: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (s === 0) {
      if (!title.trim()) newErrors.title = t('admin.titleRequired');
    }
    if (s === 1) {
      if (!eventDate.trim()) newErrors.eventDate = t('admin.required');
      if (!startTime.trim()) newErrors.startTime = t('admin.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, eventDate, startTime, t]);

  const handleNext = useCallback(() => {
    if (!validateStep(step)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, 2));
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!validateStep(1)) { setStep(1); return; }
    setPublishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const payload: EventCreatePayload = {
        mosque: mosqueId,
        title: title.trim(),
        description: description.trim(),
        speaker: speaker.trim(),
        event_date: eventDate.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim() || null,
        location: location.trim(),
        category,
        recurring,
      };
      await eventsApi.create(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      onDismiss();
      onPublished?.();
    } catch {
      Alert.alert(t('admin.publishError'));
    } finally {
      setPublishing(false);
    }
  }, [validateStep, mosqueId, title, description, speaker, eventDate, startTime, endTime, location, category, recurring, resetForm, onDismiss, onPublished, t]);

  const categoryColors = isDark ? EVENT_CATEGORY_COLORS_DARK : EVENT_CATEGORY_COLORS;

  const recurringOptions: { value: RecurringOption; label: string }[] = [
    { value: null, label: t('admin.eventRecurringNone') },
    { value: 'weekly', label: t('admin.eventRecurringWeekly') },
    { value: 'monthly', label: t('admin.eventRecurringMonthly') },
  ];

  return (
    <BottomSheet visible={visible} onDismiss={handleDismiss} maxHeight="92%">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.title3, { color: colors.text }]}>
            {t('admin.newEvent')}
          </Text>
          {mosqueName && (
            <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              {mosqueName}
            </Text>
          )}
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {steps.map((label, i) => (
            <View key={label} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                {
                  backgroundColor: i <= step ? colors.tint : colors.backgroundGrouped,
                },
              ]}>
                {i < step ? (
                  <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                ) : (
                  <Text style={[typography.caption2, { color: i === step ? colors.onPrimary : colors.textSecondary, fontWeight: '600' }]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                typography.caption1,
                {
                  color: i <= step ? colors.text : colors.textTertiary,
                  fontWeight: i === step ? '600' : '400',
                  marginTop: spacing.xs,
                },
              ]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Step 0: Basics */}
        {step === 0 && (
          <>
            <TextInput
              label={t('admin.eventTitle')}
              value={title}
              onChangeText={(text) => { setTitle(text); if (errors.title) setErrors(({ title: _, ...rest }) => rest); }}
              placeholder={t('admin.eventTitlePlaceholder')}
              error={errors.title}
              maxLength={200}
              returnKeyType="next"
            />
            <TextInput
              label={t('admin.eventDescription')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('admin.eventDescriptionPlaceholder')}
              multiline
              numberOfLines={3}
              style={styles.multilineInput}
              maxLength={2000}
            />
            <TextInput
              label={t('admin.eventSpeaker')}
              value={speaker}
              onChangeText={setSpeaker}
              placeholder={t('admin.eventSpeakerPlaceholder')}
              maxLength={100}
            />
          </>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <>
            {/* Date picker trigger */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.xs }]}>
              {t('admin.eventDate')}
            </Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.backgroundGrouped, borderColor: errors.eventDate ? colors.urgent : colors.cardBorder }]}
              onPress={() => { setShowDatePicker(true); if (errors.eventDate) setErrors(({ eventDate: _, ...rest }) => rest); }}
              accessibilityRole="button"
              accessibilityLabel={t('admin.eventDate')}
            >
              <Ionicons name="calendar-outline" size={18} color={eventDate ? colors.text : colors.textTertiary} />
              <Text style={[typography.body, { color: eventDate ? colors.text : colors.textTertiary, flex: 1, marginStart: spacing.sm }]}>
                {eventDate || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
            {errors.eventDate && (
              <Text style={[typography.caption1, { color: colors.urgent, marginTop: spacing.xs }]}>{errors.eventDate}</Text>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={eventDate ? new Date(eventDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setEventDate(format(selectedDate, 'yyyy-MM-dd'));
                  }
                }}
                themeVariant={effectiveScheme}
              />
            )}

            {/* Start time picker trigger */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.xs, marginTop: spacing.md }]}>
              {t('admin.eventStartTime')}
            </Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.backgroundGrouped, borderColor: errors.startTime ? colors.urgent : colors.cardBorder }]}
              onPress={() => { setShowStartTimePicker(true); if (errors.startTime) setErrors(({ startTime: _, ...rest }) => rest); }}
              accessibilityRole="button"
              accessibilityLabel={t('admin.eventStartTime')}
            >
              <Ionicons name="time-outline" size={18} color={startTime ? colors.text : colors.textTertiary} />
              <Text style={[typography.body, { color: startTime ? colors.text : colors.textTertiary, flex: 1, marginStart: spacing.sm }]}>
                {startTime || 'HH:MM'}
              </Text>
            </TouchableOpacity>
            {errors.startTime && (
              <Text style={[typography.caption1, { color: colors.urgent, marginTop: spacing.xs }]}>{errors.startTime}</Text>
            )}
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime ? (() => { const [h, m] = startTime.split(':'); const d = new Date(); d.setHours(Number(h), Number(m)); return d; })() : new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  setShowStartTimePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setStartTime(format(selectedDate, 'HH:mm'));
                  }
                }}
                themeVariant={effectiveScheme}
              />
            )}

            {/* End time picker trigger */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.xs, marginTop: spacing.md }]}>
              {t('admin.eventEndTime')}
            </Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.backgroundGrouped, borderColor: colors.cardBorder }]}
              onPress={() => setShowEndTimePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('admin.eventEndTime')}
            >
              <Ionicons name="time-outline" size={18} color={endTime ? colors.text : colors.textTertiary} />
              <Text style={[typography.body, { color: endTime ? colors.text : colors.textTertiary, flex: 1, marginStart: spacing.sm }]}>
                {endTime || t('admin.eventEndTimePlaceholder', 'HH:MM (optional)')}
              </Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime ? (() => { const [h, m] = endTime.split(':'); const d = new Date(); d.setHours(Number(h), Number(m)); return d; })() : new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  setShowEndTimePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setEndTime(format(selectedDate, 'HH:mm'));
                  }
                }}
                themeVariant={effectiveScheme}
              />
            )}
            <TextInput
              label={t('admin.eventLocation')}
              value={location}
              onChangeText={setLocation}
              placeholder={t('admin.eventLocationPlaceholder')}
              maxLength={200}
            />

            {/* Recurring selector */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.xs }]}>
              {t('admin.eventRecurring')}
            </Text>
            <View style={styles.chipRow}>
              {recurringOptions.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: recurring === opt.value ? colors.tint : colors.backgroundGrouped,
                    },
                  ]}
                  onPress={() => { setRecurring(opt.value); Haptics.selectionAsync(); }}
                >
                  <Text style={[
                    typography.caption1,
                    {
                      fontWeight: '600',
                      color: recurring === opt.value ? colors.onPrimary : colors.textSecondary,
                    },
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Step 2: Details + Preview */}
        {step === 2 && (
          <>
            {/* Category selector */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.xs }]}>
              {t('admin.eventCategory')}
            </Text>
            <Text style={[typography.caption1, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
              {t('admin.eventCategoryHint')}
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: category === cat
                        ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)')
                        : 'transparent',
                      borderColor: category === cat ? categoryColors[cat] : colors.cardBorder,
                    },
                  ]}
                  onPress={() => { setCategory(cat); Haptics.selectionAsync(); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === cat }}
                >
                  <View style={[styles.categoryDot, { backgroundColor: categoryColors[cat] }]} />
                  <View style={styles.categoryTextCol}>
                    <Text style={[typography.subhead, { color: category === cat ? colors.text : colors.textSecondary, fontWeight: '600' }]}>
                      {t(`events.categories.${cat}`)}
                    </Text>
                    <Text style={[typography.caption2, { color: colors.textTertiary }]}>
                      {t(`admin.categoryDescriptions.${cat}`)}
                    </Text>
                  </View>
                  {category === cat && (
                    <Ionicons name="checkmark-circle" size={18} color={categoryColors[cat]} />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Preview */}
            <PreviewCard
              type="event"
              title={title}
              description={description}
              speaker={speaker}
              eventDate={eventDate}
              startTime={startTime}
              category={category}
              mosqueName={mosqueName}
            />
          </>
        )}

        {/* Navigation buttons */}
        <View style={[styles.buttonRow, { marginTop: spacing['2xl'] }]}>
          {step > 0 && (
            <Button
              title={t('admin.back')}
              variant="ghost"
              onPress={handleBack}
              compact
              style={styles.flex}
            />
          )}
          {step < 2 ? (
            <Button
              title={t('admin.next')}
              variant="primary"
              onPress={handleNext}
              compact
              style={styles.flex}
            />
          ) : (
            <Button
              title={publishing ? t('admin.publishing') : t('admin.publish')}
              variant="primary"
              onPress={handlePublish}
              loading={publishing}
              compact
              style={styles.flex}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  categoryGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryTextCol: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
});
