import csAuth from './cs/auth.json';
import csChat from './cs/chat.json';
import csCommon from './cs/common.json';
import csDiscovery from './cs/discovery.json';
import csProfile from './cs/profile.json';
import csSafety from './cs/safety.json';
import skAuth from './sk/auth.json';
import skChat from './sk/chat.json';
import skCommon from './sk/common.json';
import skDiscovery from './sk/discovery.json';
import skProfile from './sk/profile.json';
import skSafety from './sk/safety.json';

export const resources = {
  sk: {
    common: skCommon,
    auth: skAuth,
    discovery: skDiscovery,
    chat: skChat,
    profile: skProfile,
    safety: skSafety,
  },
  cs: {
    common: csCommon,
    auth: csAuth,
    discovery: csDiscovery,
    chat: csChat,
    profile: csProfile,
    safety: csSafety,
  },
} as const;

export const SUPPORTED_LANGUAGES = ['sk', 'cs'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: SupportedLanguage = 'sk';
export const DEFAULT_NAMESPACE = 'common';
