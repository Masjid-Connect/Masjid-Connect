import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '';

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useSocialAuth() {
  const { loginWithSocial } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    setLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token from Apple');
      }

      const name = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;

      await loginWithSocial('apple', credential.identityToken, name);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(t('auth.loginFailed'), err.message || t('auth.socialLoginFailed'));
    } finally {
      setLoading(null);
    }
  }, [loginWithSocial, t]);

  const signInWithGoogle = useCallback(async () => {
    setLoading('google');
    try {
      const clientId = Platform.OS === 'ios' ? GOOGLE_CLIENT_ID_IOS : GOOGLE_CLIENT_ID_ANDROID;
      if (!clientId) {
        throw new Error('Google Sign-In not configured');
      }

      const redirectUri = AuthSession.makeRedirectUri();

      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
      });

      const result = await request.promptAsync(GOOGLE_DISCOVERY);

      if (result.type === 'success' && result.params.id_token) {
        await loginWithSocial('google', result.params.id_token);
      } else if (result.type !== 'dismiss') {
        throw new Error('Google sign-in failed');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert(t('auth.loginFailed'), err.message || t('auth.socialLoginFailed'));
    } finally {
      setLoading(null);
    }
  }, [loginWithSocial, t]);

  return {
    signInWithApple,
    signInWithGoogle,
    loading,
    appleAvailable: Platform.OS === 'ios',
  };
}
