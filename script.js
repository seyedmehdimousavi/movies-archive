// اتصال به Supabase
const supabase = window.supabase.createClient(
  'https://gwsmvcgjdodmkoqupdal.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c212Y2dqZG9kbWtvcXVwZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDczNjEsImV4cCI6MjA3MjEyMzM2MX0.OVXO9CdHtrCiLhpfbuaZ8GVDIrUlA8RdyQwz2Bk2cDY'
);

// UID ادمین
const ADMIN_UID = "7314d471-8343-44b3-9fcc-a9ae01d99725";
let currentUser = null;
let movies = [];

// بررسی سشن در شروع
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    currentUser = data.session.user;
  }
});

// حالت شب/روز
const themeToggle = document.getElementById('themeToggle');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');

    // ذخیره وضعیت در localStorage برای حفظ حالت بعد از رفرش
    if (document.body.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
}

// وقتی صفحه لود میشه، حالت ذخیره‌شده رو اعمال کن
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

// منوی همبرگری
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
if (menuBtn && sideMenu && menuOverlay) {
  menuBtn.addEventListener('click', () => {
    sideMenu.classList.add('active');
    menuOverlay.classList.add('active');
    document.body.classList.add('no-scroll');
  });
  menuOverlay.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
  });
}

// جست‌وجو و نمایش فیلم‌ها
function renderMovies() {
  const searchInput = document.getElementById('search');
  const grid = document.getElementById('moviesGrid');
  const count = document.getElementById('movieCount');
  if (!searchInput || !grid || !count) return;

  const q = searchInput.value.toLowerCase();
  const filtered = movies.filter(m =>
    Object.values(m).some(val => val && val.toLowerCase().includes(q))
  );

  grid.innerHTML = '';
  count.innerText = `🎞️ تعداد فیلم‌ها: ${filtered.length}`;

  filtered.forEach(m => {
    const genres = m.genre?.split(' ') || [];
    const genreLinks = genres.map(g => `<a href="#" onclick="searchGenre('${g}')">${g}</a>`).join(' ');
    grid.innerHTML += `
      <div class="movie-card">
        <div class="cover-container">
          <div class="cover-blur" style="background-image: url('${m.cover || 'https://via.placeholder.com/300x200?text=No+Image'}');"></div>
          <img class="cover-image" src="${m.cover || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${m.title}">
        </div>
        <div class="movie-info">
          <div class="movie-title">${m.title}</div>
          <span class="field-label">📝 Synopsis:</span>
          <div class="field-quote">${m.synopsis || '-'}</div>
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
}

function searchGenre(g) {
  const searchInput = document.getElementById('search');
  if (!searchInput) return;
  searchInput.value = g;
  renderMovies();
}

function buildGenreGrid() {
  const grid = document.getElementById('genreGrid');
  if (!grid) return;
  const genreSet = new Set();
  movies.forEach(m => {
    if (m.genre) {
      m.genre.split(' ').forEach(g => genreSet.add(g));
    }
  });
  grid.innerHTML = '';
  [...genreSet].sort().forEach(g => {
    const div = document.createElement('div');
    div.className = 'genre-chip';
    div.textContent = g;
    div.onclick = () => searchGenre(g);
    grid.appendChild(div);
  });
}

// دکمه پروفایل (در index.html → رفتن به admin.html)
const profileBtn = document.getElementById('profileBtn');
if (profileBtn) {
  profileBtn.addEventListener('click', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user && session.user.id === ADMIN_UID) {
      window.location.href = 'admin.html';
    } else {
      alert("لطفاً ابتدا وارد شوید");
    }
  });
}

// کدهای مخصوص پنل ادمین (فقط اگر المنت‌ها وجود دارن)
const addMovieForm = document.getElementById('addMovieForm');
const movieList = document.getElementById('movieList');

if (addMovieForm && movieList) {

  addMovieForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser || currentUser.id !== ADMIN_UID) {
      return alert("شما اجازه این کار را ندارید");
    }

    const form = e.target;
    const id = form.dataset.editId;
    const coverFile = document.getElementById('coverFile').files[0];
    let coverUrl = '';

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
      const oldMovie = movies.find(m => String(m.id) === String(id));
      if (!oldMovie) {
        alert("فیلم پیدا نشد");
        return;
      }
      const updateData = {};
      const fields = ['title', 'link', 'synopsis', 'director', 'product', 'stars', 'imdb', 'release_info', 'genre'];
      fields.forEach(field => {
        const newValue = document.getElementById(field).value.trim();
        if (newValue && newValue !== (oldMovie[field] || '')) {
          updateData[field] = newValue;
        }
      });
      if (coverUrl && coverUrl !== oldMovie.cover) {
        updateData.cover = coverUrl;
      }
      if (Object.keys(updateData).length === 0) {
        alert("ℹ️ هیچ تغییری اعمال نشد");
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
      if (!coverUrl) {
        alert("لطفاً کاور را انتخاب کنید");
        return;
      }
            const movie = {
        title: document.getElementById('title').value,
        cover: coverUrl,
        link: document.getElementById('link').value,
        synopsis: document.getElementById('synopsis').value,
        director: document.getElementById('director').value,
        product: document.getElementById('product').value,
        stars: document.getElementById('stars').value,
        imdb: document.getElementById('imdb').value,
        release_info: document.getElementById('release_info').value,
        genre: document.getElementById('genre').value
      };

      const { error } = await supabase.from('movies').insert([movie]);
      if (error) {
        alert('❌ خطا در افزودن فیلم');
        console.error(error);
      } else {
        alert('✅ فیلم اضافه شد');
      }
    }

    fetchMovies();
    form.reset();
  });

  // رندر لیست فیلم‌ها در پنل ادمین
  function renderAdminMovieList() {
    movieList.innerHTML = '';
    movies.forEach(m => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '6px 0';
      row.innerHTML = `
        <span>${m.title}</span>
        <div>
          <button class="btn-edit" data-id="${m.id}">ویرایش</button>
          <button class="btn-delete" data-id="${m.id}">حذف</button>
        </div>
      `;
      movieList.appendChild(row);
    });
  }
  

  // مدیریت کلیک روی دکمه‌های ویرایش و حذف
  movieList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains('btn-edit')) {
      const movie = movies.find(m => String(m.id) === String(id));
      if (movie) editMovie(movie);
    }

    if (btn.classList.contains('btn-delete')) {
      deleteMovie(id);
    }
  });

  // پر کردن فرم برای ویرایش
  function editMovie(movie) {
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

  // حذف فیلم
  async function deleteMovie(id) {
    if (!confirm("آیا از حذف این فیلم مطمئن هستید؟")) return;
    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) {
      alert('❌ خطا در حذف فیلم');
      console.error(error);
    } else {
      alert('✅ فیلم حذف شد');
      fetchMovies();
    }
  }
}

// گرفتن لیست فیلم‌ها (برای هر دو صفحه)
async function fetchMovies() {
  const { data, error } = await supabase.from('movies').select('*').order('id', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  movies = data;
  renderMovies();
  if (document.getElementById('movieList')) {
    renderAdminMovieList();
  }
}

// بارگذاری اولیه
fetchMovies();