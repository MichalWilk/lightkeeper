/* Pages/PWA only (not part of the artifact): service worker registration and install hints.
   Chrome/Android: an "Install app" button appears when the browser offers the prompt.
   iOS Safari never prompts, so a short note explains Share -> Add to Home Screen until the game runs standalone. */
(() => {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  // iOS ignores user-scalable=no: block pinch and double-tap zoom so the playfield never drifts off screen
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
  let lastTap = 0;
  document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 300 && e.target && e.target.id === 'game') e.preventDefault(); lastTap = now; }, { passive: false });   // only the canvas: buttons keep their quick taps
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) return;
  let pl = false;
  try { const s = localStorage.getItem('lightkeeper.lang'); pl = s ? s === 'pl' : (navigator.language || '').toLowerCase().startsWith('pl'); } catch (e) { pl = (navigator.language || '').toLowerCase().startsWith('pl'); }
  const row = document.querySelector('#title .row');
  if (!row) return;
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    if (document.getElementById('installBtn')) return;
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'installBtn'; b.textContent = pl ? 'Zainstaluj' : 'Install app';
    b.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; b.remove(); });
    row.appendChild(b);
  });
  window.addEventListener('appinstalled', () => { const b = document.getElementById('installBtn'); if (b) b.remove(); });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    let seen = false; try { seen = localStorage.getItem('lightkeeper.iosHint') === '1'; } catch (e) {}
    if (seen) return;
    const p = document.createElement('p'); p.className = 'how'; p.id = 'iosHint';
    p.innerHTML = pl ? 'Na iPhonie: <b>Udostępnij</b> &rarr; <b>Do ekranu początkowego</b>, a gra zainstaluje się jak aplikacja i będzie działać offline.'
                     : 'On iPhone: <b>Share</b> &rarr; <b>Add to Home Screen</b> installs the game as an app that works offline.';
    const d = document.createElement('button'); d.className = 'ghost'; d.textContent = 'OK';
    d.addEventListener('click', () => { p.remove(); try { localStorage.setItem('lightkeeper.iosHint', '1'); } catch (e) {} });
    p.appendChild(document.createTextNode(' ')); p.appendChild(d);
    row.parentNode.insertBefore(p, row.nextSibling);
  }
})();
