import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'Welcome to Splitter App': 'Welcome to Splitter App',
      'Balances': 'Balances',
      'Groups': 'Groups',
      'Login': 'Login',
      'Register': 'Register',
      'Logout': 'Logout',
      'Total Expenses': 'Total Expenses',
      'Total Paid': 'Total Paid',
      'Status': 'Status',
      'Balanced': 'Balanced',
      'Unbalanced': 'Unbalanced',
    },
  },
  fr: {
    translation: {
      'Welcome to Splitter App': 'Bienvenue sur Splitter App',
      'Balances': 'Soldes',
      'Groups': 'Groupes',
      'Login': 'Connexion',
      'Register': 'Inscription',
      'Logout': 'Déconnexion',
      'Total Expenses': 'Dépenses totales',
      'Total Paid': 'Total payé',
      'Status': 'Statut',
      'Balanced': 'Équilibré',
      'Unbalanced': 'Déséquilibré',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 