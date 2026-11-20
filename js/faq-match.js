/*
 * Sovely FAQ matcher. Answers common questions from data/faq.json in the browser,
 * so most chats never reach the AI backend. Works in browsers (window.SovelyFaq)
 * and Node (module.exports) so it can be tested.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SovelyFaq = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Phrases rewritten before tokenising (English + common Hinglish).
  var PHRASES = [
    [/\bhow much\b/g, ' cost '],
    [/\bkitn[aei]\b/g, ' cost '],
    [/\bcash on delivery\b/g, ' cod '],
    [/\breturn to origin\b/g, ' rto '],
    [/\bnon delivery report\b/g, ' ndr '],
    [/\bwhite[- ]label(ed|ing)?\b/g, ' whitelabel '],
    [/\bhow long\b/g, ' days '],
    [/\bsign[- ]?up\b/g, ' signup '],
    [/\bget started\b/g, ' signup '],
    [/\bpan[- ]india\b/g, ' panindia '],
    [/\ball (over )?india\b/g, ' panindia '],
    [/\bacross india\b/g, ' panindia '],
    [/\bone[- ]time\b/g, ' onetime '],
    [/\bsocial media\b/g, ' social '],
    [/\bcustomer care\b/g, ' support '],
    [/\bphone number\b/g, ' contact ']
  ];

  // Word -> canonical word.
  var SYNONYMS = {
    cost: ['price', 'prices', 'cost', 'costs', 'costing', 'pricing', 'rate', 'rates', 'rupees', 'rupee', 'rs', 'fee', 'fees', 'amount', 'paise', 'paisa'],
    charge: ['charge', 'charges', 'charged', 'shulk'],
    plan: ['plan', 'plans', 'package', 'packages', 'pack', 'membership'],
    product: ['product', 'products', 'item', 'items', 'saman', 'samaan', 'maal'],
    profit: ['profit', 'profits', 'munafa', 'kamai'],
    earn: ['earn', 'earning', 'earnings', 'kamana', 'income'],
    payout: ['payout', 'payouts', 'withdraw', 'withdrawal', 'settlement', 'settlements', 'settle'],
    payment: ['payment', 'payments', 'paid', 'pay'],
    money: ['money', 'cash'],
    deliver: ['delivery', 'deliveries', 'deliver', 'delivered', 'shipping', 'ship', 'shipment', 'shipped', 'ships'],
    days: ['days', 'day', 'din', 'duration'],
    refuse: ['refuse', 'refused', 'refuses', 'reject', 'rejected', 'rejects', 'mana', 'deny', 'denied'],
    return: ['return', 'returns', 'returned', 'wapas', 'vapas'],
    stock: ['stock', 'stocks', 'inventory', 'inventories'],
    warehouse: ['warehouse', 'godown', 'storage'],
    start: ['start', 'starting', 'begin', 'shuru'],
    sell: ['sell', 'selling', 'sale', 'sales', 'bechna', 'bech', 'becho'],
    customer: ['customer', 'customers', 'buyer', 'buyers', 'grahak'],
    monthly: ['monthly', 'month', 'months', 'mahina', 'mahine'],
    track: ['track', 'tracking', 'tracked'],
    damage: ['damage', 'damaged', 'broken', 'toota', 'tuta', 'defective', 'faulty'],
    category: ['category', 'categories', 'catagory', 'catagories', 'segment', 'segments'],
    catalogue: ['catalogue', 'catalog'],
    beginner: ['beginner', 'beginners', 'newbie', 'fresher', 'freshers'],
    instagram: ['instagram', 'insta', 'ig'],
    margin: ['margin', 'margins', 'commission'],
    signup: ['signup', 'register', 'registration', 'enroll', 'join', 'onboard', 'onboarding'],
    support: ['support', 'help', 'helpline'],
    contact: ['contact', 'call', 'reach', 'number', 'email'],
    order: ['order', 'orders'],
    dispatch: ['dispatch', 'dispatched'],
    cancel: ['cancel', 'cancelled', 'canceled', 'cancellation'],
    branding: ['branding', 'brand', 'logo', 'brands']
  };
  var CANON = {};
  Object.keys(SYNONYMS).forEach(function (c) {
    SYNONYMS[c].forEach(function (w) { CANON[w] = c; });
  });

  var STOP = toSet('a an the is are am was were be been i me my mine we our you your u ur it its this that these those do does did can could will would shall should may might to of for in on at by with from and or but if so as about any some there here please tell want need know also just get got have has had sovely sovelys hai ka ki ke ko me mein se aur kya kaise kaisa kab kahan toh to bhi hota hota hoti hote karna karne kar raha rahi ho hain na nahi milta milegi milega lene lena liya diya diye dena kiya kiye gaya gayi agar');
  var LOW = toSet('how what why when where which who many much');
  var GENERIC = toSet('sell product customer order start money payment work business online use');
  var STRONG = toSet('shopify instagram facebook amazon flipkart meesho rto ndr cod stock warehouse damage track dispatch monthly subscription signup refuse payout wallet margin branding whitelabel category beginner technical scale fba gst panindia catalogue woocommerce onetime');
  var GREETINGS = toSet('hi hii hiii hello helo hlo hey heyy namaste namaskar hola yo sup good morning afternoon evening');
  var THANKS = toSet('thanks thank thankyou thx ty dhanyavad shukriya ok okay cool great nice');

  function toSet(s) {
    var o = {};
    s.split(/\s+/).forEach(function (w) { if (w) o[w] = true; });
    return o;
  }

  function normalize(text) {
    var t = ' ' + String(text || '').toLowerCase().replace(/₹/g, ' cost ') + ' ';
    t = t.replace(/[^a-z0-9ऀ-ॿ\s-]/g, ' ').replace(/-/g, ' ');
    PHRASES.forEach(function (p) { t = t.replace(p[0], p[1]); });
    return t;
  }

  function tokens(text) {
    return normalize(text).split(/\s+/).filter(Boolean).map(function (w) {
      if (CANON[w]) return CANON[w];
      // crude plural/verb strip: "orders" -> "order", "collects" -> "collect"
      if (w.length > 4 && w.slice(-1) === 's' && w.slice(-2) !== 'ss') {
        var base = w.slice(0, -1);
        return CANON[base] || base;
      }
      return w;
    });
  }

  function weight(tok) {
    if (STOP[tok]) return 0;
    if (LOW[tok]) return 0.3;
    if (GENERIC[tok]) return 0.6;
    if (STRONG[tok]) return 2;
    return 1;
  }

  function prepare(data) {
    data._index = (data.faqs || []).map(function (f) {
      var phrases = (f.keywords || []).map(function (k) {
        var toks = tokens(k).filter(function (t) { return weight(t) > 0; });
        var w = toks.reduce(function (s, t) { return s + weight(t); }, 0);
        return { toks: toks, w: w };
      }).filter(function (p) { return p.toks.length; });
      var not = {};
      (f.not || []).forEach(function (w) { tokens(w).forEach(function (t) { not[t] = true; }); });
      return { faq: f, phrases: phrases, not: not };
    });
    return data;
  }

  function fill(template, data) {
    return String(template).replace(/\{([a-zA-Z]+)\.([a-zA-Z]+)\}/g, function (m, a, b) {
      var v = (data.plans && data.plans[a] && data.plans[a][b]) || (data[a] && data[a][b]);
      return v != null ? String(v) : m;
    });
  }

  function rank(question, data) {
    if (!data._index) prepare(data);
    var qt = tokens(question);
    var set = {};
    qt.forEach(function (t) { set[t] = true; });
    var total = 0;
    Object.keys(set).forEach(function (t) { total += weight(t); });
    return data._index.map(function (entry) {
      var best = 0, extra = 0, covered = {};
      for (var k in entry.not) if (set[k]) return { faq: entry.faq, score: 0, coverage: 0 };
      entry.phrases.forEach(function (p) {
        for (var i = 0; i < p.toks.length; i++) if (!set[p.toks[i]]) return;
        p.toks.forEach(function (t) { covered[t] = true; });
        if (p.w > best) { if (best) extra++; best = p.w; } else extra++;
      });
      var cw = 0;
      Object.keys(covered).forEach(function (t) { cw += weight(t); });
      return {
        faq: entry.faq,
        score: best ? Math.round((best + 0.1 * extra) * 100) / 100 : 0,
        coverage: total ? cw / total : 0
      };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  /*
   * Returns { type: 'answer'|'greeting'|'thanks'|'ai', ... }.
   * 'ai' means: not confident, send to the backend. `suggestions` are the closest FAQs.
   */
  function match(question, data, opts) {
    opts = opts || {};
    var qt = tokens(question);
    var meaningful = qt.filter(function (t) { return weight(t) > 0; });

    if (qt.length && qt.length <= 4 && qt.every(function (t) { return GREETINGS[t] || STOP[t]; })) {
      return { type: 'greeting' };
    }
    if (qt.length && qt.length <= 5 && qt.every(function (t) { return THANKS[t] || STOP[t] || GREETINGS[t]; })) {
      return { type: 'thanks' };
    }

    var ranked = rank(question, data);
    var top = ranked[0], second = ranked[1] || { score: 0 };
    var suggestions = ranked.filter(function (r) { return r.score > 0; }).slice(0, 3).map(function (r) { return r.faq.q; });

    // Hindi/Kannada script, long or multi-part questions, and follow-ups go to the AI.
    var nonLatin = /[^\x00-\x7f]/.test(String(question).replace(/₹/g, ''));
    var tooLong = meaningful.length > 10;
    var followUp = opts.hasHistory && meaningful.length <= 3 && (!top || top.score < 2);

    // Confident when one FAQ clearly wins: either it's the only match, or it leads clearly.
    // Also require the FAQ to cover at least half of what was asked, so
    // "refund if I cancel my plan" doesn't get the plans answer.
    var confident = top && top.score >= 0.9 && top.coverage >= 0.5 && (
      second.score === 0 ||
      (top.score - second.score >= 0.5 && top.score >= 1.35 * second.score)
    );

    if (!confident || nonLatin || tooLong || followUp) {
      return { type: 'ai', suggestions: suggestions, score: top ? top.score : 0, coverage: top ? top.coverage : 0 };
    }
    return {
      type: 'answer',
      id: top.faq.id,
      question: top.faq.q,
      answer: fill(top.faq.a, data),
      score: top.score,
      suggestions: suggestions.slice(1)
    };
  }

  function answerFor(questionText, data) {
    if (!data._index) prepare(data);
    for (var i = 0; i < data.faqs.length; i++) {
      if (data.faqs[i].q === questionText) return fill(data.faqs[i].a, data);
    }
    return null;
  }

  return { match: match, rank: rank, fill: fill, tokens: tokens, prepare: prepare, answerFor: answerFor };
});
