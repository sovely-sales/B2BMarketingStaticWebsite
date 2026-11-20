/*
 * Sovely FAQ chatbot.
 * 1. Common questions are answered in the browser from data/faq.json (js/faq-match.js),
 *    with no server call.
 * 2. Anything else goes to POST /api/v1/chat/dropshipping on the Sovely backend (Gemini).
 * 3. If the backend is down or out of quota, the closest FAQs are offered as buttons.
 * Override the endpoint with <script src="js/chatbot.js" data-api="..."> for testing.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var API_URL =
    (script && script.getAttribute('data-api')) ||
    'https://sovely-backend.onrender.com/api/v1/chat/dropshipping';
  var WHATSAPP_URL =
    'https://wa.me/919353215891?text=Hi%20Sovely%2C%20I%20have%20a%20question%20about%20dropshipping.';
  var STORAGE_KEY = 'sovely_chat_history';
  var MAX_HISTORY = 10;
  var GREETING =
    "Hi! I'm the Sovely assistant. Ask me about plans, delivery charges, COD, Amazon support or how dropshipping with Sovely works.";
  // FAQ ids shown as starter buttons (see data/faq.json).
  var STARTER_FAQS = ['plans', 'delivery', 'inventory', 'payout'];
  var STARTER_FALLBACK = ['What do the plans cost?', 'How does delivery work?', 'Do I need inventory?', 'How do I get my profit?'];

  var scriptSrc = (script && script.src) || location.href;
  var FAQ_URL = (script && script.getAttribute('data-faq')) || new URL('../data/faq.json', scriptSrc).href;
  var MATCHER_URL = new URL('faq-match.js', scriptSrc).href;

  var history = loadHistory();
  var busy = false;
  var faqData = null;
  var lastSuggestions = [];

  loadFaq();

  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>';
  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var launcher = el('button', 'sv-chat-launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'svChatPanel');
  launcher.setAttribute('aria-label', 'Open Sovely assistant');
  launcher.innerHTML = ICON_CHAT + '<span class="sv-chat-launcher-label">Ask Sovely</span><span class="sv-dot" aria-hidden="true"></span>';

  var panel = el('section', 'sv-chat-panel');
  panel.id = 'svChatPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Sovely assistant');
  panel.innerHTML =
    '<div class="sv-chat-head">' +
    '<div class="sv-chat-avatar" aria-hidden="true">S</div>' +
    '<div><strong>Sovely assistant</strong><span>Answers about dropshipping with Sovely</span></div>' +
    '<button type="button" class="sv-chat-close" aria-label="Close chat">&times;</button>' +
    '</div>' +
    '<div class="sv-chat-body" aria-live="polite"></div>' +
    '<form class="sv-chat-form">' +
    '<input type="text" maxlength="500" autocomplete="off" placeholder="Type your question" aria-label="Your question">' +
    '<button type="submit" class="sv-chat-send" aria-label="Send">' + ICON_SEND + '</button>' +
    '</form>' +
    '<div class="sv-chat-foot">AI answers can be wrong. For order issues, <a href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">chat on WhatsApp</a>.</div>';

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  var body = panel.querySelector('.sv-chat-body');
  var form = panel.querySelector('.sv-chat-form');
  var input = form.querySelector('input');
  var sendBtn = form.querySelector('.sv-chat-send');

  renderAll();

  launcher.addEventListener('click', function () { toggle(); });
  panel.querySelector('.sv-chat-close').addEventListener('click', function () { toggle(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });

  function toggle(force) {
    var open = typeof force === 'boolean' ? force : !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close Sovely assistant' : 'Open Sovely assistant');
    if (open) {
      input.focus();
      scrollDown();
    }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    input.value = '';
    var hadHistory = history.length > 0;
    history.push({ role: 'user', content: text });
    saveHistory();
    renderAll();

    var local = localAnswer(text, hadHistory);
    if (local) {
      replyLocally(local.text, local.suggestions);
      return;
    }
    ask();
  }

  // Answers from data/faq.json without calling the server. Returns null when unsure.
  function localAnswer(text, hadHistory) {
    if (!faqData || !window.SovelyFaq) return null;
    var r;
    try { r = window.SovelyFaq.match(text, faqData, { hasHistory: hadHistory }); } catch (e) { return null; }
    lastSuggestions = r.suggestions || [];
    if (r.type === 'greeting') return { text: 'Hi! What would you like to know about selling with Sovely?', suggestions: [] };
    if (r.type === 'thanks') return { text: "You're welcome! Ask me anything else, or tap Get Started on the page when you're ready.", suggestions: [] };
    if (r.type === 'answer') return { text: r.answer, suggestions: (r.suggestions || []).slice(0, 2) };
    return null;
  }

  // Starter or suggestion button: answer that exact FAQ.
  function sendFaq(question) {
    if (busy) return;
    var answer = faqData && window.SovelyFaq ? window.SovelyFaq.answerFor(question, faqData) : null;
    if (!answer) return send(question);
    history.push({ role: 'user', content: question });
    saveHistory();
    renderAll();
    replyLocally(answer, []);
  }

  function replyLocally(text, suggestions) {
    busy = true;
    sendBtn.disabled = true;
    var typing = addBubble('bot', '');
    typing.innerHTML = '<span class="sv-typing" aria-label="Typing"><i></i><i></i><i></i></span>';
    scrollDown();
    setTimeout(function () {
      busy = false;
      sendBtn.disabled = false;
      history.push({ role: 'assistant', content: text });
      saveHistory();
      renderAll();
      if (suggestions && suggestions.length) addChips(suggestions, 'Related questions');
      input.focus();
    }, 450);
  }

  function loadFaq() {
    var matcherReady = window.SovelyFaq ? Promise.resolve() : new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = MATCHER_URL;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
    var dataReady = fetch(FAQ_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    Promise.all([matcherReady, dataReady]).then(function (res) {
      if (res[1] && window.SovelyFaq) {
        faqData = window.SovelyFaq.prepare(res[1]);
        if (faqData.contact && faqData.contact.whatsappUrl) WHATSAPP_URL = faqData.contact.whatsappUrl;
        if (history.length === 0 && body) renderAll();
      }
    });
  }

  function ask() {
    busy = true;
    sendBtn.disabled = true;
    var typing = addBubble('bot', '');
    typing.innerHTML = '<span class="sv-typing" aria-label="Typing"><i></i><i></i><i></i></span>';
    scrollDown();

    // The backend sleeps when idle (Render free tier) and can take ~30s to wake.
    var slowTimer = setTimeout(function () {
      var note = addBubble('note', 'Waking up the assistant, this can take a few seconds…');
      note.setAttribute('data-slow', '1');
      scrollDown();
    }, 6000);

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var abortTimer = setTimeout(function () { if (controller) controller.abort(); }, 60000);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (res.status === 429) {
            return json.message || 'You have sent a lot of messages. Please wait a few minutes or chat with us on WhatsApp.';
          }
          return (res.ok && json && json.data && json.data.reply) || null;
        });
      })
      .catch(function () { return null; })
      .then(function (reply) {
        clearTimeout(slowTimer);
        clearTimeout(abortTimer);
        busy = false;
        sendBtn.disabled = false;
        if (reply) {
          history.push({ role: 'assistant', content: reply });
          saveHistory();
          renderAll();
        } else {
          renderAll();
          if (lastSuggestions.length) {
            addBubble('bot', "I couldn't look that up right now. These might help, or message the team on WhatsApp: ")
              .appendChild(link(WHATSAPP_URL, '+91 93532 15891'));
            addChips(lastSuggestions, 'Closest answers');
          } else {
            addBubble('bot', "Sorry, I couldn't connect just now. You can try again, or message the team on WhatsApp: ")
              .appendChild(link(WHATSAPP_URL, '+91 93532 15891'));
          }
          scrollDown();
        }
        input.focus();
      });
  }

  function renderAll() {
    body.innerHTML = '';
    addBubble('bot', GREETING);
    if (history.length === 0) addChips(starterQuestions());
    history.forEach(function (m) {
      addBubble(m.role === 'user' ? 'user' : 'bot', m.content);
    });
    scrollDown();
  }

  // Text is inserted with textContent (never innerHTML) so replies can't inject markup.
  // WhatsApp numbers in replies become a tap-to-chat link.
  function addBubble(kind, text) {
    var b = el('div', 'sv-msg ' + kind);
    text = String(text).replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1');
    var parts = String(text).split(/(\+91[\s-]?93532[\s-]?15891)/);
    parts.forEach(function (p, i) {
      if (i % 2 === 1) b.appendChild(link(WHATSAPP_URL, p));
      else if (p) b.appendChild(document.createTextNode(p.replace(/\*\*(.+?)\*\*/g, '$1')));
    });
    body.appendChild(b);
    return b;
  }

  function starterQuestions() {
    if (!faqData) return STARTER_FALLBACK;
    var byId = {};
    faqData.faqs.forEach(function (f) { byId[f.id] = f.q; });
    return STARTER_FAQS.map(function (id) { return byId[id]; }).filter(Boolean);
  }

  function addChips(questions, label) {
    var wrap = el('div', 'sv-chips');
    if (label) {
      var l = el('span', 'sv-chips-label');
      l.textContent = label;
      wrap.appendChild(l);
    }
    questions.forEach(function (q) {
      var b = el('button', 'sv-chip');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', function () { sendFaq(q); });
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollDown();
  }

  function link(href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = text;
    return a;
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    n.className = cls;
    return n;
  }

  function scrollDown() {
    body.scrollTop = body.scrollHeight;
  }

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    history = history.slice(-MAX_HISTORY);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (e) { /* storage blocked */ }
  }
})();
