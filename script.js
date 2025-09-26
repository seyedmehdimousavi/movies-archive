// -------------------- Supabase config --------------------
const SUPABASE_URL = 'https://gwsmvcgjdodmkoqupdal.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c212Y2dqZG9kbWtvcXVwZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDczNjEsImV4cCI6MjA3MjEyMzM2MX0.OVXO9CdHtrCiLhpfbuaZ8GVDIrUlA8RdyQwz2Bk2cDY'; // (kept as in original)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Admin UID
const ADMIN_UID = '7314d471-8343-44b3-9fcc-a9ae01d99725';

// -------------------- App state --------------------
let currentUser = null;
let movies = [];
let messages = [];
let editingMovie = null;
const PAGE_SIZE = 10;
let currentPage = 1;

// -------------------- Utilities --------------------
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function initials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
}

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// -------------------- Toast (top popup) --------------------
// Non-blocking top toast visible for 3 seconds. Responsive, appears at very top.
function showToast(message) {
  try {
    let container = document.getElementById('topToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'topToastContainer';
      container.style.position = 'fixed';
      container.style.top = '12px';
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      container.style.zIndex = '2147483647';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '8px';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'top-toast';
    toast.style.pointerEvents = 'auto';
    toast.style.maxWidth = 'min(920px, 95%)';
    toast.style.padding = '10px 14px';
    toast.style.background = 'rgba(0,74,124,0.6)';
    toast.style.color = '#fff';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
    toast.style.fontSize = '14px';
    toast.style.lineHeight = '1.2';
    toast.style.textAlign = 'center';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 220ms ease, transform 220ms ease';
    toast.style.transform = 'translateY(-6px)';
    toast.textContent = message || '';

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        try { container.removeChild(toast); } catch (e) {}
      }, 240);
    }, 3000);
  } catch (err) {
    console.error('showToast error', err);
  }
}

// -------------------- Custom Dialog (replace confirm/prompt) --------------------
/*
  showDialog({ message, type, defaultValue })
  - type: "confirm" | "prompt" | "alert"
  - returns Promise: confirm -> true/false, prompt -> string|null, alert -> true
*/
function showDialog({ message = '', type = 'alert', defaultValue = '' } = {}) {
  return new Promise((resolve) => {
    try {
      // overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '2147483646';

      // box
      const box = document.createElement('div');
      box.style.background = '#fff';
      box.style.color = '#111';
      box.style.padding = '18px';
      box.style.borderRadius = '10px';
      box.style.width = '92%';
      box.style.maxWidth = '420px';
      box.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.gap = '12px';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');

      // message
      const msg = document.createElement('div');
      msg.style.fontSize = '16px';
      msg.style.textAlign = 'center';
      msg.style.whiteSpace = 'pre-wrap';
      msg.textContent = message;
      box.appendChild(msg);

      // input for prompt
      let inputEl = null;
      if (type === 'prompt') {
        inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.value = defaultValue ?? '';
        inputEl.style.width = '100%';
        inputEl.style.padding = '8px';
        inputEl.style.fontSize = '15px';
        inputEl.style.border = '1px solid #ccc';
        inputEl.style.borderRadius = '6px';
        inputEl.style.boxSizing = 'border-box';
        box.appendChild(inputEl);
        setTimeout(() => inputEl && inputEl.focus(), 50);
      }

      // buttons row
      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '10px';
      btnRow.style.marginTop = '6px';

      const makeButton = (text, opts = {}) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.flex = opts.full ? '1' : '1';
        btn.style.padding = '10px';
        btn.style.fontSize = '15px';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.minWidth = '88px';
        if (opts.primary) {
          btn.style.background = '#0d6efd';
          btn.style.color = '#fff';
        } else {
          btn.style.background = '#e0e0e0';
          btn.style.color = '#111';
        }
        return btn;
      };

      if (type === 'confirm') {
        // two buttons: Cancel (left), OK (right)
        const cancelBtn = makeButton('Cancel', { primary: false });
        const okBtn = makeButton('OK', { primary: true });
        cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(false); };
        okBtn.onclick = () => { document.body.removeChild(overlay); resolve(true); };
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
      } else if (type === 'prompt') {
        const cancelBtn = makeButton('Cancel', { primary: false });
        const okBtn = makeButton('OK', { primary: true });
        cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };
        okBtn.onclick = () => { document.body.removeChild(overlay); resolve(inputEl ? inputEl.value : ''); };
        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
      } else {
        // alert-like single button: full width
        const okBtn = makeButton('OK', { primary: true, full: true });
        okBtn.style.width = '100%';
        okBtn.onclick = () => { document.body.removeChild(overlay); resolve(true); };
        btnRow.appendChild(okBtn);
      }

      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // keyboard handlers
      const keyHandler = (ev) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          try { document.body.removeChild(overlay); } catch (e) {}
          resolve(type === 'prompt' ? null : false);
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          if (type === 'prompt') {
            resolve(inputEl ? inputEl.value : '');
            try { document.body.removeChild(overlay); } catch (e) {}
          } else if (type === 'confirm' || type === 'alert') {
            resolve(true);
            try { document.body.removeChild(overlay); } catch (e) {}
          }
        }
      };
      overlay._handler = keyHandler;
      document.addEventListener('keydown', keyHandler);

      // cleanup on remove
      const observer = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
          try { document.removeEventListener('keydown', keyHandler); } catch (e) {}
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: false });
    } catch (err) {
      console.error('showDialog error', err);
      // graceful fallback
      if (type === 'prompt') {
        const res = window.prompt(message, defaultValue || '');
        resolve(res === null ? null : res);
      } else if (type === 'confirm') {
        const ok = window.confirm(message);
        resolve(ok);
      } else {
        window.alert(message);
        resolve(true);
      }
    }
  });
}

// -------------------- Comments --------------------
async function loadComments(movieId) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('movie_id', movieId)
      .eq('approved', true)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) {
      console.error('Supabase select error (loadComments):', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception in loadComments:', err);
    return [];
  }
}

function attachCommentsHandlers(card, movieId) {
  const avatarsEl = card.querySelector('.avatars');
  const countEl = card.querySelector('.comments-count');
  const enterBtn = card.querySelector('.enter-comments');
  const summaryRow = card.querySelector('.comment-summary');
  const panel = card.querySelector('.comments-panel');
  const closeBtn = card.querySelector('.comments-close');
  const commentsList = card.querySelector('.comments-list');
  const nameInput = card.querySelector('.comment-name');
  const textInput = card.querySelector('.comment-text');
  const sendBtn = card.querySelector('.comment-send');

  function renderComments(arr) {
    const latest = (arr || []).slice(-3).map(c => c.name || 'Guest');
    if (avatarsEl) {
      avatarsEl.innerHTML = latest.map(n => `<div class="avatar">${escapeHtml(initials(n))}</div>`).join('');
    }
    if (countEl) {
      countEl.textContent = `${(arr || []).length} comments`;
    }
    if (commentsList) {
      commentsList.innerHTML = (arr || []).map(c => `
        <div class="comment-row">
          <div class="comment-avatar">${escapeHtml(initials(c.name))}</div>
          <div class="comment-body">
            <div class="comment-meta">
              <strong>${escapeHtml(c.name)}</strong> ·
              <span class="comment-time">${timeAgo(c.created_at)}</span>
            </div>
            <div class="comment-text-content">${escapeHtml(c.text)}</div>
          </div>
        </div>
      `).join('');
      setTimeout(() => { commentsList.scrollTop = commentsList.scrollHeight; }, 60);
    }
  }

  async function refresh() {
    try {
      const arr = await loadComments(movieId);
      renderComments(arr);
    } catch (err) {
      console.error('refresh comments error', err);
      renderComments([]);
    }
  }

  function openComments() {
    refresh();
    if (panel) {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
    }
  }

  function closeComments() {
    if (panel) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    }
  }

  enterBtn?.addEventListener('click', openComments);
  summaryRow?.addEventListener('click', openComments);
  closeBtn?.addEventListener('click', closeComments);

  sendBtn?.addEventListener('click', async () => {
    let name = (nameInput?.value || 'Guest').trim() || 'Guest';
    const text = (textInput?.value || '').trim();

    if (name.length > 15) {
      showToast('Your name must not exceed 15 characters');
      return;
    }
    if (!text) {
      showToast('Please type a comment');
      return;
    }

    sendBtn.disabled = true;
    const originalText = sendBtn.textContent;
    sendBtn.textContent = 'Sending...';
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          movie_id: movieId,
          name,
          text,
          approved: false,
          published: false
        }]);
      if (error) {
        console.error('Error inserting comment:', error);
        showToast('Error saving comment: ' + (error.message || JSON.stringify(error)));
      } else {
        if (nameInput) nameInput.value = '';
        if (textInput) textInput.value = '';
        await refresh();
        showToast('Comment submitted and will be displayed after admin approval.');
      }
    } catch (err) {
      console.error('Insert comment exception:', err);
      showToast('Error saving comment: ' + (err.message || String(err)));
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = originalText || 'Send';
    }
  });

  refresh();
}

// -------------------- DOM Ready: main app --------------------
document.addEventListener('DOMContentLoaded', () => {
  // Element references
  const themeToggle = document.getElementById('themeToggle');
  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  const profileBtn = document.getElementById('profileBtn');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModal = document.getElementById('closeLoginModal');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginWithGmail = document.getElementById('loginWithGmail');

  const searchInput = document.getElementById('search');
  const moviesGrid = document.getElementById('moviesGrid');
  const movieCount = document.getElementById('movieCount');
  const genreGrid = document.getElementById('genreGrid');

  const adminMessagesContainer = document.getElementById('adminMessages');
  const paginationContainer = document.getElementById('pagination');

  const addMovieForm = document.getElementById('addMovieForm');
  const movieList = document.getElementById('movieList');
  const logoutBtn = document.getElementById('logoutBtn');

  const addMessageForm = document.getElementById('addMessageForm');
  const messageList = document.getElementById('messageList');
  const adminSearch = document.getElementById('adminSearch');

  // Defensive: hide login modal initially
  if (loginModal) loginModal.style.display = 'none';

  // -------------------- Theme toggle --------------------
  function applyTheme(dark) {
    if (dark) {
      document.body.classList.add('dark');
      if (themeToggle && themeToggle.querySelector('i'))
        themeToggle.querySelector('i').className = 'bi bi-sun';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      if (themeToggle && themeToggle.querySelector('i'))
        themeToggle.querySelector('i').className = 'bi bi-moon';
      localStorage.setItem('theme', 'light');
    }
  }
  if (themeToggle) themeToggle.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark')));
  if (localStorage.getItem('theme') === 'dark') applyTheme(true);

  // -------------------- Side menu open/close + outside click + blur --------------------
  if (menuBtn && sideMenu && menuOverlay) {
    const openMenu = () => {
      sideMenu.classList.add('active');
      menuOverlay.classList.add('active');
      document.body.classList.add('no-scroll', 'menu-open');
    };
    const closeMenu = () => {
      sideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.classList.remove('no-scroll', 'menu-open');
    };
    menuBtn.addEventListener('click', openMenu);
    menuOverlay.addEventListener('click', closeMenu);
    document.addEventListener('click', (e) => {
      if (!sideMenu.classList.contains('active')) return;
      const clickedInsideMenu = sideMenu.contains(e.target);
      const clickedMenuBtn = menuBtn.contains(e.target);
      if (!clickedInsideMenu && !clickedMenuBtn) closeMenu();
    });
  }

  // -------------------- Auth helpers --------------------
  async function refreshSessionUser() {
    try {
      const { data } = await supabase.auth.getSession();
      currentUser = data?.session?.user || null;
    } catch (e) {
      console.error('session get error', e);
      currentUser = null;
    }
  }
  refreshSessionUser();
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
  });

  if (profileBtn) {
    profileBtn.addEventListener('click', async () => {
      await refreshSessionUser();
      if (currentUser && currentUser.id === ADMIN_UID) {
        window.location.href = 'admin.html';
      } else if (loginModal) {
        loginModal.style.display = 'block';
      } else {
        showToast('Login modal not found');
      }
    });
  }

  if (closeLoginModal && loginModal) {
    closeLoginModal.addEventListener('click', () => { loginModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === loginModal) loginModal.style.display = 'none'; });
  }

  if (loginForm && loginEmail && loginPassword) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();
      if (!email || !password) {
        showToast('Please enter email and password');
        return;
      }
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const origText = submitBtn.textContent;
      submitBtn.textContent = 'Signing in...';
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error('login error', error);
          showToast('Login failed');
        } else {
          loginModal.style.display = 'none';
          window.location.href = 'admin.html';
        }
      } catch (err) {
        console.error(err);
        showToast('Login failed');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText || 'Log in';
      }
    });
  }

  if (loginWithGmail) {
    loginWithGmail.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/admin.html` }
        });
        if (error) console.error('oauth error', error);
      } catch (err) { console.error(err); }
    });
  }

  // -------------------- Fetch data --------------------
  async function fetchMovies() {
    try {
      const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('fetch movies error', error);
        movies = [];
      } else {
        movies = data || [];
      }
      currentPage = 1;
      renderPagedMovies();
      buildGenreGrid();
      if (document.getElementById('movieList')) renderAdminMovieList();
    } catch (err) {
      console.error('fetchMovies catch', err);
      movies = [];
    }
  }

  async function fetchMessages() {
    try {
      const { data, error } = await supabase.from('messages').select('*').order('id', { ascending: false });
      if (error) {
        console.error('fetch messages error', error);
        messages = [];
      } else {
        messages = data || [];
      }
      renderMessages();
      if (document.getElementById('messageList')) renderAdminMessages();
    } catch (err) {
      console.error(err);
      messages = [];
    }
  }

  // -------------------- Messages UI --------------------
  function renderMessages() {
    if (!adminMessagesContainer) return;
    adminMessagesContainer.innerHTML = '';
    (messages || []).forEach(m => {
      const div = document.createElement('div');
      div.className = 'message-bubble';
      div.innerHTML = `<span>${escapeHtml(m.text)}</span><button class="msg-close" aria-label="close message">&times;</button>`;
      div.querySelector('.msg-close').addEventListener('click', () => div.remove());
      adminMessagesContainer.appendChild(div);
    });
  }

  // -------------------- Genre grid --------------------
  function buildGenreGrid() {
    if (!genreGrid) return;
    const genreSet = new Set();
    (movies || []).forEach(m => {
      if (m.genre) m.genre.split(' ').forEach(g => { if (g.trim() !== "") genreSet.add(g); });
    });
    genreGrid.innerHTML = '';
    [...genreSet].sort().forEach(g => {
      const div = document.createElement('div');
      div.className = 'genre-chip';
      div.textContent = g;
      div.onclick = () => {
        if (searchInput) searchInput.value = g;
        currentPage = 1;
        renderPagedMovies();
        document.getElementById('sideMenu')?.classList.remove('active');
        document.getElementById('menuOverlay')?.classList.remove('active');
        document.body.classList.remove('no-scroll', 'menu-open');
      };
      genreGrid.appendChild(div);
    });
  }

  const genreToggle = document.getElementById('genreToggle');
  const genreSubmenu = document.getElementById('genreSubmenu');

  if (genreToggle && genreSubmenu) {
    genreToggle.addEventListener('click', () => {
      const isOpen = genreSubmenu.style.display === 'block';
      genreSubmenu.style.display = isOpen ? 'none' : 'block';
    });

    // close submenu when clicking outside
    document.getElementById('sideMenu')?.addEventListener('click', (e) => {
      const clickedInside = genreSubmenu.contains(e.target) || genreToggle.contains(e.target);
      if (!clickedInside) {
        genreSubmenu.style.display = 'none';
      }
    });
  }

  // -------------------- Pagination --------------------
  function computeTotalPages(length) {
    return Math.max(1, Math.ceil((length || 0) / PAGE_SIZE));
  }

  function renderPagination(filteredLength) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const total = computeTotalPages(filteredLength);
    if (total <= 1) return;

    const createBubble = (label, page, isActive = false) => {
      const btn = document.createElement('button');
      btn.className = 'page-bubble' + (isActive ? ' active' : '');
      btn.textContent = label;
      btn.dataset.page = page;
      btn.addEventListener('click', () => {
        if (page === 'dots') return;
        currentPage = Number(page);
        renderPagedMovies(true);
        const cont = document.querySelector('.container');
        window.scrollTo({ top: (cont?.offsetTop || 0) - 8, behavior: 'smooth' });
      });
      return btn;
    };

    if (total <= 9) {
      for (let i = 1; i <= total; i++) {
        paginationContainer.appendChild(createBubble(i, i, i === currentPage));
      }
    } else {
      if (currentPage <= 5) {
        for (let i = 1; i <= 9; i++) paginationContainer.appendChild(createBubble(i, i, i === currentPage));
        paginationContainer.appendChild(createBubble('...', 'dots'));
      } else if (currentPage >= total - 4) {
        paginationContainer.appendChild(createBubble('...', 'dots'));
        for (let i = total - 8; i <= total; i++) paginationContainer.appendChild(createBubble(i, i, i === currentPage));
      } else {
        paginationContainer.appendChild(createBubble('...', 'dots'));
        for (let i = currentPage - 3; i <= currentPage + 4; i++) paginationContainer.appendChild(createBubble(i, i, i === currentPage));
        paginationContainer.appendChild(createBubble('...', 'dots'));
      }
    }
  }

  // -------------------- Search live --------------------
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      renderPagedMovies();
    });
  }

// -------------------- Render movies (paged) --------------------
// -------------------- Render movies (paged) --------------------
async function renderPagedMovies(skipScroll) {
  if (!moviesGrid || !movieCount) return;
  const q = (searchInput?.value || '').toLowerCase();
  const filtered = movies.filter(m =>
    Object.values(m).some(val => typeof val === 'string' && val.toLowerCase().includes(q))
  );
  const totalPagesVal = computeTotalPages(filtered.length);
  if (currentPage > totalPagesVal) currentPage = totalPagesVal;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  moviesGrid.innerHTML = '';
  movieCount.innerText = `🎞️ Number of movies: ${filtered.length}`;

  for (const m of pageItems) {
    const cover = escapeHtml(m.cover || 'https://via.placeholder.com/300x200?text=No+Image');
    const title = escapeHtml(m.title || '-');
    const synopsis = escapeHtml((m.synopsis || '-').trim());
    const director = escapeHtml(m.director || '-');
    const product = escapeHtml(m.product || '-');
    const stars = escapeHtml(m.stars || '-');
    const imdb = escapeHtml(m.imdb || '-');
    const release_info = escapeHtml(m.release_info || '-');
    const genreLinks = (m.genre || '')
      .split(' ')
      .filter(g => g.trim())
      .map(g => `<a href="#" onclick="(function(){ const searchEl=document.getElementById('search'); searchEl.value='${escapeHtml(g)}'; searchEl.dispatchEvent(new Event('input')); })();">${escapeHtml(g)}</a>`)
      .join(' ');

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.movieId = m.id;
    card.innerHTML = `
      <div class="cover-container">
        <div class="cover-blur" style="background-image: url('${cover}');"></div>
        <img class="cover-image" src="${cover}" alt="${title}">
      </div>
      <div class="movie-info">
        <div class="movie-title">${title}</div>

        <span class="field-label"><img src="images/icons8-note.apng" style="width:20px;height:20px;"> Synopsis:</span>
        <div class="field-quote synopsis-quote">
          <div class="quote-text">${synopsis}</div>
          <button class="quote-toggle-btn">More</button>
        </div>

        <span class="field-label"><img src="images/icons8-movie.apng" style="width:20px;height:20px;"> Director:</span>
        <div class="field-quote">${director}</div>

        <span class="field-label"><img src="images/icons8-location.apng" style="width:20px;height:20px;"> Product:</span>
        <div class="field-quote">${product !== '-' ? `<a href="#" onclick="(function(){ const searchEl=document.getElementById('search'); searchEl.value='${product}'; searchEl.dispatchEvent(new Event('input')); })();">${product}</a>` : '-'}</div>

        <span class="field-label"><img src="images/icons8-star.apng" style="width:20px;height:20px;"> Stars:</span>
        <div class="field-quote">${stars}</div>

        <span class="field-label"><img src="images/icons8-imdb-48.png" style="width:20px;height:20px;"> IMDB:</span>
        <div class="field-quote">${imdb}</div>

        <span class="field-label"><img src="images/icons8-calendar.apng" style="width:20px;height:20px;"> Release:</span>
        <div class="field-quote">${release_info}</div>

        <span class="field-label"><img src="images/icons8-comedy-96.png" style="width:20px;height:20px;"> Genre:</span>
        <div class="field-quote">${genreLinks || '-'}</div>
        <!-- بخش اپیزودها -->
        <div class="episodes-container" data-movie-id="${m.id}">
          <div class="episodes-list"></div>
        </div>
        <button class="go-btn" data-link="${escapeHtml(m.link || '#')}">Go to file</button>
        <div class="comment-summary">
          <div class="avatars"></div>
          <div class="comments-count">0 comments</div>
          <button class="enter-comments"><img src="images/icons8-comment.apng" style="width:22px;height:22px;"></button>
        </div>

        <div class="comments-panel" aria-hidden="true">
          <div class="comments-panel-inner">
            <div class="comments-panel-header"><div class="comments-title">Comments</div></div>
            <div class="comments-list"></div>
            <div class="comment-input-row">
              <div class="name-comments-close">
                <input class="comment-name" placeholder="Your name" maxlength="60" />
                <button class="comments-close">&times;</button>
              </div>
              <textarea class="comment-text" placeholder="Write a comment..." rows="2"></textarea>
              <button class="comment-send">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    moviesGrid.appendChild(card);

    const goBtn = card.querySelector('.go-btn');
    goBtn?.addEventListener('click', () => {
      const link = goBtn.dataset.link || '#';
      if (link && link !== '#') window.open(link, '_blank');
    });

    attachCommentsHandlers(card, m.id);

    // --- بارگذاری اپیزودهای این فیلم ---
    (async () => {
      const { data: eps, error: epsErr } = await supabase
        .from('collection_episodes')
        .select('*')
        .eq('movie_id', m.id)
        .order('episode_number', { ascending: true });

      if (epsErr) {
        console.error('Error loading episodes:', epsErr);
        return;
      }

      if (eps && eps.length > 0) {
        const listEl = card.querySelector('.episodes-list');
        listEl.innerHTML = eps.map((ep, idx) => `
          <div class="episode-card ${idx === 0 ? 'active' : ''}" data-link="${ep.episode_link}">
            <img src="${escapeHtml(ep.episode_cover || 'https://via.placeholder.com/120x80?text=No+Cover')}" 
                 alt="${escapeHtml(ep.episode_title)}" class="episode-cover">
            <div class="episode-title">${escapeHtml(ep.episode_title)}</div>
          </div>
        `).join('');

        // تغییر لینک Go to file بر اساس اپیزود فعال
        goBtn.dataset.link = eps[0].episode_link;

        listEl.querySelectorAll('.episode-card').forEach(cardEl => {
          cardEl.addEventListener('click', () => {
            listEl.querySelectorAll('.episode-card').forEach(c => c.classList.remove('active'));
            cardEl.classList.add('active');
            goBtn.dataset.link = cardEl.dataset.link;
          });
        });

        // اضافه کردن برچسب "کالکشن" کنار عنوان فیلم
        const titleEl = card.querySelector('.movie-title');
        if (titleEl && !titleEl.querySelector('.collection-badge')) {
          const badge = document.createElement('span');
          badge.className = 'collection-badge';
          badge.textContent = 'کالکشن';
          titleEl.appendChild(badge);
        }
      }
    })();
  }

  // synopsis toggle
  document.querySelectorAll('.synopsis-quote').forEach(quote => {
    const textEl = quote.querySelector('.quote-text');
    const btn = quote.querySelector('.quote-toggle-btn');
    if (!textEl || !btn) return;
    const fullText = textEl.textContent.trim();
    if (fullText.length > 200) {
      const shortText = fullText.substring(0, 200) + '…';
      let collapsed = true;
      function applyState() {
        if (collapsed) {
          textEl.textContent = shortText;
          btn.textContent = 'More';
        } else {
          textEl.textContent = fullText;
          btn.textContent = 'Less';
        }
      }
      btn.addEventListener('click', e => {
        e.stopPropagation();
        collapsed = !collapsed;
        applyState();
      });
      applyState();
    } else {
      btn.remove();
    }
  });

  renderPagination(filtered.length);
}

  // -------------------- Admin guard & functions --------------------
  async function enforceAdminGuard() {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session || session.user.id !== ADMIN_UID) {
        if (window.location.pathname.endsWith('admin.html')) window.location.href = 'index.html';
        return false;
      }
      currentUser = session.user;
      return true;
    } catch (err) {
      console.error('enforceAdminGuard error', err);
      if (window.location.pathname.endsWith('admin.html')) window.location.href = 'index.html';
      return false;
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('logout error', error);
          showToast('Logout failed');
          logoutBtn.disabled = false;
        } else {
          window.location.href = 'index.html';
        }
      } catch (err) {
        console.error('logout exception', err);
        logoutBtn.disabled = false;
      }
    });
  }

// -------------------- Admin: movie list render with edit/delete + pagination --------------------
let currentPage = 1;
let totalPages = 1;
const pageSize = 10;

async function loadAdminMovies(page = 1) {
  currentPage = page;

  // گرفتن تعداد کل فیلم‌ها
  const { count } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });

  totalPages = Math.ceil(count / pageSize);

  // گرفتن ۱۰ فیلم در هر صفحه
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error('Error loading movies:', error);
    return;
  }

  renderAdminMovieList(data);
  renderAdminPagination();
}

function renderAdminMovieList(list = []) {
  if (!movieList) return;
  movieList.innerHTML = '';

  list.forEach(m => {
    const row = document.createElement('div');
    row.className = 'movie-item';

    row.innerHTML = `
      <div class="movie-top">
        <img class="movie-cover" src="${escapeHtml(m.cover || 'https://via.placeholder.com/60x80?text=No+Image')}" alt="${escapeHtml(m.title || '')}">
        <div class="movie-info-admin">
          <span class="movie-title">${escapeHtml(m.title || '')}</span>
          <div class="toggle-comments" data-id="${m.id}">
            Comments <i class="bi bi-chevron-down"></i>
          </div>
        </div>
        <div class="movie-actions">
          <button class="btn-edit"><i class="bi bi-pencil"></i> Edit</button>
          <button class="btn-delete"><i class="bi bi-trash"></i> Delete</button>
        </div>
      </div>
      <div class="admin-comments-panel" id="comments-${m.id}" style="display:none;"></div>
    `;

    // دکمه ویرایش
    row.querySelector('.btn-edit')?.addEventListener('click', () => {
      editingMovie = m;
      const fields = ['title','link','synopsis','director','product','stars','imdb','release_info','genre'];
      fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = m[f] || '';
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // دکمه حذف
    row.querySelector('.btn-delete')?.addEventListener('click', async () => {
      const ok = await showDialog({ message: 'Delete this movie?', type: 'confirm' });
      if (!ok) return;
      const { error } = await supabase.from('movies').delete().eq('id', m.id);
      if (error) {
        console.error('delete movie err', error);
        showToast('Delete failed');
      } else {
        showToast('Movie deleted');
        await loadAdminMovies(currentPage); // بعد از حذف، صفحه فعلی دوباره لود میشه
      }
    });

    // toggle comments panel
    const toggleBtn = row.querySelector('.toggle-comments');
    toggleBtn?.addEventListener('click', async () => {
      const panel = row.querySelector('.admin-comments-panel');
      if (panel.style.display === 'none') {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('movie_id', m.id)
          .order('created_at', { ascending: true });
        if (error) {
          console.error('Error loading comments:', error);
          panel.innerHTML = '<p>Error loading comments</p>';
        } else if (!data || data.length === 0) {
          panel.innerHTML = '<p>No comments found.</p>';
        } else {
          panel.innerHTML = data.map(c => `
            <div class="admin-comment-row">
              <div class="comment-avatar">${escapeHtml(initials(c.name))}</div>
              <div class="admin-comment-body">
                <div class="admin-comment-meta">
                  <strong>${escapeHtml(c.name)}</strong> · ${new Date(c.created_at).toLocaleString()}
                </div>
                <div class="admin-comment-text">${escapeHtml(c.text)}</div>
              </div>
              <button class="admin-comment-delete" data-id="${c.id}">Delete</button>
            </div>
          `).join('');
        }

        panel.querySelectorAll('.admin-comment-delete').forEach(btn => {
          btn.addEventListener('click', async () => {
            const ok2 = await showDialog({ message: 'Should this comment be deleted?', type: 'confirm' });
            if (!ok2) return;
            const id = btn.dataset.id;
            const { error: delErr } = await supabase.from('comments').delete().eq('id', id);
            if (delErr) {
              showToast('Error deleting comment');
            } else {
              btn.closest('.admin-comment-row')?.remove();
            }
          });
        });

        panel.style.display = 'flex';
        toggleBtn.innerHTML = 'Close <i class="bi bi-chevron-up"></i>';
      } else {
        panel.style.display = 'none';
        toggleBtn.innerHTML = 'Comments <i class="bi bi-chevron-down"></i>';
      }
    });

    movieList.appendChild(row);
  });
}

function renderAdminPagination() {
  const container = document.getElementById('admin-pagination');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.classList.add('page-bubble');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    btn.onclick = () => loadAdminMovies(i);
    container.appendChild(btn);
  }
}

// شروع
loadAdminMovies();
// --- Collection helpers ---
// جمع‌آوری اپیزودها از فرم ادمین
function collectEpisodesFromForm() {
  const blocks = document.querySelectorAll('.episode-block');
  const list = [];
  blocks.forEach((block, idx) => {
    const title = (block.querySelector('.episode-title')?.value || '').trim();
    const link = (block.querySelector('.episode-link')?.value || '').trim();
    const coverFile = block.querySelector('.episode-cover')?.files?.[0] || null;
    if (title && link) {
      list.push({
        episode_number: idx + 1,
        episode_title: title,
        episode_link: link,
        coverFile
      });
    }
  });
  return list;
}

// آپلود کاور اپیزود در bucket: covers
async function uploadEpisodeCover(coverFile) {
  if (!coverFile) return null;
  const filename = `episodes/${Date.now()}_${coverFile.name}`;
  const { data: upData, error: upErr } = await supabase
    .storage
    .from('covers')
    .upload(filename, coverFile, { upsert: true });
  if (upErr) throw upErr;
  const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(upData.path);
  return publicUrl?.publicUrl || null;
}

// -------------------- Admin: add/edit movie --------------------
if (addMovieForm && movieList) {
  enforceAdminGuard().then(ok => { if (!ok) return; });

  addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await enforceAdminGuard();
    if (!ok) return;

    // --- آپلود کاور فیلم ---
    const coverInput = document.getElementById('coverFile');
    const coverFile = coverInput?.files?.[0];
    let coverUrl = '';
    if (coverFile) {
      try {
        const filename = `public/${Date.now()}_${coverFile.name}`;
        const { data: upData, error: upErr } = await supabase
          .storage
          .from('covers')
          .upload(filename, coverFile, { upsert: true });
        if (upErr) { console.error('upload err', upErr); showToast('Upload failed'); return; }
        const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(upData.path);
        coverUrl = publicUrl.publicUrl;
      } catch (err) {
        console.error('upload ex', err);
        showToast('Upload failed');
        return;
      }
    }

    // --- حالت ویرایش فیلم ---
    if (editingMovie) {
      const updateData = {
        title: document.getElementById('title')?.value || '',
        link: document.getElementById('link')?.value || '',
        synopsis: document.getElementById('synopsis')?.value || '',
        director: document.getElementById('director')?.value || '',
        product: document.getElementById('product')?.value || '',
        stars: document.getElementById('stars')?.value || '',
        imdb: document.getElementById('imdb')?.value || '',
        release_info: document.getElementById('release_info')?.value || '',
        genre: document.getElementById('genre')?.value || ''
      };
      if (coverUrl) updateData.cover = coverUrl;

      const { error } = await supabase.from('movies').update(updateData).eq('id', editingMovie.id);
      if (error) {
        console.error('movie update err', error);
        showToast('Update failed');
      } else {
        // --- اپیزودها هنگام ویرایش ---
        const eps = collectEpisodesFromForm();
        try {
          // حذف اپیزودهای قبلی
          await supabase.from('collection_episodes').delete().eq('movie_id', editingMovie.id);

          // درج اپیزودهای جدید
          if (eps.length > 0) {
            const payload = [];
            for (const ep of eps) {
              let episode_cover = null;
              if (ep.coverFile) {
                try {
                  episode_cover = await uploadEpisodeCover(ep.coverFile);
                } catch (upErr) {
                  console.error('episode cover upload err', upErr);
                  showToast('Error uploading episode cover');
                }
              }
              payload.push({
                movie_id: editingMovie.id,
                episode_number: ep.episode_number,
                episode_title: ep.episode_title,
                episode_link: ep.episode_link,
                episode_cover
              });
            }
            const { error: epErr } = await supabase
              .from('collection_episodes')
              .insert(payload);
            if (epErr) {
              console.error('episodes insert err', epErr);
              showToast('Error adding episodes');
            }
          }
        } catch (err) {
          console.error('episodes update flow err', err);
          showToast('Error updating episodes');
        }

        showToast('Movie updated');
        editingMovie = null;
        addMovieForm.reset();
        await fetchMovies();
      }
    }

    // --- حالت افزودن فیلم جدید ---
    else {
      if (!coverUrl) { showToast('Please select cover'); return; }

      const movie = {
        title: document.getElementById('title')?.value || '',
        cover: coverUrl,
        link: document.getElementById('link')?.value || '',
        synopsis: document.getElementById('synopsis')?.value || '',
        director: document.getElementById('director')?.value || '',
        product: document.getElementById('product')?.value || '',
        stars: document.getElementById('stars')?.value || '',
        imdb: document.getElementById('imdb')?.value || '',
        release_info: document.getElementById('release_info')?.value || '',
        genre: document.getElementById('genre')?.value || ''
      };

      // درج فیلم و گرفتن id
      const { data: inserted, error: insErr } = await supabase
        .from('movies')
        .insert([movie])
        .select()
        .single();

      if (insErr) {
        console.error('movie insert err', insErr);
        showToast('Add movie failed: ' + insErr.message);
        return;
      }

      const movieId = inserted.id;

      // --- اپیزودها هنگام افزودن ---
      const eps = collectEpisodesFromForm();
      if (eps.length > 0) {
        try {
          const payload = [];
          for (const ep of eps) {
            let episode_cover = null;
            if (ep.coverFile) {
              try {
                episode_cover = await uploadEpisodeCover(ep.coverFile);
              } catch (upErr) {
                console.error('episode cover upload err', upErr);
                showToast('Error uploading episode cover');
              }
            }
            payload.push({
              movie_id: movieId,
              episode_number: ep.episode_number,
              episode_title: ep.episode_title,
              episode_link: ep.episode_link,
              episode_cover
            });
          }
          const { error: epErr } = await supabase
            .from('collection_episodes')
            .insert(payload);
          if (epErr) {
            console.error('episodes insert err', epErr);
            showToast('Error adding episodes');
          }
        } catch (err) {
          console.error('episodes processing err', err);
          showToast('Error processing episodes');
        }
      }

      showToast('Movie added');
      addMovieForm.reset();
      await fetchMovies();
    }
  });
}
  // -------------------- Admin messages management --------------------
  if (addMessageForm && messageList) {
    enforceAdminGuard().then(ok => { if (!ok) return; });

    addMessageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (document.getElementById('messageText')?.value || '').trim();
      if (!text) { showToast('Message cannot be empty'); return; }
      const { error } = await supabase.from('messages').insert([{ text }]);
      if (error) { console.error('insert message err', error); showToast('Add message failed'); }
      else {
        document.getElementById('messageText').value = '';
        await fetchMessages();
        showToast('Message added');
      }
    });

    function renderAdminMessages() {
      messageList.innerHTML = '';
      (messages || []).forEach(m => {
        const el = document.createElement('div');
        el.className = 'message-item';
        el.innerHTML = `
          <span class="message-text">${escapeHtml(m.text)}</span>
          <div class="message-actions">
            <button class="btn-edit" data-id="${m.id}"><i class="bi bi-pencil"></i> Edit</button>
            <button class="btn-delete" data-id="${m.id}"><i class="bi bi-trash"></i> Delete</button>
          </div>
        `;
        messageList.appendChild(el);
      });
    }

    messageList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-edit')) {
        const msg = messages.find(x => String(x.id) === String(id));
        if (!msg) return;
        const newText = await showDialog({ message: 'Edit message:', type: 'prompt', defaultValue: msg.text });
        if (newText === null) return;
        const { error } = await supabase.from('messages').update({ text: newText }).eq('id', id);
        if (error) { console.error('message update err', error); showToast('Update failed'); }
        else { await fetchMessages(); showToast('Message updated'); }
      }

      if (btn.classList.contains('btn-delete')) {
        const ok = await showDialog({ message: 'Delete this message?', type: 'confirm' });
        if (!ok) return;
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) { console.error('msg delete err', error); showToast('Delete failed'); }
        else { await fetchMessages(); showToast('Message deleted'); }
      }
    });

    renderAdminMessages();
  }

  // -------------------- Admin: Unapproved Comments (panel) --------------------
  async function loadUnapprovedComments() {
    const container = document.getElementById('unapprovedComments');
    if (!container) return;

    const ok = await enforceAdminGuard();
    if (!ok) return;

    container.innerHTML = '<div class="loading">Loading Comments…</div>';

    const { data, error } = await supabase.from('comments').select('*').eq('approved', false).order('created_at', { ascending: false });
    if (error) {
      console.error('error in loading comments:', error);
      container.innerHTML = '<p>error in loading comments</p>';
      return;
    }
    if (!data || data.length === 0) {
      container.innerHTML = '<p>there is no unpublished comments</p>';
      return;
    }

    container.innerHTML = data.map(c => {
      const movie = movies.find(m => m.id === c.movie_id);
      const cover = movie?.cover || 'https://via.placeholder.com/80x100?text=No+Image';
      const title = movie?.title || '';
      return `
        <div class="unapproved-bubble">
          <div class="bubble-left">
            <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" class="bubble-cover">
          </div>
          <div class="bubble-center">
            <div class="bubble-author">${escapeHtml(c.name)}</div>
            <div class="bubble-text">${escapeHtml(c.text)}</div>
            <div class="bubble-time">${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
          </div>
          <div class="bubble-right">
            <button class="btn-approve" data-id="${c.id}"><i class="bi bi-check2-circle"></i> Approve</button>
            <button class="btn-delete" data-id="${c.id}"><i class="bi bi-trash"></i> Delete</button>
          </div>
        </div>
      `;
    }).join('');

    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-approve')) {
        btn.disabled = true;
        const { error: upErr } = await supabase.from('comments').update({ approved: true, published: true }).eq('id', id);
        btn.disabled = false;
        if (upErr) {
          console.error(upErr);
          showToast('An error occurred while approving the comment.');
        } else {
          await loadUnapprovedComments();
          showToast('Comment approved.');
        }
      }

      if (btn.classList.contains('btn-delete')) {
        const ok = await showDialog({ message: 'Should this comment be deleted?', type: 'confirm' });
        if (!ok) return;
        btn.disabled = true;
        const { error: delErr } = await supabase.from('comments').delete().eq('id', id);
        btn.disabled = false;
        if (delErr) {
          console.error(delErr);
          showToast('Error deleting comment');
        } else {
          await loadUnapprovedComments();
          showToast('Comment deleted.');
        }
      }
    }, { once: true });
  }

  // -------------------- Admin quick search --------------------
  if (adminSearch) {
    adminSearch.addEventListener('input', () => {
      const q = adminSearch.value.trim().toLowerCase();
      const filtered = movies.filter(m => (m.title || '').toLowerCase().includes(q));
      if (document.getElementById('movieList')) {
        const movieListEl = document.getElementById('movieList');
        movieListEl.innerHTML = '';
        filtered.forEach(m => {
          const row = document.createElement('div');
          row.className = 'movie-item';
          row.innerHTML = `
            <img class="movie-cover" src="${escapeHtml(m.cover || 'https://via.placeholder.com/60x80?text=No+Image')}" alt="${escapeHtml(m.title || '')}">
            <span class="movie-title">${escapeHtml(m.title || '')}</span>
            <div class="movie-actions">
              <button class="btn-edit"><i class="bi bi-pencil"></i> Edit</button>
              <button class="btn-delete"><i class="bi bi-trash"></i> Delete</button>
            </div>
          `;
          row.querySelector('.btn-edit')?.addEventListener('click', () => {
            editingMovie = m;
            const fields = ['title', 'link', 'synopsis', 'director', 'product', 'stars', 'imdb', 'release_info', 'genre'];
            fields.forEach(f => {
              const el = document.getElementById(f);
              if (el) el.value = m[f] || '';
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          row.querySelector('.btn-delete')?.addEventListener('click', async () => {
            const ok = await showDialog({ message: 'Delete this movie?', type: 'confirm' });
            if (!ok) return;
            const { error } = await supabase.from('movies').delete().eq('id', m.id);
            if (error) { console.error('delete movie err', error); showToast('Delete failed'); }
            else { showToast('Movie deleted'); await fetchMovies(); }
          });
          movieListEl.appendChild(row);
        });
      }
    });
  }

  async function checkUnapprovedComments() {
    try {
      await refreshSessionUser();
      const badge = document.getElementById('commentBadge');
      if (!currentUser || currentUser.id !== ADMIN_UID) {
        if (badge) badge.style.display = 'none';
        return;
      }
      const { data, error } = await supabase.from('comments').select('id').eq('approved', false).limit(1);
      if (error) {
        console.error('Error checking unapproved comments:', error);
        if (badge) badge.style.display = 'none';
        return;
      }
      if (data && data.length > 0) {
        if (badge) badge.style.display = 'grid';
      } else {
        if (badge) badge.style.display = 'none';
      }
    } catch (err) {
      console.error('Exception in checkUnapprovedComments:', err);
      const badge = document.getElementById('commentBadge');
      if (badge) badge.style.display = 'none';
    }
  }

  async function fetchSocialLinks() {
    try {
      const { data, error } = await supabase.from('social_links').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('fetch social links error', error);
        return;
      }
      const grid = document.getElementById('socialGrid');
      if (!grid) return;
      grid.innerHTML = (data || []).map(s => `
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="social-item">
          <img src="${escapeHtml(s.icon)}" alt="${escapeHtml(s.title)}">
          <span>${escapeHtml(s.title)}</span>
        </a>
      `).join('');
    } catch (err) {
      console.error('fetchSocialLinks exception', err);
    }
  }

  // -------------------- Admin: Social Links management --------------------
  const addSocialForm = document.getElementById('addSocialForm');
  const socialList = document.getElementById('socialList');

  async function fetchAdminSocialLinks() {
    const { data, error } = await supabase.from('social_links').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    socialList.innerHTML = (data || []).map(s => `
      <div class="message-item">
        <span class="message-text">${escapeHtml(s.title)}</span>
        <div class="message-actions">
          <button class="btn-edit" data-id="${s.id}"><i class="bi bi-pencil"></i> Edit</button>
          <button class="btn-delete" data-id="${s.id}"><i class="bi bi-trash"></i> Delete</button>
        </div>
      </div>
    `).join('');
  }

  if (addSocialForm) {
    addSocialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('socialTitle').value.trim();
      const url = document.getElementById('socialUrl').value.trim();
      const file = document.getElementById('socialIcon')?.files?.[0];

      if (!title || !url) { showToast('Title and link are required.'); return; }

      let iconUrl = '';
      if (file) {
        const filename = `social/${Date.now()}_${file.name}`;
        const { data: upData, error: upErr } = await supabase.storage.from('covers').upload(filename, file, { upsert: true });
        if (upErr) { showToast('Error uploading icon'); return; }
        const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(upData.path);
        iconUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase.from('social_links').insert([{ title, url, icon: iconUrl }]);
      if (error) {
        console.error(error);
        showToast('Error adding link');
      } else {
        addSocialForm.reset();
        await fetchAdminSocialLinks();
        await fetchSocialLinks();
        showToast('Link added.');
      }
    });

    socialList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-delete')) {
        const ok = await showDialog({ message: 'Should it be deleted?', type: 'confirm' });
        if (!ok) return;
        const { error } = await supabase.from('social_links').delete().eq('id', id);
        if (error) showToast('An error occurred while deleting.');
        else { await fetchAdminSocialLinks(); await fetchSocialLinks(); }
      }

      if (btn.classList.contains('btn-edit')) {
        const newTitle = await showDialog({ message: 'New title:', type: 'prompt', defaultValue: '' });
        if (newTitle === null) return;
        const { error } = await supabase.from('social_links').update({ title: newTitle }).eq('id', id);
        if (error) showToast('Error editing');
        else { await fetchAdminSocialLinks(); await fetchSocialLinks(); }
      }
    });

    fetchAdminSocialLinks();
  }
// مدیریت اپیزودها در فرم ادمین
let episodeCount = 0;

const collectionToggle = document.getElementById("collectionToggle");
const collectionContainer = document.getElementById("collectionContainer");
const addEpisodeBtn = document.getElementById("addEpisodeBtn");

// باز و بسته کردن بخش کالکشن
if (collectionToggle) {
  collectionToggle.addEventListener("click", () => {
    collectionContainer.style.display =
      collectionContainer.style.display === "none" ? "block" : "none";
  });
}

// افزودن اپیزود جدید
function addEpisodeFields() {
  episodeCount++;

  const wrapper = document.createElement("div");
  wrapper.classList.add("episode-block");
  wrapper.style.marginBottom = "10px";

  wrapper.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      <input type="text" placeholder="Episode ${episodeCount} Title" class="episode-title" />
      <input type="text" placeholder="Episode ${episodeCount} File Link" class="episode-link" />
      <input type="file" class="episode-cover" />
      <button type="button" class="remove-episode" 
        style="background:red; color:white; border:none; padding:4px 8px; border-radius:4px;">
        ❌
      </button>
    </div>
  `;

  // دکمه حذف اپیزود
  wrapper.querySelector(".remove-episode").addEventListener("click", () => {
    wrapper.remove();
    episodeCount--;
  });

  // اضافه کردن قبل از دکمه Add next episode
  collectionContainer.insertBefore(wrapper, addEpisodeBtn.parentElement);
}

// رویداد دکمه Add next episode
if (addEpisodeBtn) {
  addEpisodeBtn.addEventListener("click", addEpisodeFields);
}
  // -------------------- Initial load --------------------
  fetchMovies();
  fetchMessages();
  checkUnapprovedComments();
  setInterval(checkUnapprovedComments, 30000);

  if (document.getElementById('unapprovedComments')) {
    loadUnapprovedComments();
  }
  fetchSocialLinks();

}); // end DOMContentLoaded