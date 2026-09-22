// ==UserScript==
// @name         youtube.txt
// @namespace    https://github.com/abstraction/youtube.txt
// @version      1.2.1
// @description  Send YouTube videos to local youtube.txt for processing (Floating Hydration-Immune Widget)
// @match        *://www.youtube.com/*
// @exclude      *://accounts.youtube.com/*
// @exclude      *://*.youtube.com/embed/*
// @connect      localhost
// @connect      127.0.0.1
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Never run in hidden iframe (e.g. RotateCookiesPage, ad iframes)
  if (window.top !== window.self) return;

  const SERVER_URL = 'http://127.0.0.1:8384';
  const PILL_ID = 'yt-txt-floating-pill';
  const STORAGE_KEY_POS = 'yt_txt_pill_position_v1';

  // Global state: videoUrl -> { jobId, state, viewUrl, detail }
  const jobs = new Map();
  let serverOnline = false;

  // --- Styles ---
  function injectStyles(css) {
    if (typeof GM_addStyle === 'function') {
      try {
        GM_addStyle(css);
        return;
      } catch (e) {}
    }
    const style = document.createElement('style');
    style.id = 'yt-txt-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  injectStyles(`
    #${PILL_ID} {
      position: fixed;
      top: 72px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 15px;
      border-radius: 9999px;
      background: rgba(18, 18, 18, 0.9);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
      color: #f5f5f5;
      font-family: "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease, opacity 0.25s ease, box-shadow 0.2s ease;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-4px);
    }
    #${PILL_ID}.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
    #${PILL_ID}:hover {
      background: rgba(28, 28, 28, 0.96);
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
      transform: translateY(-2px);
    }
    #${PILL_ID}:active {
      transform: translateY(0) scale(0.98);
    }
    #${PILL_ID}.dragging {
      opacity: 0.85;
      cursor: grabbing;
      transition: none;
    }
    .yt-txt-pill-icon {
      font-size: 15px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .yt-txt-pill-title {
      letter-spacing: -0.01em;
    }
    .yt-txt-pill-badge {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(62, 166, 255, 0.15);
      color: #3ea6ff;
      white-space: nowrap;
      display: none;
    }
    .yt-txt-pill-badge.active {
      display: inline-block;
    }
    .yt-txt-pill-badge.done {
      background: rgba(43, 166, 64, 0.18);
      color: #2ba640;
    }
    .yt-txt-pill-badge.error {
      background: rgba(255, 78, 69, 0.18);
      color: #ff4e45;
    }
    .yt-txt-pill-badge.offline {
      background: rgba(255, 171, 0, 0.18);
      color: #ffab00;
    }
    .yt-txt-toast {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 2147483647;
      background: rgba(18, 18, 18, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(16px);
      color: #fff;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.55);
      font-family: 'Roboto', -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      max-width: 360px;
      animation: ytTxtSlideUp 0.3s ease-out;
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
    }
    @keyframes ytTxtSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .yt-txt-toast-title {
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #3ea6ff;
    }
    .yt-txt-toast-body {
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    }
    .yt-txt-toast-close {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 4px;
    }
  `);

  function showToast(title, message, duration = 6500) {
    const existing = document.querySelector('.yt-txt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'yt-txt-toast';

    const titleEl = document.createElement('div');
    titleEl.className = 'yt-txt-toast-title';
    titleEl.textContent = `🚀 ${title}`;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'yt-txt-toast-body';
    bodyEl.textContent = message;

    const closeEl = document.createElement('div');
    closeEl.className = 'yt-txt-toast-close';
    closeEl.textContent = 'Click to dismiss • safe to close this tab';

    toast.appendChild(titleEl);
    toast.appendChild(bodyEl);
    toast.appendChild(closeEl);

    toast.addEventListener('click', () => toast.remove());
    const mountTarget = document.body || document.documentElement;
    mountTarget.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.isConnected) {
          toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          setTimeout(() => toast.remove(), 400);
        }
      }, duration);
    }
  }

  // --- Server Communication ---

  function healthCheck() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `${SERVER_URL}/api/health`,
      timeout: 2000,
      onload: function (response) {
        serverOnline = response.status === 200;
        updatePillUI();
      },
      onerror: function () {
        serverOnline = false;
        updatePillUI();
      },
      ontimeout: function () {
        serverOnline = false;
        updatePillUI();
      },
    });
  }

  function submitJob(videoUrl, force = false) {
    setPillState('connecting', 'Connecting...');

    GM_xmlhttpRequest({
      method: 'POST',
      url: `${SERVER_URL}/api/process`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ url: videoUrl, force }),
      onload: function (response) {
        serverOnline = true;
        if (response.status >= 200 && response.status < 300) {
          try {
            const data = JSON.parse(response.responseText);
            const jobId = data.id;

            if (data.status === 'completed') {
              showToast(
                'Already Generated!',
                'Opened the generated webpage in a new tab.',
                5000
              );
              jobs.set(videoUrl, {
                jobId,
                state: 'done',
                detail: 'Ready (opened)',
                viewUrl: data.viewUrl || `/view/${jobId}/index.html`,
              });
              updatePillUI();
              return;
            }

            const isQueued =
              data.status === 'queued' && (data.position || 0) > 0;
            const toastTitle = isQueued
              ? `Queued at #${data.position}`
              : 'Processing in background!';
            const toastMsg = isQueued
              ? 'Your video is queued behind active jobs. You can safely close this tab! It will automatically open in your browser when ready.'
              : 'Video is downloading and processing in background. You can safely close this tab! It will automatically open in your browser when ready.';

            showToast(toastTitle, toastMsg, 7000);

            jobs.set(videoUrl, {
              jobId,
              state: 'processing',
              detail: isQueued ? `Queue #${data.position}` : 'Processing',
              viewUrl: null,
            });
            updatePillUI();
            trackJobStatus(jobId, videoUrl);
          } catch (e) {
            updateJobState(videoUrl, {
              state: 'error',
              detail: 'Invalid response',
            });
          }
        } else {
          updateJobState(videoUrl, {
            state: 'error',
            detail: `HTTP ${response.status}`,
          });
        }
      },
      onerror: function () {
        serverOnline = false;
        updateJobState(videoUrl, { state: 'error', detail: 'Server Offline' });
        showToast(
          'Server Offline',
          `youtube.txt server is not running at ${SERVER_URL}.\nRun 'youtube.txt serve' in terminal.`,
          6000
        );
      },
      ontimeout: function () {
        serverOnline = false;
        updateJobState(videoUrl, { state: 'error', detail: 'Timeout' });
      },
    });
  }

  function trackJobStatus(jobId, videoUrl) {
    let pollTimer = null;

    function poll() {
      const currentJob = jobs.get(videoUrl);
      if (!currentJob || currentJob.state === 'done') {
        if (pollTimer) clearInterval(pollTimer);
        return;
      }

      GM_xmlhttpRequest({
        method: 'GET',
        url: `${SERVER_URL}/api/status/${jobId}?format=json`,
        headers: { Accept: 'application/json' },
        timeout: 4000,
        onload: function (res) {
          if (res.status >= 200 && res.status < 300) {
            try {
              const event = JSON.parse(res.responseText);
              handleServerEvent(videoUrl, event);

              if (event.phase === 'completed' || event.phase === 'error') {
                if (pollTimer) clearInterval(pollTimer);
              }
            } catch (err) {
              // Ignore partial JSON
            }
          }
        },
      });
    }

    poll();
    pollTimer = setInterval(poll, 1500);
  }

  function handleServerEvent(videoUrl, event) {
    let job = jobs.get(videoUrl) || {};

    switch (event.phase) {
      case 'queued':
        job.state = 'queued';
        job.detail = `Queue #${event.position || '...'}`;
        break;
      case 'downloading':
        job.state = 'processing';
        job.detail = `Download ${event.progress || 0}%`;
        break;
      case 'parsing':
        job.state = 'processing';
        job.detail = 'Parsing captions';
        break;
      case 'extracting':
        job.state = 'processing';
        job.detail = `Frames ${event.progress || 0}%`;
        break;
      case 'generating':
        job.state = 'processing';
        job.detail = 'Generating HTML';
        break;
      case 'completed':
        job.state = 'done';
        job.viewUrl = event.viewUrl;
        job.detail = 'Ready';
        if (videoUrl === getCurrentVideoUrl()) {
          setTimeout(() => resetJob(videoUrl), 15000);
        }
        break;
      case 'error':
        job.state = 'error';
        job.detail = event.message || 'Error';
        if (videoUrl === getCurrentVideoUrl()) {
          setTimeout(() => resetJob(videoUrl), 8000);
        }
        break;
    }

    jobs.set(videoUrl, job);
    updatePillUI();
  }

  function resetJob(videoUrl) {
    const job = jobs.get(videoUrl);
    if (job && (job.state === 'done' || job.state === 'error')) {
      jobs.delete(videoUrl);
      if (videoUrl === getCurrentVideoUrl()) {
        updatePillUI();
      }
    }
  }

  function updateJobState(videoUrl, updates) {
    let job = jobs.get(videoUrl) || {};
    Object.assign(job, updates);
    jobs.set(videoUrl, job);
    if (videoUrl === getCurrentVideoUrl()) {
      updatePillUI();
    }
  }

  // --- Floating Pill Widget (Mounted outside YouTube virtual DOM) ---

  let pillElement = null;

  function createFloatingPill() {
    if (pillElement && pillElement.isConnected) return pillElement;

    const existing = document.getElementById(PILL_ID);
    if (existing) existing.remove();

    const pill = document.createElement('div');
    pill.id = PILL_ID;
    pill.setAttribute('role', 'button');
    pill.setAttribute('aria-label', 'youtube.txt processor');
    const iconEl = document.createElement('span');
    iconEl.className = 'yt-txt-pill-icon';
    iconEl.textContent = '📄';

    const titleEl = document.createElement('span');
    titleEl.className = 'yt-txt-pill-title';
    titleEl.textContent = 'youtube.txt';

    const badgeEl = document.createElement('span');
    badgeEl.className = 'yt-txt-pill-badge';

    pill.appendChild(iconEl);
    pill.appendChild(titleEl);
    pill.appendChild(badgeEl);

    // Restore saved position if available
    try {
      const savedPos = localStorage.getItem(STORAGE_KEY_POS);
      if (savedPos) {
        const { top, left } = JSON.parse(savedPos);
        if (typeof top === 'number' && typeof left === 'number') {
          const safeTop = Math.max(10, Math.min(window.innerHeight - 50, top));
          const safeLeft = Math.max(
            10,
            Math.min(window.innerWidth - 100, left)
          );
          pill.style.top = `${safeTop}px`;
          pill.style.left = `${safeLeft}px`;
          pill.style.right = 'auto';
        }
      }
    } catch {}

    // Make Draggable without triggering click
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pillStartX = 0;
    let pillStartY = 0;
    let hasMoved = false;

    pill.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      isDragging = true;
      hasMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = pill.getBoundingClientRect();
      pillStartX = rect.left;
      pillStartY = rect.top;
      pill.classList.add('dragging');
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMoved = true;
      }
      const newX = Math.max(
        10,
        Math.min(window.innerWidth - pill.offsetWidth - 10, pillStartX + dx)
      );
      const newY = Math.max(
        10,
        Math.min(window.innerHeight - pill.offsetHeight - 10, pillStartY + dy)
      );
      pill.style.left = `${newX}px`;
      pill.style.top = `${newY}px`;
      pill.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      pill.classList.remove('dragging');
      if (hasMoved) {
        try {
          const rect = pill.getBoundingClientRect();
          localStorage.setItem(
            STORAGE_KEY_POS,
            JSON.stringify({ top: rect.top, left: rect.left })
          );
        } catch {}
      }
    });

    pill.addEventListener('click', (e) => {
      if (hasMoved) return; // Drag finish, not a click
      onPillClick(e);
    });

    // Mount to body or documentElement (outside YouTube virtual DOM)
    const mountTarget = document.body || document.documentElement;
    mountTarget.appendChild(pill);
    pillElement = pill;
    return pill;
  }

  function onPillClick(e) {
    const url = getCurrentVideoUrl();
    if (!url) return;

    if (isLiveVideo()) {
      alert('Live streams are not supported by youtube.txt');
      return;
    }

    const force = e && (e.shiftKey || e.ctrlKey || e.metaKey);
    const job = jobs.get(url);

    if (!job || force) {
      submitJob(url, force);
    } else if (job.state === 'processing' || job.state === 'queued') {
      showToast(
        'Already Processing',
        'This video is currently processing in the background. You can safely close this tab! It will automatically open in your browser when done.',
        4000
      );
    } else if (job.state === 'done' && job.viewUrl) {
      window.open(SERVER_URL + job.viewUrl, '_blank');
    } else if (job.state === 'error') {
      jobs.delete(url);
      submitJob(url);
    }
  }

  function setPillState(state, detail) {
    if (!pillElement) return;

    const iconEl = pillElement.querySelector('.yt-txt-pill-icon');
    const badgeEl = pillElement.querySelector('.yt-txt-pill-badge');
    if (!iconEl || !badgeEl) return;

    badgeEl.className = 'yt-txt-pill-badge';

    if (isLiveVideo()) {
      iconEl.textContent = '⚠️';
      badgeEl.textContent = 'Live stream';
      badgeEl.classList.add('active', 'error');
      return;
    }

    if (!serverOnline) {
      iconEl.textContent = '⚠️';
      badgeEl.textContent = 'Offline';
      badgeEl.classList.add('active', 'offline');
      return;
    }

    switch (state) {
      case 'idle':
        iconEl.textContent = '📄';
        badgeEl.textContent = '';
        break;
      case 'connecting':
        iconEl.textContent = '🔄';
        badgeEl.textContent = 'Connecting...';
        badgeEl.classList.add('active');
        break;
      case 'queued':
        iconEl.textContent = '⏳';
        badgeEl.textContent = detail || 'Queued';
        badgeEl.classList.add('active');
        break;
      case 'processing':
        iconEl.textContent = '⚡';
        badgeEl.textContent = detail || 'Processing';
        badgeEl.classList.add('active');
        break;
      case 'done':
        iconEl.textContent = '🌐';
        badgeEl.textContent = 'Open Webpage';
        badgeEl.classList.add('active', 'done');
        break;
      case 'error':
        iconEl.textContent = '❌';
        badgeEl.textContent = 'Retry';
        badgeEl.classList.add('active', 'error');
        break;
      default:
        iconEl.textContent = '📄';
        badgeEl.textContent = '';
    }
  }

  function updatePillUI() {
    const isWatchPage =
      location.pathname === '/watch' ||
      location.pathname.startsWith('/shorts/');
    const isFullscreen = !!document.fullscreenElement;

    if (!pillElement || !pillElement.isConnected) {
      createFloatingPill();
    }

    if (!isWatchPage || isFullscreen) {
      pillElement.classList.remove('visible');
      return;
    }

    pillElement.classList.add('visible');

    const url = getCurrentVideoUrl();
    const job = url ? jobs.get(url) : null;
    if (job) {
      setPillState(job.state, job.detail);
    } else {
      setPillState('idle');
    }
  }

  function isLiveVideo() {
    return (
      document.querySelector('.ytp-live') !== null ||
      document.querySelector('.ytp-live-badge[disabled]') !== null
    );
  }

  function getCurrentVideoUrl() {
    try {
      const url = new URL(location.href);
      const v = url.searchParams.get('v');
      if (v) {
        return url.origin + url.pathname + '?v=' + v;
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.origin + url.pathname;
      }
      return null;
    } catch {
      return null;
    }
  }

  // --- Lifecycle & Observers ---

  // 1. Fullscreen changes: auto-hide pill so video is never obscured
  document.addEventListener('fullscreenchange', updatePillUI);

  // 2. YouTube SPA navigation events (document + window for cross-browser reliability)
  document.addEventListener('yt-navigate-finish', updatePillUI);
  window.addEventListener('yt-navigate-finish', updatePillUI);
  document.addEventListener('yt-page-data-updated', updatePillUI);
  window.addEventListener('yt-page-data-updated', updatePillUI);
  window.addEventListener('popstate', updatePillUI);

  // Fast URL watcher for immediate route change detection
  let lastWatchedHref = location.href;
  setInterval(() => {
    if (location.href !== lastWatchedHref) {
      lastWatchedHref = location.href;
      updatePillUI();
    }
  }, 300);

  // 3. Tampermonkey extension menu command
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('📄 Generate youtube.txt', onPillClick);
  }

  // Periodic health check & UI refresh
  function init() {
    createFloatingPill();
    updatePillUI();
    healthCheck();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setInterval(healthCheck, 20000);
  setInterval(updatePillUI, 1500);
})();
