/**
 * RETROZEN DRIVING - GOOGLE GEMINI AI COMPANION
 * Connects securely to the backend /api/gemini & /api/set-key endpoints.
 * Features:
 * - General Conversational AI: Ask anything (science, coding, philosophy, trivia, stories)
 * - Multi-turn conversation memory
 * - Zen Driving Navigator: Recommends custom maps, time of day, lo-fi tracks, and atmosphere
 * - In-app Gemini API Key activator (UI modal or paste key directly in chat)
 * - One-click "Apply Zen Trip" button when journey suggestions are generated
 * - Retro arcade SFX & pixelated terminal UI
 */

class GeminiAICompanion {
  constructor() {
    this.drawer = null;
    this.chatBody = null;
    this.input = null;
    this.submitBtn = null;
    this.keyStatusBtn = null;
    this.keyPanel = null;
    this.keyInput = null;
    this.keySaveBtn = null;
    this.keyMsg = null;
    this.isOpen = false;
    this.isProcessing = false;
    this.isKeyActive = false;
    this.latestRecommendation = null;
    this.chatHistory = []; // { role: 'user' | 'model', text: string }
  }

  init() {
    this.drawer = document.getElementById('ai-drawer');
    this.chatBody = document.getElementById('ai-chat-body');
    this.input = document.getElementById('ai-input');
    this.submitBtn = document.getElementById('ai-submit-btn');

    // Key management elements
    this.keyStatusBtn = document.getElementById('ai-key-status-btn');
    this.keyPanel = document.getElementById('ai-key-panel');
    this.keyInput = document.getElementById('ai-key-input');
    this.keySaveBtn = document.getElementById('ai-key-save-btn');
    this.keyMsg = document.getElementById('ai-key-msg');

    // Drawer toggle buttons
    const openBtn = document.getElementById('open-ai-btn');
    const closeBtn = document.getElementById('close-ai-btn');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (window.retroAudio) window.retroAudio.playArcadeClick('select');
        this.toggleDrawer(true);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (window.retroAudio) window.retroAudio.playArcadeClick('back');
        this.toggleDrawer(false);
      });
    }

    // Toggle API Key Panel
    if (this.keyStatusBtn && this.keyPanel) {
      this.keyStatusBtn.addEventListener('click', () => {
        if (window.retroAudio) window.retroAudio.playArcadeClick('select');
        const isHidden = this.keyPanel.style.display === 'none';
        this.keyPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden && this.keyInput) {
          setTimeout(() => this.keyInput.focus(), 100);
        }
      });
    }

    // Save API Key button
    if (this.keySaveBtn && this.keyInput) {
      this.keySaveBtn.addEventListener('click', () => {
        const key = (this.keyInput.value || '').trim();
        if (key) {
          this.submitApiKey(key);
        }
      });
      this.keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const key = (this.keyInput.value || '').trim();
          if (key) this.submitApiKey(key);
        }
      });
    }

    // Submit handler for main chat input
    if (this.submitBtn && this.input) {
      this.submitBtn.addEventListener('click', () => this.sendMessage());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Quick Mood / Prompt Chips
    document.querySelectorAll('.mood-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (window.retroAudio) window.retroAudio.playArcadeClick('select');
        const text = chip.getAttribute('data-prompt') || chip.textContent.trim();
        if (this.input) {
          this.input.value = text;
          this.sendMessage();
        }
      });
    });

    // Check backend health & Gemini status
    this.checkStatus();
  }

  async checkStatus() {
    try {
      const localKey = localStorage.getItem('retrozen_api_key');
      const res = await fetch('/api/status');
      const data = await res.json();
      this.isKeyActive = !!(data.geminiConfigured || localKey);
      this.updateKeyBadge();
    } catch (e) {
      const localKey = localStorage.getItem('retrozen_api_key');
      if (localKey) {
        this.isKeyActive = true;
        this.updateKeyBadge();
      }
    }
  }

  updateKeyBadge() {
    if (!this.keyStatusBtn) return;
    if (this.isKeyActive) {
      this.keyStatusBtn.textContent = '🔑 ACTIVE';
      this.keyStatusBtn.classList.add('active');
      this.keyStatusBtn.title = 'Google Gemini is active and connected!';
    } else {
      this.keyStatusBtn.textContent = '🔑 SET KEY';
      this.keyStatusBtn.classList.remove('active');
      this.keyStatusBtn.title = 'Click to enter your free Gemini API key';
    }
  }

  toggleDrawer(open = null) {
    this.isOpen = open !== null ? open : !this.isOpen;
    if (this.drawer) {
      if (this.isOpen) {
        this.drawer.classList.add('open');
        setTimeout(() => this.input && this.input.focus(), 300);
      } else {
        this.drawer.classList.remove('open');
      }
    }
  }

  openKeyPanel() {
    if (this.keyPanel) {
      this.keyPanel.style.display = 'block';
      setTimeout(() => this.keyInput && this.keyInput.focus(), 100);
    }
  }

  async submitApiKey(apiKey) {
    if (!apiKey) return;
    if (window.retroAudio) window.retroAudio.playArcadeClick('select');

    if (this.keyMsg) {
      this.keyMsg.className = 'ai-key-msg';
      this.keyMsg.style.display = 'block';
      this.keyMsg.innerHTML = '<span style="color:var(--text-cyan);">Verifying key with Google Gemini API...</span>';
    }

    try {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      const data = await res.json();

      if (data.success) {
        this.isKeyActive = true;
        localStorage.setItem('retrozen_api_key', apiKey);
        this.updateKeyBadge();

        if (this.keyMsg) {
          this.keyMsg.className = 'ai-key-msg success';
          this.keyMsg.innerHTML = '✅ Key verified & activated!';
        }

        if (window.retroAudio) window.retroAudio.playArcadeClick('fanfare');

        // Close panel after 1.2s
        setTimeout(() => {
          if (this.keyPanel) this.keyPanel.style.display = 'none';
          if (this.keyInput) this.keyInput.value = '';
          if (this.keyMsg) this.keyMsg.style.display = 'none';
        }, 1200);

        // Add confirmation in chat
        this.appendMessage('bot', `✨ **Google Gemini API Key Connected!**\n\nI am now live and ready to talk about **anything** — science, coding, philosophy, history, stories, trivia, or custom retro drives! What would you like to explore?`);
      } else {
        if (this.keyMsg) {
          this.keyMsg.className = 'ai-key-msg error';
          this.keyMsg.innerHTML = `⚠️ ${data.error || 'Verification failed.'}`;
        }
      }
    } catch (err) {
      if (this.keyMsg) {
        this.keyMsg.className = 'ai-key-msg error';
        this.keyMsg.innerHTML = `⚠️ Connection error: ${err.message}`;
      }
    }
  }

  formatMarkdown(raw) {
    if (!raw) return '';

    // 1. Sanitize HTML tags to prevent XSS
    let text = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Code blocks ```lang ... ```
    text = text.replace(/```(?:[a-zA-Z0-9_\-]+)?\n?([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // 3. Inline code `code`
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 4. Bold **text** or __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 5. Italic *text* or _text_
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 6. Unordered lists (- item or * item)
    text = text.replace(/(?:^[ \t]*[-*][ \t]+(.+)$)+/gm, (match) => {
      const items = match.trim().split(/\r?\n/);
      const lis = items.map(line => {
        const itemText = line.replace(/^[ \t]*[-*][ \t]+/, '');
        return `<li>${itemText}</li>`;
      }).join('');
      return `<ul>${lis}</ul>`;
    });

    // 7. Line breaks: double newline -> paragraph, single newline -> <br>
    const parts = text.split(/(<pre>[\s\S]*?<\/pre>|<ul>[\s\S]*?<\/ul>)/g);
    text = parts.map(part => {
      if (part.startsWith('<pre>') || part.startsWith('<ul>')) {
        return part;
      }
      return part
        .replace(/\r?\n\r?\n/g, '<br><br>')
        .replace(/\r?\n/g, '<br>');
    }).join('');

    return text;
  }

  async sendMessage() {
    if (this.isProcessing) return;
    const text = (this.input?.value || '').trim();
    if (!text) return;

    if (window.retroAudio) window.retroAudio.playArcadeClick('select');

    // If user pasted an API key directly into the chat input
    if (/^(?:AIza|AQ\.)[0-9A-Za-z-_]{20,}$/.test(text)) {
      this.input.value = '';
      this.submitApiKey(text);
      return;
    }

    // Add User Message to UI
    this.appendMessage('user', this.formatMarkdown(text));
    this.input.value = '';
    this.isProcessing = true;

    // Record user message in conversational history
    this.chatHistory.push({ role: 'user', text: text });
    if (this.chatHistory.length > 14) {
      this.chatHistory = this.chatHistory.slice(-14);
    }

    // Add Loading Indicator Bubble
    const loadingBubble = this.appendMessage('bot', '<span style="color:var(--text-cyan);">Google Gemini is thinking... [■■■□□□]</span>');

    try {
      const activeKey = localStorage.getItem('retrozen_api_key') || '';
      // Send message + conversational context + apiKey to backend
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          history: this.chatHistory.slice(0, -1),
          apiKey: activeKey
        })
      });

      const data = await res.json();

      if (loadingBubble && loadingBubble.parentNode) {
        loadingBubble.remove();
      }

      if (data.keyActivated) {
        this.isKeyActive = true;
        this.updateKeyBadge();
        if (window.retroAudio) window.retroAudio.playArcadeClick('fanfare');
      }

      if (data.success) {
        const replyText = data.text || 'I am here to help!';
        this.chatHistory.push({ role: 'model', text: replyText });
        if (this.chatHistory.length > 14) {
          this.chatHistory = this.chatHistory.slice(-14);
        }

        this.renderBotResponse(replyText, data.trip, data.isMock, data.info, data.apiError, data.needsKey);
      } else {
        this.appendMessage('bot', `⚠️ Could not get AI response: ${data.error || 'Unknown error'}`);
      }

    } catch (err) {
      console.error('[Gemini Client Error]', err);
      if (loadingBubble && loadingBubble.parentNode) {
        loadingBubble.remove();
      }
      this.appendMessage('bot', '⚠️ Connection to Zen Gemini server lost. Please check if the server is running.');
    } finally {
      this.isProcessing = false;
    }
  }

  appendMessage(sender, htmlContent) {
    if (!this.chatBody) return null;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = htmlContent;
    this.chatBody.appendChild(bubble);
    this.chatBody.scrollTop = this.chatBody.scrollHeight;
    return bubble;
  }

  renderBotResponse(text, trip = null, isMock = false, extraInfo = '', apiError = '', needsKey = false) {
    const mapNames = {
      'tokyo': 'Sci-Fi Tokyo Expressway',
      'hillside': 'Rolling Hillside Fields',
      'london': 'Streets of London',
      'snow': 'Snowy Alpine Peaks',
      'times_square': 'New York Times Square',
      'istiklal': 'Istiklal Street, Istanbul'
    };

    const beatNames = {
      1: 'Shibuya Sunset',
      2: 'Green Hill Breeze',
      3: 'London Drizzle Jazz',
      4: 'Alpine Solitude',
      5: 'Times Square Midnight',
      6: 'Istiklal Twilight'
    };

    const container = document.createElement('div');
    container.className = 'chat-bubble bot';

    // Main text response formatted with markdown
    let html = `<div class="bot-text-content" style="color: var(--text-primary); line-height: 1.45;">${this.formatMarkdown(text)}</div>`;

    // If an interactive Zen Trip was recommended, render the trip card!
    if (trip && trip.mapId) {
      this.latestRecommendation = trip;

      let safeMode = trip.mode || 'car';
      if (trip.mapId === 'istiklal' && safeMode === 'car') {
        safeMode = 'walk';
      }

      html += `
        <div class="rec-card" style="margin-top: 10px;">
          <div style="color: var(--yellow-retro); font-weight: bold; margin-bottom: 6px; font-size: 14px; text-transform: uppercase;">
            ✦ RECOMMENDED ZEN JOURNEY ✦
          </div>
          <div class="rec-item">
            <span class="rec-label">🗺️ Route:</span>
            <span class="rec-value">${mapNames[trip.mapId] || trip.mapId}</span>
          </div>
          <div class="rec-item">
            <span class="rec-label">⏰ Timing:</span>
            <span class="rec-value">${(trip.timeOfDay || 'sunset').toUpperCase()}</span>
          </div>
          <div class="rec-item">
            <span class="rec-label">🎵 Lo-Fi Beat:</span>
            <span class="rec-value">#${trip.beatTrack || 1}: ${beatNames[trip.beatTrack] || 'Chill Beat'}</span>
          </div>
          <div class="rec-item">
            <span class="rec-label">🌧️ Rain Ambience:</span>
            <span class="rec-value">${trip.rain ? 'ON' : 'OFF'}</span>
          </div>
          <div class="rec-item">
            <span class="rec-label">💽 Vinyl Crackle:</span>
            <span class="rec-value">${trip.vinyl ? 'ON' : 'OFF'}</span>
          </div>
          <div class="rec-item">
            <span class="rec-label">🕹️ Travel Mode:</span>
            <span class="rec-value">${safeMode.toUpperCase()}</span>
          </div>

          <button class="apply-trip-btn" id="apply-rec-${Date.now()}">
            ✨ [ APPLY THIS ZEN TRIP NOW ]
          </button>
        </div>
      `;
    }

    // If key is needed to chat freely, show direct activation button
    if (needsKey) {
      html += `
        <button class="open-key-panel-btn" style="margin-top: 10px; width: 100%; background: var(--yellow-retro); color: #000; font-family: var(--font-pixel); font-size: 9px; padding: 7px; border: 2px solid #000; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 0 #b45309;">
          🔑 [ CLICK TO ENTER GEMINI API KEY ]
        </button>
      `;
    }

    if (isMock && extraInfo && !needsKey) {
      html += `<div style="font-size: 13px; color: #94a3b8; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 6px;">ℹ️ ${extraInfo}</div>`;
    }

    if (apiError) {
      html += `<div style="font-size: 12px; color: #ef4444; margin-top: 6px;">⚠️ Gemini Notice: ${apiError}</div>`;
    }

    container.innerHTML = html;
    this.chatBody.appendChild(container);

    // Attach click handler for trip apply
    const btn = container.querySelector('.apply-trip-btn');
    if (btn && trip) {
      btn.addEventListener('click', () => {
        this.applyRecommendation(trip);
      });
    }

    // Attach click handler for open key panel button
    const keyBtn = container.querySelector('.open-key-panel-btn');
    if (keyBtn) {
      keyBtn.addEventListener('click', () => {
        this.openKeyPanel();
      });
    }

    this.chatBody.scrollTop = this.chatBody.scrollHeight;
  }

  applyRecommendation(trip) {
    if (!trip) return;

    if (window.retroAudio) {
      window.retroAudio.playArcadeClick('fanfare');
    }

    // 1. Change Map
    if (window.retroGame && trip.mapId) {
      window.retroGame.setMap(trip.mapId);
    }

    // 2. Change Time of Day
    if (window.retroGame && trip.timeOfDay) {
      window.retroGame.setTimeOfDay(trip.timeOfDay);
    }

    // 3. Set Travel Mode
    let safeMode = trip.mode || 'car';
    if (trip.mapId === 'istiklal' && safeMode === 'car') {
      safeMode = 'walk';
    }
    if (window.retroGame && safeMode) {
      window.retroGame.setMode(safeMode);
    }

    // 4. Configure Audio
    if (window.retroAudio) {
      if (typeof trip.vinyl === 'boolean') {
        window.retroAudio.toggleVinyl(trip.vinyl);
        const vinylBtn = document.getElementById('toggle-vinyl-btn');
        if (vinylBtn) vinylBtn.classList.toggle('active', trip.vinyl);
      }

      if (typeof trip.rain === 'boolean') {
        window.retroAudio.toggleRain(trip.rain);
        const rainBtn = document.getElementById('toggle-rain-btn');
        if (rainBtn) rainBtn.classList.toggle('active', trip.rain);
        const rainOverlay = document.getElementById('windshield-rain');
        if (rainOverlay) rainOverlay.classList.toggle('active', trip.rain);
      }

      if (trip.beatTrack) {
        window.retroAudio.setMusicTrack(trip.beatTrack);
        window.retroAudio.startMusic();
        const musicSelect = document.getElementById('music-track-select');
        if (musicSelect) musicSelect.value = trip.beatTrack;
        const musicBtn = document.getElementById('toggle-music-btn');
        if (musicBtn) musicBtn.textContent = 'PAUSE';
      }
    }

    // Close drawer after 500ms
    setTimeout(() => {
      this.toggleDrawer(false);
    }, 500);
  }
}

window.retroGemini = new GeminiAICompanion();
