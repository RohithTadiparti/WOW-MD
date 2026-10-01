import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { acceptAuth, api, apiMessage } from '@/lib/api';
import {
  EMAIL_PATTERN,
  GMAIL_PATTERN,
  MOBILE_10_PATTERN,
  NAME_PATTERN,
  type AccountType,
} from '@/shared/permissions';
import { Alert, Body, Button, Caption, Field, PageSubtitle, PageTitle, Screen } from '@/components/ui';
import { radius, rgb, space, useTheme } from '@/theme';
import { Eye, EyeClosed } from 'phosphor-react-native';
import { SelectField } from '@/components/form';

/**
 * Sign up.
 *
 * The app had no way in at all: an account could only be made on the web and
 * then signed into here, which is not something anybody who downloads an app
 * discovers on their own.
 *
 * The rules are the web page's, and deliberately not re-derived — the patterns
 * come from the same shared module the web form uses, which is itself checked
 * against the server's enum. Three hand-written copies of "what is a valid
 * mobile number" is three chances to reject something the server would have
 * accepted.
 *
 * The account type is asked first because it decides the permission set, and
 * because it cannot be changed afterwards without support.
 */
interface TypeOption {
  type: AccountType;
  label: string;
  blurb: string;
  roles?: { value: string; label: string }[];
}

const ACCOUNT_TYPES: TypeOption[] = [
  {
    type: 'individual',
    label: 'Individual',
    blurb: 'Looking for a match, or a family member searching on their behalf.',
    roles: [
      { value: 'bride', label: 'Bride' },
      { value: 'groom', label: 'Groom' },
      { value: 'family', label: 'Family member' },
    ],
  },
  {
    type: 'agent',
    label: 'Marriage agent',
    blurb: 'Build profiles for clients and book on their behalf. Reviewed before activation.',
  },
  {
    type: 'vendor',
    label: 'Vendor',
    blurb: 'Sell wedding services: venue, catering, photography, decor and more.',
  },
  {
    type: 'planner',
    label: 'Wedding planner',
    blurb: 'Offer planning packages and co-manage the weddings you are engaged on.',
  },
];

/**
 * Who the family member is managing the profile for.
 *
 * The backend CreateProfileDto only accepts 'bride' or 'groom' for the
 * managingFor field (@IsIn(['bride', 'groom'])). Self, Parent, Sibling etc.
 * are not valid values — those belong to the separate stewardRelation field
 * which records how the steward is related to the person. This dropdown
 * answers "are you looking for a bride or a groom?" not "who are you?".
 */
const MANAGING_FOR_OPTIONS = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
];



export default function Register() {
  const theme = useTheme();
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [role, setRole] = useState('bride');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Family Member fields
  const [managingFor, setManagingFor] = useState('');

  const selected = ACCOUNT_TYPES.find((a) => a.type === accountType)!;
  const isFamilyMember = accountType === 'individual' && role === 'family';

  /**
   * The same rules the server applies, checked before the round trip.
   *
   * Field-level and specific, because "Enter a 10-digit mobile number" says
   * which field and what to do about it where a single banner does not. The
   * server still enforces every one of these.
   */
  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    const digits = phone.replace(/\s|-/g, '').replace(/^\+91/, '');

    if (isFamilyMember) {
      // Name: First Name + Last Name (no combined Full Name / displayName for family)
      if (!firstName.trim()) errors.firstName = 'Enter the first name';
      else if (!NAME_PATTERN.test(firstName.trim()))
        errors.firstName = 'A name may only contain letters and spaces';

      if (!lastName.trim()) errors.lastName = 'Enter the last name';
      else if (!NAME_PATTERN.test(lastName.trim()))
        errors.lastName = 'A name may only contain letters and spaces';

      // Managing Profile For: must be 'bride' or 'groom' (backend constraint)
      if (!managingFor) {
        errors.managingFor = 'Select who you are managing this profile for';
      } else if (!['bride', 'groom'].includes(managingFor)) {
        errors.managingFor = 'Select Bride or Groom';
      }
    } else {
      const name = displayName.trim();
      if (!name) errors.displayName = 'Enter your name';
      else if (accountType === 'individual' && !NAME_PATTERN.test(name)) {
        errors.displayName = 'A name may only contain letters and spaces';
      }
    }

    if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
    // Every portal registers with a Gmail address (EZ1-I104).
    else if (!GMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Registration requires a @gmail.com email address';
    }

    /*
     * Every account needs a number now (EZ1-I258).
     *
     * It is not only a way of being reached: it is a way of signing in. An
     * account created without one has a route into it that can never be used,
     * and the number is what most of this platform's people were taken on with
     * in the first place. The server refuses a registration without one.
     */
    if (!digits) errors.phone = 'Enter the mobile number this account will sign in with';
    else if (digits && !MOBILE_10_PATTERN.test(digits)) {
      errors.phone = 'Enter a 10-digit Indian mobile number, starting 6 to 9';
    }

    if (password.length < 8) errors.password = 'At least 8 characters';
    else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'Needs an uppercase letter, a lowercase letter and a digit';
    }

    /*
     * Typed twice, because the field is masked and nobody can proof-read a row
     * of dots. Getting it wrong here costs a password reset on an account the
     * person has not used yet, which is the worst possible first impression.
     */
    if (!confirmPassword) errors.confirmPassword = 'Type the password again';
    else if (confirmPassword !== password) {
      errors.confirmPassword = 'Password and Confirm Password do not match.';
    }

    return errors;
  }

  async function submit() {
    setError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      // For a family member the display name is assembled from first + last name.
      const finalDisplayName = isFamilyMember
        ? `${firstName.trim()} ${lastName.trim()}`
        : displayName.trim();

      const payload: Record<string, unknown> = {
        email: email.trim(),
        password,
        accountType,
        displayName: finalDisplayName,
      };
      if (phone.trim()) payload.phone = phone.replace(/\s|-/g, '');
      // Only meaningful for an individual; the server derives the role from
      // accountType for every other persona, and refuses it here.
      if (accountType === 'individual') payload.role = role;

      const { data } = await api.post('/auth/register', payload);
      await acceptAuth(data);

      if (isFamilyMember) {
        /*
         * Save the family-member-specific profile fields immediately after
         * registration. These map to specific backend-accepted field names:
         *
         *   managingFor  → 'bride' | 'groom'  (backend @IsIn(['bride', 'groom']))
         *
         * Other profile details (gender, DOB, city, address, etc.) and
         * stewardRelation (how the family member is related to the person) are
         * NOT sent here. They are collected later when completing the profile.
         */
        const profilePayload: Record<string, string> = {};
        if (managingFor) profilePayload.managingFor = managingFor;

        try {
          await api.put('/users/me/profile', profilePayload);
        } catch (e) {
          // Profile fields are best-effort at registration time. The account
          // is created; the user can update their profile from the Profile page.
          console.warn('Failed to save family member profile fields after registration', e);
        }
      }

      // Navigate to the app home after successful registration.
      // The auth gate in _layout.tsx will also redirect signed-in users away
      // from /register, but replacing here ensures immediate navigation.
      router.replace('/');
    } catch (err) {
      setError(apiMessage(err, 'Could not register. The email may already be in use.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: rgb(theme.canvas) }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <View style={{ gap: space(1), marginTop: space(8), marginBottom: space(3) }}>
          <PageTitle>Create your account</PageTitle>
          <PageSubtitle>
            Pick the kind of account you need. It decides what you can do here, and cannot be
            changed later without contacting support.
          </PageSubtitle>
        </View>

        {error ? <Alert tone="critical">{error}</Alert> : null}

        <View style={{ gap: space(2) }}>
          <Body tone="muted">I am joining as</Body>
          {ACCOUNT_TYPES.map((opt) => {
            const active = opt.type === accountType;
            return (
              <Pressable
                key={opt.type}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setAccountType(opt.type)}
                style={({ pressed }) => [
                  {
                    borderRadius: radius.md,
                    borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                    borderColor: rgb(active ? theme.brand : theme.border),
                    backgroundColor: rgb(active ? theme.brandSoft : theme.surface),
                    padding: space(3),
                    gap: space(1),
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Body>{opt.label}</Body>
                <Caption>{opt.blurb}</Caption>
              </Pressable>
            );
          })}
        </View>

        {selected.roles ? (
          <View style={{ gap: space(2) }}>
            <Body tone="muted">Who is this profile for?</Body>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              {selected.roles.map((r) => {
                const active = r.value === role;
                return (
                  <Button
                    key={r.value}
                    label={r.label}
                    small
                    variant={active ? 'primary' : 'outline'}
                    onPress={() => setRole(r.value)}
                    style={{ flex: 1 }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {isFamilyMember ? (
          <View style={{ gap: space(2) }}>
            {/* First Name + Last Name side by side */}
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="First Name"
                  required
                  value={firstName}
                  onChangeText={setFirstName}
                  maxLength={60}
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                />
                {fieldErrors.firstName ? (
                  <Caption tone="critical">{fieldErrors.firstName}</Caption>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Last Name"
                  required
                  value={lastName}
                  onChangeText={setLastName}
                  maxLength={60}
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                />
                {fieldErrors.lastName ? (
                  <Caption tone="critical">{fieldErrors.lastName}</Caption>
                ) : null}
              </View>
            </View>

            {/*
              Managing Profile For: Bride or Groom only.
              The backend @IsIn(['bride', 'groom']) constraint means Self,
              Parent, Sibling etc. are all rejected. This field answers
              "who is the match for?" not "who are you?".
            */}
            <SelectField
              label="Managing Profile For"
              required
              value={managingFor}
              options={MANAGING_FOR_OPTIONS}
              onChange={setManagingFor}
            />
            {fieldErrors.managingFor ? (
              <Caption tone="critical">{fieldErrors.managingFor}</Caption>
            ) : null}
          </View>
        ) : (
          <View>
            <Field
              label={accountType === 'individual' ? 'Full name' : 'Your name'}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={120}
              autoComplete="name"
              textContentType="name"
            />
            {fieldErrors.displayName ? (
              <Caption tone="critical">{fieldErrors.displayName}</Caption>
            ) : null}
          </View>
        )}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        {fieldErrors.email ? <Caption tone="critical">{fieldErrors.email}</Caption> : null}

        <Field
          label="Mobile number"
          hint={
            fieldErrors.phone
              ? undefined
              : 'Ten digits, starting 6 to 9. You can sign in with this number and a code.'
          }
          value={phone}
          onChangeText={setPhone}
          keyboardType="number-pad"
          maxLength={13}
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="9876543210"
        />
        {fieldErrors.phone ? <Caption tone="critical">{fieldErrors.phone}</Caption> : null}

        <Field
          label="Password"
          hint={
            fieldErrors.password
              ? undefined
              : 'At least 8 characters, with an uppercase letter, a lowercase letter and a digit.'
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          showPasswordToggle
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          rightAccessory={
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              hitSlop={12}
            >
              {showPassword ? (
                <Eye size={20} color={rgb(theme.ink[500])} />
              ) : (
                <EyeClosed size={20} color={rgb(theme.ink[500])} />
              )}
            </Pressable>
          }
        />
        {fieldErrors.password ? <Caption tone="critical">{fieldErrors.password}</Caption> : null}

        <Field
          label="Confirm password"
          hint={fieldErrors.confirmPassword ? undefined : 'The same password again.'}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
<<<<<<< HEAD
          secureTextEntry
          showPasswordToggle
=======
          secureTextEntry={!showConfirmPassword}
>>>>>>> a664545 (family login)
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={submit}
          returnKeyType="go"
          rightAccessory={
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              accessibilityRole="button"
              hitSlop={12}
            >
              {showConfirmPassword ? (
                <Eye size={20} color={rgb(theme.ink[500])} />
              ) : (
                <EyeClosed size={20} color={rgb(theme.ink[500])} />
              )}
            </Pressable>
          }
        />
        {fieldErrors.confirmPassword ? (
          <Caption tone="critical">{fieldErrors.confirmPassword}</Caption>
        ) : null}

        <Button
          label={
            isFamilyMember
              ? 'Create family member account'
              : `Create ${selected.label.toLowerCase()} account`
          }
          onPress={submit}
          busy={busy}
          disabled={
            !email.trim() ||
            !password ||
            !confirmPassword ||
            !phone.trim() ||
            (isFamilyMember
              ? !firstName.trim() ||
                !lastName.trim() ||
                !managingFor
              : !displayName.trim())
          }
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: space(1),
            marginBottom: space(4),
          }}
        >
          <Caption>Have an account?</Caption>
          <Link href="/login" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Caption tone="brand">Sign in</Caption>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
