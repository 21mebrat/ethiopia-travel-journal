export type NavCopy = {
  navigation: string
  dashboard: string
  newArticle: string
  uploadMedia: string
  viewSite: string
  documentation: string
  account: string
  theme: string
  light: string
  dark: string
  system: string
  logOut: string
  editorialStudio: string
  signedInAs: string
}

const en: NavCopy = {
  navigation: 'Main navigation',
  dashboard: 'Dashboard',
  newArticle: 'New article',
  uploadMedia: 'Upload media',
  viewSite: 'View site',
  documentation: 'Documentation',
  account: 'Account',
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  logOut: 'Log out',
  editorialStudio: 'Editorial Studio',
  signedInAs: 'Signed in as',
}

const am: NavCopy = {
  navigation: 'ዋና ዳሰሳ',
  dashboard: 'ዳሽቦርድ',
  newArticle: 'አዲስ ጽሑፍ',
  uploadMedia: 'ሚዲያ ስቀል',
  viewSite: 'ድረ-ገጹን ይመልከቱ',
  documentation: 'ሰነዶች',
  account: 'መለያ',
  theme: 'ገጽታ',
  light: 'ብርሃን',
  dark: 'ጨለማ',
  system: 'የስርዓቱ',
  logOut: 'ውጣ',
  editorialStudio: 'የአርታዒ ስቱዲዮ',
  signedInAs: 'በመለያ የገቡት',
}

export function getNavCopy(language: string | undefined): NavCopy {
  return language === 'am' ? am : en
}
