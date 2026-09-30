import { useState, useMemo, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, TextInput } from 'react-native';
import { CaretDown, Check, MagnifyingGlass } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthCalendar, formatLongDate } from '@/components/calendar';
import { Sheet } from '@/components/sheet';
import { Body, Button, Caption, Field, SectionTitle } from '@/components/ui';
import { radius, rgb, rgba, space, useTheme } from '@/theme';
import { Txt } from '@/theme/fonts';

/**
 * The form controls the portals need beyond a text field.
 *
 * The web client uses `<select>`, `<input type="date">` and
 * `<input type="time">`, all of which the browser renders natively and none of
 * which exists in React Native. Each is replaced here by the control the
 * platform would have given: a sheet of options, a month grid, a list of times.
 * (`window.prompt` gets the same treatment in components/prompt.tsx.)
 *
 * No new native dependency for any of them. A date or time picker module would
 * mean rebuilding the dev client — this app already carries a config plugin, so
 * it is not an Expo Go build — and a month grid was needed for Availability
 * regardless, so the calendar is reused rather than a second one installed.
 */

// ------------------------------------------------------------------ label --

function Label({ children, required, autoFilled }: { children: string; required?: boolean; autoFilled?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}>
      <Txt style={{ fontSize: 13, fontWeight: '500', color: rgb(theme.ink[600]) }}>
        {children}
        {required ? <Txt style={{ color: rgb(theme.criticalFg) }}> *</Txt> : null}
      </Txt>
      {autoFilled && (
        <View style={{ backgroundColor: rgb(theme.positiveBg), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Txt style={{ color: rgb(theme.positiveFg), fontSize: 10, fontWeight: '700' }}>AUTO-FILLED</Txt>
        </View>
      )}
    </View>
  );
}

/**
 * The pressable that looks like an input and opens a sheet.
 *
 * Shared by the select, the date and the time so the three read as one family;
 * a date field that did not match the field above it would look like a bug.
 */
export function Trigger({
  value,
  placeholder,
  invalid,
  disabled,
  onPress,
}: {
  value?: string;
  placeholder: string;
  invalid?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(2),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: rgb(invalid ? theme.criticalFg : theme.border),
          backgroundColor: rgb(theme.surface),
          borderRadius: radius.sm,
          paddingHorizontal: space(3),
          paddingVertical: 10,
          minHeight: 48,
        },
        pressed && { backgroundColor: rgb(theme.surfaceSunken) },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Txt
        style={{
          flex: 1,
          fontSize: 16,
          color: rgb(value ? theme.ink[900] : theme.ink[400]),
        }}
        numberOfLines={1}
      >
        {value || placeholder}
      </Txt>
      <CaretDown size={16} color={rgb(theme.ink[400])} />
    </Pressable>
  );
}

export function Wrapper({
  label,
  hint,
  error,
  required,
  autoFilled,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  autoFilled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Label required={required} autoFilled={autoFilled}>{label}</Label>
      {children}
      {error ? <Caption tone="critical">{error}</Caption> : null}
      {hint && !error ? <Caption tone="faint">{hint}</Caption> : null}
    </View>
  );
}

// ----------------------------------------------------------------- select --

export interface Option {
  value: string;
  label: string;
  /** Why this one cannot be chosen — an already-listed service, an officer on
   *  leave. Shown beside the label rather than hiding the row, so somebody
   *  looking for a name finds it and learns why it is unavailable. */
  note?: string;
  disabled?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  hint,
  error,
  disabled,
  required,
  autoFilled,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoFilled?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <Wrapper label={label} hint={hint} error={error} required={required} autoFilled={autoFilled}>
      <Trigger
        value={current?.label}
        placeholder={placeholder}
        invalid={Boolean(error)}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <Sheet
        visible={open}
        title={`Select ${label}`}
        subtitle={`Choose your ${label.toLowerCase()} from the list.`}
        onClose={() => setOpen(false)}
      >
        {options.length >= 10 && (
          <View style={{ paddingHorizontal: space(4), marginBottom: space(2) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: rgb(theme.surfaceRaised), borderRadius: radius.sm, borderWidth: 1, borderColor: rgb(theme.border), paddingHorizontal: space(3), height: 44 }}>
              <MagnifyingGlass size={18} color={rgb(theme.ink[400])} style={{ marginRight: space(2) }} />
              <TextInput style={{ flex: 1, fontSize: 16, color: rgb(theme.ink[900]) }} placeholder="Search..." placeholderTextColor={rgb(theme.ink[400])} value={search} onChangeText={setSearch} />
            </View>
          </View>
        )}
        <ScrollView style={{ paddingHorizontal: space(4), flexShrink: 1, marginBottom: insets.bottom + space(4) }}>
          {filteredOptions.map((option, i) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active, disabled: Boolean(option.disabled) }}
                disabled={option.disabled}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3), paddingHorizontal: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: rgb(theme.border), minHeight: 48, borderRadius: radius.sm },
                  active && { backgroundColor: rgba(theme.brand, 0.08) },
                  pressed && !active && { backgroundColor: rgb(theme.surfaceSunken) },
                  option.disabled && { opacity: 0.45 },
                ]}
              >
                <View style={{ flex: 1, gap: space(0.5) }}>
                  <Body style={{ color: active ? rgb(theme.brandStrong) : rgb(theme.ink[900]) }}>{option.label}</Body>
                  {option.note ? <Caption tone="faint">{option.note}</Caption> : null}
                </View>
                {active ? <Check size={18} weight="bold" color={rgb(theme.brandStrong)} /> : null}
              </Pressable>
            );
          })}
          {filteredOptions.length === 0 && (
            <View style={{ paddingVertical: space(4), alignItems: 'center' }}>
              <Caption tone="faint">No options found.</Caption>
            </View>
          )}
        </ScrollView>
      </Sheet>
    </Wrapper>
  );
}

// ------------------------------------------------------------------- time --

/** Half-hour steps across the day, which is how availability windows are sold. */
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  return `${String(hour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
});

/** 14:30 as "2:30 pm", the way a person reads a time back. */
export function readableTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function TimeField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  /** `HH:MM`. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Wrapper label={label} hint={hint}>
      <Trigger
        value={value ? readableTime(value) : undefined}
        placeholder="Pick a time"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: 380 }}>
          {TIMES.map((time, i) => {
            const active = time === value;
            return (
              <Pressable
                key={time}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(time);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: space(3),
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: rgb(theme.border),
                    minHeight: 46,
                  },
                  pressed && { backgroundColor: rgb(theme.surfaceSunken) },
                ]}
              >
                <Body style={{ flex: 1 }}>{readableTime(time)}</Body>
                {active ? <Check size={18} weight="bold" color={rgb(theme.brandStrong)} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </Wrapper>
  );
}

// --------------------------------------------------------------- textarea --

/**
 * A multi-line field.
 *
 * `textAlignVertical` is what makes Android start the text at the top; without
 * it the first line sits in the middle of an empty box and the field reads as a
 * single-line input that happens to be tall.
 */
export function Textarea({
  label,
  value,
  onChange,
  rows = 4,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <Field
      label={label}
      value={value}
      onChangeText={onChange}
      multiline
      style={{ minHeight: 22 * rows, paddingTop: space(3), textAlignVertical: 'top' }}
      {...rest}
    />
  );
}

// ------------------------------------------------------------- check rows --

/** A checkbox as a whole row, so the label is part of the target. */
export function CheckRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
          paddingVertical: space(2),
          minHeight: 44,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? rgb(theme.brand) : 'transparent',
          borderWidth: checked ? 0 : StyleSheet.hairlineWidth,
          borderColor: rgb(theme.borderStrong),
        }}
      >
        {checked ? <Check size={13} weight="bold" color={rgb(theme.brandFg)} /> : null}
      </View>
      <View style={{ flex: 1, gap: space(0.5) }}>
        <Body>{label}</Body>
        {hint ? <Caption tone="faint">{hint}</Caption> : null}
      </View>
    </Pressable>
  );
}
