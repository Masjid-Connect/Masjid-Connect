import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { PreviewCard } from './PreviewCard';
import { getColors, getAlpha, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/Theme';
import { announcements as announcementsApi } from '@/lib/api';
import type { AnnouncementCreatePayload } from '@/types';

type Priority = 'normal' | 'urgent' | 'janazah';

type ExpiryOption = 'never' | '24h' | '3d' | '7d';

const EXPIRY_MAP: Record<ExpiryOption, number | null> = {
  never: null,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

interface QuickPostSheetProps {
  visible: boolean;
  onDismiss: () => void;
  mosqueId: string;
  mosqueName?: string;
  onPublished?: () => void;
}

export const QuickPostSheet = ({
  visible,
  onDismiss,
  mosqueId,
  mosqueName,
  onPublished,
}: QuickPostSheetProps) => {
  const { effectiveScheme } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const alphaColors = getAlpha(effectiveScheme);
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [expiry, setExpiry] = useState<ExpiryOption>('never');
  const [showPreview, setShowPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const resetForm = useCallback(() => {
    setTitle('');
    setBody('');
    setPriority('normal');
    setExpiry('never');
    setShowPreview(false);
    setErrors({});
  }, []);

  const handleDismiss = useCallback(() => {
    if (title || body) {
      Alert.alert(
        t('common.cancel'),
        t('admin.discardAnnouncement'),
        [
          { text: t('admin.keepEditing'), style: 'cancel' },
          { text: t('admin.discard'), style: 'destructive', onPress: () => { resetForm(); onDismiss(); } },
        ],
      );
    } else {
      resetForm();
      onDismiss();
    }
  }, [title, body, resetForm, onDismiss, t]);

  const validate = useCallback((): boolean => {
    const newErrors: { title?: string; body?: string } = {};
    if (!title.trim()) newErrors.title = t('admin.titleRequired');
    if (!body.trim()) newErrors.body = t('admin.bodyRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, body, t]);

  const handlePublish = useCallback(async () => {
    if (!validate()) return;
    setPublishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const expiryMs = EXPIRY_MAP[expiry];
      const payload: AnnouncementCreatePayload = {
        mosque: mosqueId,
        title: title.trim(),
        body: body.trim(),
        priority,
        expires_at: expiryMs ? new Date(Date.now() + expiryMs).toISOString() : null,
      };
      await announcementsApi.create(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      onDismiss();
      onPublished?.();
    } catch {
      Alert.alert(t('admin.publishError'));
    } finally {
      setPublishing(false);
    }
  }, [validate, expiry, mosqueId, title, body, priority, resetForm, onDismiss, onPublished, t]);

  const priorityOptions: { value: Priority; label: string; hint: string; icon: string; color: string }[] = [
    {
      value: 'normal',
      label: t('admin.priorityNormal'),
      hint: t('admin.priorityNormalHint'),
      icon: 'megaphone-outline',
      color: colors.tint,
    },
    {
      value: 'urgent',
      label: t('admin.priorityUrgent'),
      hint: t('admin.priorityUrgentHint'),
      icon: 'alert-circle-outline',
      color: colors.urgent,
    },
    {
      value: 'janazah',
      label: t('admin.priorityJanazah'),
      hint: t('admin.priorityJanazahHint'),
      icon: 'moon-outline',
      color: isDark ? palette.divineGoldBright : palette.divineGoldText,
    },
  ];

  const expiryOptions: { value: ExpiryOption; label: string }[] = [
    { value: 'never', label: t('admin.expiresNever') },
    { value: '24h', label: t('admin.expires24h') },
    { value: '3d', label: t('admin.expires3d') },
    { value: '7d', label: t('admin.expires7d') },
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
            {t('admin.newAnnouncement')}
          </Text>
          {mosqueName && (
            <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              {mosqueName}
            </Text>
          )}
        </View>

        {showPreview ? (
          <>
            <PreviewCard
              type="announcement"
              title={title}
              body={body}
              priority={priority}
              mosqueName={mosqueName}
            />
            <View style={[styles.buttonRow, { marginTop: spacing.xl }]}>
              <Button
                title={t('admin.back')}
                variant="secondary"
                onPress={() => setShowPreview(false)}
                compact
                style={styles.flex}
              />
              <Button
                title={publishing ? t('admin.publishing') : t('admin.publish')}
                variant="primary"
                onPress={handlePublish}
                loading={publishing}
                compact
                style={styles.flex}
              />
            </View>
          </>
        ) : (
          <>
            {/* Title input */}
            <TextInput
              label={t('admin.title')}
              value={title}
              onChangeText={(text) => { setTitle(text); if (errors.title) setErrors((e) => ({ ...e, title: undefined })); }}
              placeholder={t('admin.titlePlaceholder')}
              error={errors.title}
              maxLength={200}
              returnKeyType="next"
            />

            {/* Body input */}
            <TextInput
              label={t('admin.body')}
              value={body}
              onChangeText={(text) => { setBody(text); if (errors.body) setErrors((e) => ({ ...e, body: undefined })); }}
              placeholder={t('admin.bodyPlaceholder')}
              error={errors.body}
              multiline
              numberOfLines={4}
              style={styles.bodyInput}
              maxLength={2000}
            />

            {/* Character count */}
            <Text style={[typography.caption2, { color: colors.textTertiary, textAlign: 'right', marginTop: -spacing.md, marginBottom: spacing.md }]}>
              {body.length}/2000
            </Text>

            {/* Priority selector */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.xs }]}>
              {t('admin.priority')}
            </Text>
            <View style={styles.optionGroup}>
              {priorityOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: priority === opt.value
                        ? alphaColors.actionBg
                        : 'transparent',
                      borderColor: priority === opt.value ? opt.color : colors.cardBorder,
                    },
                  ]}
                  onPress={() => { setPriority(opt.value); Haptics.selectionAsync(); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: priority === opt.value }}
                >
                  <Ionicons
                    name={opt.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={priority === opt.value ? opt.color : colors.textSecondary}
                  />
                  <View style={styles.optionText}>
                    <Text style={[typography.subhead, { color: priority === opt.value ? opt.color : colors.text, fontWeight: '600' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                      {opt.hint}
                    </Text>
                  </View>
                  {priority === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color={opt.color} />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Expiry selector */}
            <Text style={[typography.caption1, { color: colors.textSecondary, fontWeight: '500', marginTop: spacing.lg, marginBottom: spacing.xs }]}>
              {t('admin.expiresAt')}
            </Text>
            <View style={styles.chipRow}>
              {expiryOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: expiry === opt.value ? colors.tint : colors.backgroundGrouped,
                    },
                  ]}
                  onPress={() => { setExpiry(opt.value); Haptics.selectionAsync(); }}
                >
                  <Text style={[
                    typography.caption1,
                    {
                      fontWeight: '600',
                      color: expiry === opt.value ? colors.onPrimary : colors.textSecondary,
                    },
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Action buttons */}
            <View style={[styles.buttonRow, { marginTop: spacing['2xl'] }]}>
              <Button
                title={t('admin.preview')}
                variant="secondary"
                onPress={() => { if (validate()) setShowPreview(true); }}
                compact
                style={styles.flex}
              />
              <Button
                title={publishing ? t('admin.publishing') : t('admin.publish')}
                variant="primary"
                onPress={handlePublish}
                loading={publishing}
                compact
                style={styles.flex}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  bodyInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionGroup: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
