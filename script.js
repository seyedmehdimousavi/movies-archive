// -------------------- Supabase config --------------------
const SUPABASE_URL = 'https://gwsmvcgjdodmkoqupdal.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c212Y2dqZG9kbWtvcXVwZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDczNjEsImV4cCI6MjA3MjEyMzM2MX0.OVXO9CdHtrCiLhpfbuaZ8GVDIrUlA8RdyQwz2Bk2cDY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Admin UID
const ADMIN_UID = '7314d471-8343-44b3-9fcc-a9ae01d99725';

// -------------------- App state --------------------
let currentUser = null;
let movies = [];
let messages = [];
let editingMovie = null; // برگشت به منطق فایل اول
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

// -------------------- Comments --------------------
async function loadComments(movieId) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('movie_id', movieId)
      .eq('approved', true) // فقط تاییدشده‌ها را نمایش بده
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
      avatarsEl.innerHTML = latest
        .map(n => `<div class="avatar">${escapeHtml(initials(n))}</div>`)
        .join('');
    }
    if (countEl) {
      countEl.textContent = `${(arr || []).length} comments`;
    }
    if (commentsList) {
      commentsList.innerHTML = (arr || [])
        .map(c => `
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
        `)
        .join('');
      setTimeout(() => {
        commentsList.scrollTop = commentsList.scrollHeight;
      }, 60);
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
    const name = (nameInput?.value || 'Guest').trim() || 'Guest';
    const text = (textInput?.value || '').trim();
    if (!text) {
      alert('Please type a comment');
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
          approved: false,  // در انتظار تایید
          published: false  // هنوز منتشر نشده
        }]);
      if (error) {
        console.error('Error inserting comment:', error);
        alert('Error saving comment: ' + (error.message || JSON.stringify(error)));
      } else {
        if (nameInput) nameInput.value = '';
        if (textInput) textInput.value = '';
        await refresh();
        alert('کامنت ثبت شد و بعد از تایید ادمین نمایش داده می‌شود.');
      }
    } catch (err) {
      console.error('Insert comment exception:', err);
      alert('Error saving comment: ' + (err.message || String(err)));
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = originalText || 'Send';
    }
  });

  // initial summary render
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
        alert('Login modal not found');
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
        alert('Please enter email and password');
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
          alert('Login failed');
        } else {
          loginModal.style.display = 'none';
          window.location.href = 'admin.html';
        }
      } catch (err) {
        console.error(err);
        alert('Login failed');
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
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('id', { ascending: false });
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
  async function renderPagedMovies(skipScroll) {
    if (!moviesGrid || !movieCount) return;

    const q = (searchInput?.value || '').toLowerCase();
    const filtered = movies.filter(m =>
      Object.values(m).some(val => typeof val === 'string' && val.toLowerCase().includes(q))
    );

    const totalPages = computeTotalPages(filtered.length);
    if (currentPage > totalPages) currentPage = totalPages;
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
        .map(g => `<a href="#" onclick="(function(){document.getElementById('search').value='${escapeHtml(g)}'; currentPage=1; renderPagedMovies();})();">${escapeHtml(g)}</a>`)
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

          <span class="field-label"><i class="bi bi-journal-text"></i> Synopsis:</span>
          <div class="field-quote synopsis-quote">
            <div class="quote-text">${synopsis}</div>
            <button class="quote-toggle-btn">More</button>
          </div>

          <span class="field-label"><i class="bi bi-camera-reels"></i> Director:</span>
          <div class="field-quote">${director}</div>

          <span class="field-label"><i class="bi bi-box-seam"></i> Product:</span>
          <div class="field-quote">
            ${product !== '-' ? `<a href="#" onclick="(function(){document.getElementById('search').value='${product}'; currentPage=1; renderPagedMovies();})();">${product}</a>` : '-'}
          </div>

          <span class="field-label"><i class="bi bi-star"></i> Stars:</span>
          <div class="field-quote">${stars}</div>

          <span class="field-label"><i class="bi bi-star-half"></i> IMDB:</span>
          <div class="field-quote">${imdb}</div>

          <span class="field-label"><i class="bi bi-calendar-event"></i> Release:</span>
          <div class="field-quote">${release_info}</div>

          <span class="field-label"><i class="bi bi-tags"></i> Genre:</span>
          <div class="field-quote">${genreLinks || '-'}</div>

          <button class="go-btn" data-link="${escapeHtml(m.link || '#')}">Go to file</button>

          <div class="comment-summary" title="Open comments">
            <div class="avatars" aria-hidden="true"></div>
            <div class="comments-count">0 comments</div>
            <button class="enter-comments" aria-label="open comments"><i class="bi bi-chat-dots"></i></button>
          </div>

          <div class="comments-panel" aria-hidden="true">
            <div class="comments-panel-inner">
              <div class="comments-panel-header">
                <div class="comments-title">Comments</div>
              </div>
              <div class="comments-list" role="log" aria-live="polite"></div>
              <div class="comment-input-row">
                <div class="name-comments-close">
                  <input class="comment-name" placeholder="Your name" maxlength="60" />
                  <button class="comments-close" aria-label="close comments">&times;</button>
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
    }

    // synopsis More/Less toggle
    document.querySelectorAll('.synopsis-quote').forEach(quote => {
      const textEl = quote.querySelector('.quote-text');
      const btn = quote.querySelector('.quote-toggle-btn');
      if (!textEl || !btn) return;
      const fullText = textEl.textContent.trim();
      if (fullText.length > 200) {
        const shortText = fullText.substring(0, 200) + '...';
        let collapsed = true;
        function applyState() {
          if (collapsed) {
            textEl.textContent = shortText;
            quote.style.overflow = 'hidden';
            quote.style.maxHeight = '120px';
            quote.classList.add('collapsed');
            btn.textContent = 'More';
          } else {
            textEl.textContent = fullText;
            quote.style.maxHeight = '1000px';
            quote.classList.remove('collapsed');
            btn.textContent = 'Less';
          }
        }
        function toggleQuote() {
          collapsed = !collapsed;
          applyState();
        }
        applyState();
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleQuote();
        });
        quote.addEventListener('click', (e) => {
          if (e.target.closest('a')) return;
          if (e.target === btn) return;
          toggleQuote();
        });
      } else {
        if (btn) btn.remove();
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
          alert('Logout failed');
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

  // -------------------- Admin: movie list render with edit/delete --------------------
  function renderAdminMovieList(list = movies) {
    if (!movieList) return;
    movieList.innerHTML = '';
    const arr = (list && list.length) ? list : (movies || []);
    arr.forEach(m => {
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
      // Edit
      row.querySelector('.btn-edit')?.addEventListener('click', () => {
        editingMovie = m; // منطق فایل اول
        const fields = ['title', 'link', 'synopsis', 'director', 'product', 'stars', 'imdb', 'release_info', 'genre'];
        fields.forEach(f => {
          const el = document.getElementById(f);
          if (el) el.value = m[f] || '';
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      // Delete
      row.querySelector('.btn-delete')?.addEventListener('click', async () => {
        if (!confirm('Delete this movie?')) return;
        const { error } = await supabase.from('movies').delete().eq('id', m.id);
        if (error) {
          console.error('delete movie err', error);
          alert('Delete failed');
        } else {
          alert('Movie deleted');
          await fetchMovies();
        }
      });
      movieList.appendChild(row);
    });
  }

  // -------------------- Admin: add/edit movie (RESTORED to first file logic) --------------------
  if (addMovieForm && movieList) {
    enforceAdminGuard().then(ok => { if (!ok) return; });

    addMovieForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = await enforceAdminGuard();
      if (!ok) return;

      // آماده‌سازی آپلود کاور در صورت وجود فایل
      const coverInput = document.getElementById('coverFile');
      const coverFile = coverInput?.files?.[0];
      let coverUrl = '';

      if (coverFile) {
        try {
          const filename = `public/${Date.now()}_${coverFile.name}`;
          const { data: upData, error: upErr } = await supabase
            .storage.from('covers')
            .upload(filename, coverFile, { upsert: true });
          if (upErr) { console.error('upload err', upErr); alert('Upload failed'); return; }
          const { data: publicUrl } = supabase
            .storage.from('covers')
            .getPublicUrl(upData.path);
          coverUrl = publicUrl.publicUrl;
        } catch (err) {
          console.error('upload ex', err);
          alert('Upload failed');
          return;
        }
      }

      // حالت ویرایش: مثل فایل اول
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
          // created_at را عمداً نمی‌فرستیم
        };
        if (coverUrl) updateData.cover = coverUrl;

        const { error } = await supabase
          .from('movies')
          .update(updateData)
          .eq('id', editingMovie.id);

        if (error) {
          console.error('movie update err', error);
          alert('Update failed');
        } else {
          alert('Movie updated');
          editingMovie = null;        // ریست منطق ویرایش
          addMovieForm.reset();       // خالی کردن فرم
          await fetchMovies();        // رفرش لیست
        }

      // حالت افزودن
      } else {
        if (!coverUrl) { alert('Please select cover'); return; }
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
          // created_at به صورت اتوماتیک ست می‌شود
        };
        const { error } = await supabase.from('movies').insert([movie]);
        if (error) {
          console.error('movie insert err', error);
          alert('Add movie failed');
        } else {
          alert('Movie added');
          addMovieForm.reset();
          await fetchMovies();
        }
      }
    });
  }

  // -------------------- Admin messages management --------------------
  if (addMessageForm && messageList) {
    enforceAdminGuard().then(ok => { if (!ok) return; });

    addMessageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (document.getElementById('messageText')?.value || '').trim();
      if (!text) return alert('Message cannot be empty');
      const { error } = await supabase.from('messages').insert([{ text }]);
      if (error) { console.error('insert message err', error); alert('Add message failed'); }
      else {
        document.getElementById('messageText').value = '';
        await fetchMessages();
        alert('Message added');
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
        const newText = prompt('Edit message:', msg.text);
        if (newText === null) return;
        const { error } = await supabase.from('messages').update({ text: newText }).eq('id', id);
        if (error) { console.error('message update err', error); alert('Update failed'); }
        else { await fetchMessages(); alert('Message updated'); }
      }

      if (btn.classList.contains('btn-delete')) {
        if (!confirm('Delete this message?')) return;
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) { console.error('msg delete err', error); alert('Delete failed'); }
        else { await fetchMessages(); alert('Message deleted'); }
      }
    });

    renderAdminMessages();
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
            if (!confirm('Delete this movie?')) return;
            const { error } = await supabase.from('movies').delete().eq('id', m.id);
            if (error) { console.error('delete movie err', error); alert('Delete failed'); }
            else { alert('Movie deleted'); await fetchMovies(); }
          });
          movieListEl.appendChild(row);
        });
      }
    });
  }

  // -------------------- Initial load --------------------
  fetchMovies();
  fetchMessages();
}); // end DOMContentLoaded