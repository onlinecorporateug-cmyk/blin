export type Role = 'user' | 'creator' | 'admin';
export type AccountKind = 'watcher' | 'creator';

export interface Account {
  u: string;
  name: string;
  em: string;
  pw: string;
  role: Role;
  kind?: AccountKind;
  vibes?: string[];
  teen?: boolean;
  fol: number;
  bio?: string;
  banned?: boolean;
  deact?: boolean;
  avatar?: string;
}

export interface Clip {
  id?: string;
  t: string;
  n: string;
  h: string;
  i: string; // image key
  l: number;
  c: number;
  v: string;
  s: string;
  tags: string;
  fl?: string;
  sk?: string;
  cm: [string, string, number?][];
  liked?: boolean;
  saved?: boolean;
  aud?: string;
  nocm?: boolean;
}

export interface Story {
  n: string;
  i: string;
  x?: string;
  you?: number;
  seen?: number;
  fl?: string;
}

export interface ChatMessage {
  me?: number;
  t: string;
  tm: string;
  st?: 'sent' | 'del' | 'seen';
  r?: string;
}

export interface ChatThread {
  n: string;
  i: string;
  req?: number;
  u?: number;
  typing?: number;
  m: ChatMessage[];
}

export interface ReportItem {
  id: number;
  h: string;
  why: string;
  sup?: number;
}

export interface DraftItem {
  img: string;
  fl: number;
  sticker: string;
  sound: number;
  cap: string;
}

export interface SettingsState {
  tfa: number;
  recov: number;
  priv: number;
  cmWho: string;
  mnWho: string;
  dl: number;
  remix: number;
  hidOn: number;
  hid: string;
  nLikes: number;
  nFol: number;
  nCm: number;
  nDm: number;
  nCom: number;
  nAnn: number;
  nPush: number;
  nMail: number;
  nIn: number;
  auto: number;
  saver: number;
  qual: string;
  caps: number;
  trans: string;
  topics: string[];
  upq: string;
  wifi: number;
  aud: string;
  cmDef: string;
  anl: number;
  reqOn: number;
  calls: string;
  grp: string;
  active: number;
  cvis: number;
  cnot: number;
  cinv: string;
  aiStyle: 'Friendly' | 'Gen Z' | 'Professional';
  aiWrite: string;
  aiVid: string;
  aiCap: number;
  aiTr: string;
  aiSave: number;
  aiPers: number;
  aiData: number;
  aiLabel: number;
  aiPrem: number;
  theme: 'Dark' | 'Light' | 'System';
  lang: string;
  txt: 'Small' | 'Default' | 'Large';
  rm: number;
  hc: number;
  alt: number;
  dwf: number;
  remind: 'Off' | '30 min' | '1 hour' | '2 hours';
  quiet: number;
  digest: number;
}
