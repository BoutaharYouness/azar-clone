/**
 * i18n.js — Lightweight internationalisation service for Hours.
 *
 * Supports: English (en), Français (fr), العربية (ar)
 * Usage:
 *   import { t, setLocale, getLocale } from './i18n';
 *   t('home.slogan')  // => "Meet people around the world instantly."
 */

const translations = {
  en: {
    // Home / Login
    'app.name': 'Hours',
    'home.slogan': 'Meet people around the world instantly.',
    'home.nickname_placeholder': 'Choose a nickname…',
    'home.start': 'Start Chatting',
    'home.connecting': 'Connecting…',
    'home.disclaimer': 'By continuing, you agree to our terms. Be respectful to others.',
    'home.nickname_error': 'Nickname must be at least 2 characters.',
    'home.select_language': 'Language',
    'home.select_country': 'Country',
    'home.users_online': 'users online',
    'home.countries_online': 'countries online',
    'home.avg_wait': 'avg. wait',
    'home.seconds': 's',

    // Call page
    'call.searching': 'Searching…',
    'call.searching_tip_1': 'People from 180+ countries are online.',
    'call.searching_tip_2': 'Be respectful.',
    'call.searching_tip_3': 'Smile 😊',
    'call.connecting_ws': 'Connecting to server…',
    'call.connecting_peer': 'Connecting to peer…',
    'call.connected': 'Connected',
    'call.disconnected': 'Disconnected',
    'call.error': 'Error',
    'call.init': 'Initializing…',
    'call.no_video': 'No video',
    'call.you': 'You',
    'call.with': 'with',
    'call.match_found': 'Connected!',

    // Controls
    'controls.mute': 'Mute',
    'controls.unmute': 'Unmute',
    'controls.camera_off': 'Camera off',
    'controls.camera_on': 'Camera on',
    'controls.next': 'Next',
    'controls.report': 'Report',
    'controls.settings': 'Settings',
    'controls.end_call': 'Leave',
    'controls.fullscreen': 'Fullscreen',
    'controls.chat': 'Chat',

    // Chat
    'chat.placeholder': 'Type a message…',
    'chat.send': 'Send',

    // Report
    'report.title': 'Report User',
    'report.spam': 'Spam',
    'report.nudity': 'Nudity',
    'report.harassment': 'Harassment',
    'report.fake_camera': 'Fake camera',
    'report.minor': 'Minor',
    'report.violence': 'Violence',
    'report.other': 'Other',
    'report.submit': 'Submit Report',
    'report.cancel': 'Cancel',
    'report.success': 'Report submitted successfully.',

    // Settings
    'settings.title': 'Settings',
    'settings.camera': 'Camera',
    'settings.microphone': 'Microphone',
    'settings.language': 'Language',
    'settings.video_quality': 'Video quality',
    'settings.noise_suppression': 'Noise suppression',
    'settings.gender_filter': 'Gender Preference (Premium)',
    'settings.country_filter': 'Country Preference (Premium)',
    'settings.close': 'Close',
    'settings.save': 'Save',

    // Stats
    'stats.people_met': 'People met',
    'stats.countries': 'Countries',
    'stats.time': 'Time',

    // Authentication Modal
    'auth.login': 'Log In',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email Address',
    'auth.password': 'Password',
    'auth.nickname': 'Nickname',
    'auth.google': 'Continue with Google',
    'auth.discord': 'Continue with Discord',
    'auth.limit_reached': 'You have reached the free limit.',
    'auth.limit_desc': 'Create a free account to continue meeting new people.',
    'auth.have_account': 'Already have an account?',
    'auth.no_account': 'Don\'t have an account?',
    'auth.register_now': 'Register now',
    'auth.login_now': 'Log in now',
  },

  fr: {
    'app.name': 'Hours',
    'home.slogan': 'Rencontrez des gens du monde entier instantanément.',
    'home.nickname_placeholder': 'Choisissez un pseudo…',
    'home.start': 'Commencer',
    'home.connecting': 'Connexion…',
    'home.disclaimer': 'En continuant, vous acceptez nos conditions. Soyez respectueux.',
    'home.nickname_error': 'Le pseudo doit contenir au moins 2 caractères.',
    'home.select_language': 'Langue',
    'home.select_country': 'Pays',
    'home.users_online': 'en ligne',
    'home.countries_online': 'pays en ligne',
    'home.avg_wait': 'attente moy.',
    'home.seconds': 's',

    'call.searching': 'Recherche…',
    'call.searching_tip_1': 'Des gens de 180+ pays sont en ligne.',
    'call.searching_tip_2': 'Soyez respectueux.',
    'call.searching_tip_3': 'Souriez 😊',
    'call.connecting_ws': 'Connexion au serveur…',
    'call.connecting_peer': 'Connexion au pair…',
    'call.connected': 'Connecté',
    'call.disconnected': 'Déconnécté',
    'call.error': 'Erreur',
    'call.init': 'Initialisation…',
    'call.no_video': 'Pas de vidéo',
    'call.you': 'Vous',
    'call.with': 'avec',
    'call.match_found': 'Connecté !',

    'controls.mute': 'Couper le micro',
    'controls.unmute': 'Activer le micro',
    'controls.camera_off': 'Couper la caméra',
    'controls.camera_on': 'Activer la caméra',
    'controls.next': 'Suivant',
    'controls.report': 'Signaler',
    'controls.settings': 'Paramètres',
    'controls.end_call': 'Quitter',
    'controls.fullscreen': 'Plein écran',
    'controls.chat': 'Chat',

    'chat.placeholder': 'Écrivez un message…',
    'chat.send': 'Envoyer',

    'report.title': 'Signaler l\'utilisateur',
    'report.spam': 'Spam',
    'report.nudity': 'Nudité',
    'report.harassment': 'Harcèlement',
    'report.fake_camera': 'Fausse caméra',
    'report.minor': 'Mineur',
    'report.violence': 'Violence',
    'report.other': 'Autre',
    'report.submit': 'Envoyer le signalement',
    'report.cancel': 'Annuler',
    'report.success': 'Signalement envoyé avec succès.',

    'settings.title': 'Paramètres',
    'settings.camera': 'Caméra',
    'settings.microphone': 'Microphone',
    'settings.language': 'Langue',
    'settings.video_quality': 'Qualité vidéo',
    'settings.noise_suppression': 'Réduction du bruit',
    'settings.gender_filter': 'Préférence de Genre (Premium)',
    'settings.country_filter': 'Préférence de Pays (Premium)',
    'settings.close': 'Fermer',
    'settings.save': 'Enregistrer',

    'stats.people_met': 'Personnes rencontrées',
    'stats.countries': 'Pays',
    'stats.time': 'Temps',

    'auth.login': 'Se connecter',
    'auth.signup': 'S\'inscrire',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.nickname': 'Pseudo',
    'auth.google': 'Continuer avec Google',
    'auth.discord': 'Continuer avec Discord',
    'auth.limit_reached': 'Vous avez atteint la limite gratuite.',
    'auth.limit_desc': 'Créez un compte gratuit pour continuer à rencontrer des gens.',
    'auth.have_account': 'Vous avez déjà un compte ?',
    'auth.no_account': 'Pas de compte ?',
    'auth.register_now': 'Inscrivez-vous',
    'auth.login_now': 'Connectez-vous',
  },

  ar: {
    'app.name': 'Hours',
    'home.slogan': 'تعرف على أشخاص حول العالم فورًا.',
    'home.nickname_placeholder': 'اختر اسمًا مستعارًا…',
    'home.start': 'ابدأ المحادثة',
    'home.connecting': 'جاري الاتصال…',
    'home.disclaimer': 'بالمتابعة، أنت توافق على شروطنا. كن محترمًا.',
    'home.nickname_error': 'يجب أن يحتوي الاسم المستعار على حرفين على الأقل.',
    'home.select_language': 'اللغة',
    'home.select_country': 'البلد',
    'home.users_online': 'متصل الآن',
    'home.countries_online': 'بلد متصل',
    'home.avg_wait': 'متوسط الانتظار',
    'home.seconds': 'ث',

    'call.searching': 'جاري البحث…',
    'call.searching_tip_1': 'أشخاص من 180+ بلد متصلون.',
    'call.searching_tip_2': 'كن محترمًا.',
    'call.searching_tip_3': 'ابتسم 😊',
    'call.connecting_ws': 'الاتصال بالخادم…',
    'call.connecting_peer': 'الاتصال بالطرف الآخر…',
    'call.connected': 'متصل',
    'call.disconnected': 'غير متصل',
    'call.error': 'خطأ',
    'call.init': 'جاري التهيئة…',
    'call.no_video': 'لا فيديو',
    'call.you': 'أنت',
    'call.with': 'مع',
    'call.match_found': 'تم الاتصال!',

    'controls.mute': 'كتم',
    'controls.unmute': 'إلغاء كتم',
    'controls.camera_off': 'إيقاف الكاميرا',
    'controls.camera_on': 'تشغيل الكاميرا',
    'controls.next': 'التالي',
    'controls.report': 'إبلاغ',
    'controls.settings': 'الإعدادات',
    'controls.end_call': 'مغادرة',
    'controls.fullscreen': 'شاشة كاملة',
    'controls.chat': 'محادثة',

    'chat.placeholder': 'اكتب رسالة…',
    'chat.send': 'إرسال',

    'report.title': 'الإبلاغ عن مستخدم',
    'report.spam': 'رسائل مزعجة',
    'report.nudity': 'محتوى إباحي',
    'report.harassment': 'تحرش',
    'report.fake_camera': 'كاميرا مزيفة',
    'report.minor': 'قاصر',
    'report.violence': 'عنف',
    'report.other': 'أخرى',
    'report.submit': 'إرسال البلاغ',
    'report.cancel': 'إلغاء',
    'report.success': 'تم إرسال البلاغ بنجاح.',

    'settings.title': 'الإعدادات',
    'settings.camera': 'الكاميرا',
    'settings.microphone': 'الميكروفون',
    'settings.language': 'اللغة',
    'settings.video_quality': 'جودة الفيديو',
    'settings.noise_suppression': 'تقليل الضوضاء',
    'settings.gender_filter': 'تفضيل الجنس (مميز)',
    'settings.country_filter': 'تفضيل البلد (مميز)',
    'settings.close': 'إغلاق',
    'settings.save': 'حفظ',

    'stats.people_met': 'أشخاص تمت مقابلتهم',
    'stats.countries': 'بلدان',
    'stats.time': 'الوقت',

    'auth.login': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.nickname': 'الاسم المستعار',
    'auth.google': 'المتابعة باستخدام Google',
    'auth.discord': 'المتابعة باستخدام Discord',
    'auth.limit_reached': 'لقد وصلت إلى الحد الأقصى المجاني.',
    'auth.limit_desc': 'أنشئ حساباً مجانياً للاستمرار في التعرف على أشخاص جدد.',
    'auth.have_account': 'هل لديك حساب بالفعل؟',
    'auth.no_account': 'ليس لديك حساب؟',
    'auth.register_now': 'سجل الآن',
    'auth.login_now': 'سجل الدخول الآن',
  },
};

let currentLocale = 'en';

/**
 * Translate a key using the current locale.
 * Falls back to English if key is missing in current locale.
 */
export function t(key) {
  return translations[currentLocale]?.[key]
      || translations['en']?.[key]
      || key;
}

export function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
    // Persist choice for session
    sessionStorage.setItem('hours_locale', locale);
  }
}

export function getLocale() {
  return currentLocale;
}

/** Restore locale from session storage (call on app init) */
export function restoreLocale() {
  const saved = sessionStorage.getItem('hours_locale');
  if (saved && translations[saved]) {
    currentLocale = saved;
  }
}

export function isRTL() {
  return currentLocale === 'ar';
}

export const SUPPORTED_LOCALES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇲🇦', label: 'العربية' },
];
