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
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// منوی همبرگری
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

menuBtn.addEventListener('click', () => {
  sideMenu.classList.add('active');
  menuOverlay.classList.add('active');
});

menuOverlay.addEventListener('click', closeMenu);
function closeMenu() {
  sideMenu.classList.remove('active');
  menuOverlay.classList.remove('active');
}

// جست‌وجو و نمایش فیلم‌ها
function renderMovies() {
  const q = document.getElementById('search').value.toLowerCase();
  const grid = document.getElementById('moviesGrid');
  const count = document.getElementById('movieCount');
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
// جست‌وجو با کلیک روی ژانر
function searchGenre(g) {
  document.getElementById('search').value = g;
  renderMovies();
  closeMenu();
}

// ساخت لیست ژانرها
function buildGenreGrid() {
  const genreSet = new Set();
  movies.forEach(m => {
    if (m.genre) {
      m.genre.split(' ').forEach(g => genreSet.add(g));
    }
  });
  const grid = document.getElementById('genreGrid');
  grid.innerHTML = '';
  [...genreSet].sort().forEach(g => {
    const div = document.createElement('div');
    div.className = 'genre-chip';
    div.textContent = g;
    div.onclick = () => searchGenre(g);
    grid.appendChild(div);
  });
}

// دکمه پروفایل
document.getElementById('profileBtn').addEventListener('click', () => {
  if (!currentUser || currentUser.id !== ADMIN_UID) {
    const email = prompt("ایمیل ادمین:");
    const password = prompt("رمز عبور:");
    if (email && password) {
      supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
        if (error) {
          alert("❌ ورود ناموفق");
        } else {
          currentUser = data.user;
          if (currentUser.id === ADMIN_UID) {
            alert("✅ ورود موفق");
            document.getElementById('adminProfile').classList.remove('hidden');
          } else {
            alert("❌ شما ادمین نیستید");
          }
        }
      });
    }
  } else {
    document.getElementById('adminProfile').classList.toggle('hidden');
  }
});

// افزودن یا ویرایش فیلم
document.getElementById('addMovieForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser || currentUser.id !== ADMIN_UID) {
    return alert("شما اجازه این کار را ندارید");
  }

  let coverUrl = '';
  const coverFile = document.getElementById('coverFile').files[0];
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

  if (e.target.dataset.editId) {
    const { error } = await supabase
      .from('movies')
      .update(movie)
      .eq('id', e.target.dataset.editId);
    if (error) {
      alert('❌ خطا در ویرایش فیلم');
      console.error(error);
    } else {
      alert('✅ فیلم ویرایش شد');
      e.target.removeAttribute('data-edit-id');
    }
  } else {
    const { error } = await supabase.from('movies').insert([movie]);
    if (error) {
      alert('❌ خطا در افزودن فیلم');
      console.error(error);
    } else {
      alert('✅ فیلم اضافه شد');
    }
  }

  fetchMovies();
  document.getElementById('addMovieForm').reset();
});

// حذف فیلم
async function deleteMovie(id) {
  if (!currentUser || currentUser.id !== ADMIN_UID) {
    return alert("شما اجازه این کار را ندارید");
  }
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

// ویرایش فیلم
function editMovie(movie) {
  if (!currentUser || currentUser.id !== ADMIN_UID) {
    return alert("شما اجازه این کار را ندارید");
  }
  document.getElementById('title').value = movie.title;
  document.getElementById('link').value = movie.link;
  document.getElementById('synopsis').value = movie.synopsis;
  document.getElementById('director').value = movie.director;
  document.getElementById('product').value = movie.product;
  document.getElementById('stars').value = movie.stars;
  document.getElementById('imdb').value = movie.imdb;
  document.getElementById('release_info').value = movie.release_info;
  document.getElementById('genre').value = movie.genre;
  document.getElementById('addMovieForm').dataset.editId = movie.id;
  document.getElementById('adminProfile').classList.remove('hidden');
}

// لیست فیلم‌ها در پنل ادمین
function renderAdminMovieList() {
  const list = document.getElementById('movieList');
  list.innerHTML = '';
  movies.forEach(m => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '6px 0';
    div.innerHTML = `
      <span>${m.title}</span>
      <div>
        <button onclick='editMovie(${JSON.stringify(m)})'>ویرایش</button>
        <button onclick='deleteMovie(${m.id})'>حذف</button>
      </div>
    `;
    list.appendChild(div);
  });
}

// دریافت فیلم‌ها از دیتابیس
async function fetchMovies() {
  const { data, error } = await supabase.from('movies').select('*');
  if (error) {
    console.error('❌ خطا در دریافت فیلم‌ها:', error);
    return;
  }
  movies = data;
  renderMovies();
  buildGenreGrid();
  renderAdminMovieList();
}

// شروع
fetchMovies();