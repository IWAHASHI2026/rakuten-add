// rules.js — ルール管理モジュール

const STORAGE_KEY_RULES = 'rakuten-ad-rules';
const STORAGE_KEY_MIN_BID = 'rakuten-ad-min-bid';
const STORAGE_KEY_ALERT_ROAS = 'rakuten-ad-alert-roas';

const DEFAULT_RULES = [
  {
    id: 1,
    roasMin: 0, roasMax: 0,
    roasMinInclusive: true, roasMaxInclusive: true,
    clickCondition: 'lt', clickThreshold: 30,
    adjustment: -1
  },
  {
    id: 2,
    roasMin: 0, roasMax: 0,
    roasMinInclusive: true, roasMaxInclusive: true,
    clickCondition: 'gte', clickThreshold: 30,
    adjustment: -3
  },
  {
    id: 3,
    roasMin: 0, roasMax: 250,
    roasMinInclusive: false, roasMaxInclusive: false,
    clickCondition: null, clickThreshold: null,
    adjustment: -1
  },
  {
    id: 4,
    roasMin: 250, roasMax: 400,
    roasMinInclusive: true, roasMaxInclusive: true,
    clickCondition: null, clickThreshold: null,
    adjustment: 0
  },
  {
    id: 5,
    roasMin: 400, roasMax: null,
    roasMinInclusive: false, roasMaxInclusive: false,
    clickCondition: null, clickThreshold: null,
    adjustment: 3
  }
];

const DEFAULT_MIN_BID = 20;
const DEFAULT_ALERT_ROAS = 150;

const Rules = {
  getDefaultRules() {
    return JSON.parse(JSON.stringify(DEFAULT_RULES));
  },

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RULES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('ルール読み込みエラー:', e);
    }
    return this.getDefaultRules();
  },

  save(rules) {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
  },

  loadMinBid() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MIN_BID);
      if (stored !== null) return Number(stored);
    } catch (e) { /* ignore */ }
    return DEFAULT_MIN_BID;
  },

  saveMinBid(value) {
    localStorage.setItem(STORAGE_KEY_MIN_BID, String(value));
  },

  loadAlertRoas() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALERT_ROAS);
      if (stored !== null) return Number(stored);
    } catch (e) { /* ignore */ }
    return DEFAULT_ALERT_ROAS;
  },

  saveAlertRoas(value) {
    localStorage.setItem(STORAGE_KEY_ALERT_ROAS, String(value));
  },

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEY_RULES);
    localStorage.removeItem(STORAGE_KEY_MIN_BID);
    localStorage.removeItem(STORAGE_KEY_ALERT_ROAS);
  },

  matchROAS(roas, rule) {
    const lower = rule.roasMinInclusive ? (roas >= rule.roasMin) : (roas > rule.roasMin);
    if (rule.roasMax === null) return lower;
    const upper = rule.roasMaxInclusive ? (roas <= rule.roasMax) : (roas < rule.roasMax);
    return lower && upper;
  },

  matchClicks(clicks, rule) {
    if (rule.clickCondition === null) return true;
    if (rule.clickCondition === 'lt') return clicks < rule.clickThreshold;
    if (rule.clickCondition === 'gte') return clicks >= rule.clickThreshold;
    return false;
  },

  matchRule(roas, clicks, rules) {
    for (const rule of rules) {
      if (this.matchROAS(roas, rule) && this.matchClicks(clicks, rule)) {
        return rule;
      }
    }
    return null;
  }
};
