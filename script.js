// =========================
// script.js (full version)
// =========================

// Supabase client
const supabase = window.supabase.createClient(
  'https://gwsmvcgjdodmkoqupdal.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c212Y2dqZG9kbWtvcXVwZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDczNjEsImV4cCI6MjA3MjEyMzM2MX0.OVXO9CdHtrCiLhpfbuaZ8GVDIrUlA8RdyQwz2Bk2cDY'
);

// Admin UID
const ADMIN_UID = '7314d471-8343-44b3-9fcc-a9ae01d99725';

// State
let currentUser = null;
let movies = [];

// Keep session in sync
supabase.auth.getSession().then(({ data }) => {
  if (data.session) currentUser = data.session.user;
});
supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
});

// =========================
// Theme toggle (with persistence)
// =========================
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
}
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

// =========================
// Side menu
// =========================
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

function openMenu() {
  if (!sideMenu || !menuOverlay) return;
  sideMenu.classList.add('active');
  menuOverlay.classList.add('active');
  document.body.classList.add('no-scroll');
}
function closeMenu() {
  if (!sideMenu || !menuOverlay) return;
  sideMenu.classList.remove('active');
  menuOverlay.classList.remove('active');
  document.body.classList.remove('no-scroll');
}

if (menuBtn && sideMenu && menuOverlay) {
  menuBtn.addEventListener('click', openMenu);
  menuOverlay.addEventListener('click', closeMenu);
}

// =========================
// Movies: render, search, genres
// =========================
function renderMovies() {
  const searchInput = document.getElementById('search');
  const grid = document.getElementById('moviesGrid');
  const count = document.getElementById('movieCount');
  if (!searchInput || !grid || !count) return;

  const q = (searchInput.value || '').toLowerCase();

  const filtered = movies.filter(m =>
    Object.values(m).some(val => typeof val === 'string' && val.toLowerCase().includes(q))
  );

  grid.innerHTML = '';
  count.innerText = `🎞️ تعداد فیلم‌ها: ${filtered.length}`;

  filtered.forEach(m => {
    const genres = m.genre?.split(' ') || [];
    const genreLinks = genres.map(g => `<a href="#" onclick="searchGenre('${g}')">${g}</a>`).join(' ');

    // تمیز کردن متن Synopsis
    const cleanSynopsis = (m.synopsis || '-').replace(/^\s+/, '').replace(/\s+$/, '');

    grid.innerHTML += `
      <div class="movie-card">
        <div class="cover-container">
          <div class="cover-blur" style="background-image: url('${m.cover || 'https://via.placeholder.com/300x200?text=No+Image'}');"></div>
          <img class="cover-image" src="${m.cover || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${m.title}">
        </div>
        <div class="movie-info">
          <div class="movie-title">${m.title || '-'}</div>

          <span class="field-label">📝 Synopsis:</span>
          <div class="field-quote synopsis-quote">
            <div class="quote-text">${cleanSynopsis}</div>
            <button class="quote-toggle-btn">More</button>
          </div>

          <span class="field-label">🎬 Director:</span>
          <div class="field-quote">${m.director || '-'}</div>

          <span class="field-label">🌍 Product:</span>
          <div class="field-quote">${m.product || '-'}</div>

          <span class="field-label">⭐️ Stars:</span>
          <div class="field-quote">${m.stars || '-'}</div>

          <span class="field-label">📱 IMDB:</span>
          <div class="field-quote">${m.imdb || '-'}</div>

          <span class="field-label">📅 Release Info:</span>
          <div class="field-quote">${m.release_info || '-'}</div>

          <span class="field-label">✏️ Genre:</span>
          <div class="field-quote">${genreLinks || '-'}</div>

          <button class="go-btn" onclick="window.open('${m.link}', '_blank')">Go to File</button>
        </div>
      </div>
    `;
  });

  // 🎯 فعال‌سازی More/Less برای Synopsis
  document.querySelectorAll('.synopsis-quote').forEach(quote => {
    const textEl = quote.querySelector('.quote-text');
    const btn = quote.querySelector('.quote-toggle-btn');
    const fullText = textEl.textContent.trim();

    if (fullText.length > 200) {
      const shortText = fullText.substring(0, 200) + '...';
      textEl.textContent = shortText;
      quote.classList.add('collapsed');
      quote.style.overflow = 'hidden';
      quote.style.maxHeight = '120px';
      quote.style.transition = 'max-height 0.35s ease';

      const toggle = () => {
        if (quote.classList.contains('collapsed')) {
          textEl.textContent = fullText;
          const fullH = textEl.scrollHeight + 16; // ارتفاع متن + کمی پدینگ
          quote.style.maxHeight = fullH + 'px';
          quote.classList.remove('collapsed');
          btn.textContent = 'Less';
        } else {
          textEl.textContent = shortText;
          quote.style.maxHeight = '120px';
          quote.classList.add('collapsed');
          btn.textContent = 'More';
        }
      };

      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggle();
      });

      quote.addEventListener('click', e => {
        if (!e.target.classList.contains('quote-toggle-btn')) {
          toggle();
        }
      });

      quote.addEventListener('transitionend', e => {
        if (e.propertyName === 'max-height' && !quote.classList.contains('collapsed')) {
          quote.style.maxHeight = 'none';
        }
      });

    } else {
      btn.remove();
    }
  });
}

// expose for inline onclick in cards
window.searchGenre = function searchGenre(g) {
  const searchInput = document.getElementById('search');
  if (!searchInput) return;
  searchInput.value = g;
  renderMovies();
  closeMenu();
};

function buildGenreGrid() {
  const grid = document.getElementById('genreGrid');
  if (!grid) return;

  const genreSet = new Set();
  movies.forEach(m => {
    if (m.genre) m.genre.split(' ').forEach(g => genreSet.add(g));
  });

  grid.innerHTML = '';
  [...genreSet].sort().forEach(g => {
    const div = document.createElement('div');
    div.className = 'genre-chip';
    div.textContent = g;
    div.onclick = () => window.searchGenre(g);
    grid.appendChild(div);
  });
}

// =========================
/* Profile -> login modal or admin */
// =========================
const profileBtn = document.getElementById('profileBtn');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginForm = document.getElementById('loginForm');
const loginWithGmail = document.getElementById('loginWithGmail');

if (profileBtn) {
  profileBtn.addEventListener('click', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user && session.user.id === ADMIN_UID) {
      window.location.href = 'admin.html';
    } else if (loginModal) {
      loginModal.style.display = 'block';
    } else {
      alert('لطفاً ابتدا وارد شوید'); // fallback اگر مودال در HTML نیست
    }
  });
}

if (closeLoginModal && loginModal) {
  closeLoginModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.style.display = 'none';
  });
}

if (loginForm && loginModal) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'در حال ورود...';
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'LOG IN NOW';
    }

    if (error) {
      alert('❌ ورود ناموفق');
      console.error(error);
    } else {
      loginModal.style.display = 'none';
      window.location.href = 'admin.html';
    }
  });
}

if (loginWithGmail) {
  loginWithGmail.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin.html`
      }
    });
    if (error) {
      alert('❌ ورود با جیمیل ناموفق');
      console.error(error);
    }
  });
}

// =========================
// Admin-only code (runs only if admin elements exist)
// =========================
const addMovieForm = document.getElementById('addMovieForm');
const movieList = document.getElementById('movieList');
const logoutBtn = document.getElementById('logoutBtn');

async function enforceAdminGuard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== ADMIN_UID) {
    // اگر روی admin.html هستیم و مجوز نداریم، برگرد به صفحه اصلی
    if (addMovieForm || movieList || logoutBtn) {
      window.location.href = 'index.html';
    }
    return false;
  }
  currentUser = session.user;
  return true;
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      logoutBtn.disabled = true;
      const old = logoutBtn.textContent;
      logoutBtn.textContent = 'در حال خروج...';
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('❌ خطا در خروج');
        logoutBtn.disabled = false;
        logoutBtn.textContent = old;
        return;
      }
      currentUser = null;
      window.location.href = 'index.html';
    } catch (e) {
      console.error(e);
      alert('❌ خطای غیرمنتظره در خروج');
      logoutBtn.disabled = false;
    }
  });
}

if (addMovieForm && movieList) {
  // پیش از هر کاری، مجوز ادمین
  enforceAdminGuard();

  addMovieForm.addEventListener('submit', async e => {
    e.preventDefault();
    const ok = await enforceAdminGuard();
    if (!ok) return;

    const form = e.target;
    const id = form.dataset.editId;

    const coverFile = document.getElementById('coverFile')?.files?.[0];
    let coverUrl = '';

    // Upload cover if provided
    if (coverFile) {
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('covers')
        .upload(`public/${Date.now()}_${coverFile.name}`, coverFile, { upsert: true });

      if (storageError) {
        alert('❌ خطا در آپلود کاور');
        console.error(storageError);
        return;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('covers')
        .getPublicUrl(storageData.path);
      coverUrl = publicUrlData.publicUrl;
    }

    if (id) {
      // Edit mode
      const oldMovie = movies.find(m => String(m.id) === String(id));
      if (!oldMovie) {
        alert('فیلم پیدا نشد');
        return;
      }
      const updateData = {};
      const fields = ['title', 'link', 'synopsis', 'director', 'product', 'stars', 'imdb', 'release_info', 'genre'];
      fields.forEach(field => {
        const el = document.getElementById(field);
        const newValue = (el?.value || '').trim();
        if (newValue && newValue !== (oldMovie[field] || '')) {
          updateData[field] = newValue;
        }
      });
      if (coverUrl && coverUrl !== oldMovie.cover) {
        updateData.cover = coverUrl;
      }
      if (Object.keys(updateData).length === 0) {
        alert('ℹ️ هیچ تغییری اعمال نشد');
        return;
      }
      const { error } = await supabase.from('movies').update(updateData).eq('id', id);
      if (error) {
        alert('❌ خطا در ویرایش فیلم');
        console.error(error);
      } else {
        alert('✅ فیلم ویرایش شد');
        form.removeAttribute('data-edit-id');
      }
    } else {
      // Add mode
      if (!coverUrl) {
        alert('لطفاً کاور را انتخاب کنید');
        return;
      }
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
      const { error } = await supabase.from('movies').insert([movie]);
      if (error) {
        alert('❌ خطا در افزودن فیلم');
        console.error(error);
      } else {
        alert('✅ فیلم اضافه شد');
      }
    }

    await fetchMovies();
    form.reset();
  });

  function renderAdminMovieList(list = movies) {
  movieList.innerHTML = '';
  list.forEach(m => {
    const row = document.createElement('div');
    row.className = 'movie-item';
    row.innerHTML = `
      <img class="movie-cover" src="${m.cover || 'https://via.placeholder.com/60x80?text=No+Image'}" alt="${m.title}">
      <span class="movie-title">${m.title}</span>
      <div class="movie-actions">
        <button class="btn-edit" data-id="${m.id}">Edit</button>
        <button class="btn-delete" data-id="${m.id}">Delete</button>
      </div>
    `;
    movieList.appendChild(row);
  });
}

  movieList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains('btn-edit')) {
      const movie = movies.find(m => String(m.id) === String(id));
      if (movie) {
        document.getElementById('title').value = movie.title || '';
        document.getElementById('link').value = movie.link || '';
        document.getElementById('synopsis').value = movie.synopsis || '';
        document.getElementById('director').value = movie.director || '';
        document.getElementById('product').value = movie.product || '';
        document.getElementById('stars').value = movie.stars || '';
        document.getElementById('imdb').value = movie.imdb || '';
        document.getElementById('release_info').value = movie.release_info || '';
        document.getElementById('genre').value = movie.genre || '';
        addMovieForm.dataset.editId = movie.id;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    if (btn.classList.contains('btn-delete')) {
      deleteMovie(id);
    }
  });

  async function deleteMovie(id) {
    const ok = await enforceAdminGuard();
    if (!ok) return;
    if (!confirm('آیا از حذف این فیلم مطمئن هستید؟')) return;

    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) {
      alert('❌ خطا در حذف فیلم');
      console.error(error);
    } else {
      alert('✅ فیلم حذف شد');
      fetchMovies();
    }
  }

  // expose for conditional call in fetchMovies
  window.renderAdminMovieList = renderAdminMovieList;
}

// =========================
// Fetch movies (shared)
// =========================
async function fetchMovies() {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ خطا در دریافت فیلم‌ها:', error);
    return;
  }

  movies = data || [];

  // user page
  if (document.getElementById('moviesGrid')) {
    renderMovies();
    buildGenreGrid();
  }

// admin page
  if (document.getElementById('movieList') && typeof window.renderAdminMovieList === 'function') {
    window.renderAdminMovieList();
  }
}

// =========================
// Initial load
// =========================
fetchMovies();