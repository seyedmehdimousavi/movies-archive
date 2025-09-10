// script.js — Full production-ready (based on your requests)
// Supabase config (same as before)
const SUPABASE_URL = 'https://gwsmvcgjdodmkoqupdal.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c212Y2dqZG9kbWtvcXVwZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDczNjEsImV4cCI6MjA3MjEyMzM2MX0.OVXO9CdHtrCiLhpfbuaZ8GVDIrUlA8RdyQwz2Bk2cDY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Admin UID
const ADMIN_UID = '7314d471-8343-44b3-9fcc-a9ae01d99725';

// State
let currentUser = null;
let movies = [];
let messages = [];
let commentsCache = {}; // { movieId: [comments] }
const PAGE_SIZE = 10;
let currentPage = 1;

// Utilities
function escapeHtml(str){ if(str===undefined||str===null) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function initials(name){ if(!name)return 'U'; const p=name.trim().split(/\s+/); if(p.length===1) return p[0].slice(0,2).toUpperCase(); return (p[0][0]+(p[1][0]||'')).toUpperCase(); }
function timeAgo(iso){ if(!iso) return ''; const then=new Date(iso).getTime(); const diff=Math.floor((Date.now()-then)/1000); if(diff<60) return `${diff}s`; if(diff<3600) return `${Math.floor(diff/60)}m`; if(diff<86400) return `${Math.floor(diff/3600)}h`; return `${Math.floor(diff/86400)}d`; }

// Dom ready
document.addEventListener('DOMContentLoaded', () => {
  // Element refs
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
  if(loginModal) loginModal.style.display = 'none';

  // Theme toggle
  function applyTheme(dark){
    if(dark){ document.body.classList.add('dark'); if(themeToggle){ const i=themeToggle.querySelector('i'); if(i) i.className='bi bi-sun'; } localStorage.setItem('theme','dark'); }
    else{ document.body.classList.remove('dark'); if(themeToggle){ const i=themeToggle.querySelector('i'); if(i) i.className='bi bi-moon'; } localStorage.setItem('theme','light'); }
  }
  if(themeToggle) themeToggle.addEventListener('click', ()=>applyTheme(!document.body.classList.contains('dark')));
  if(localStorage.getItem('theme')==='dark') applyTheme(true);

  // Menu open/close
  if(menuBtn && sideMenu && menuOverlay){
    menuBtn.addEventListener('click', ()=>{ sideMenu.classList.add('active'); menuOverlay.classList.add('active'); document.body.classList.add('no-scroll'); });
    menuOverlay.addEventListener('click', ()=>{ sideMenu.classList.remove('active'); menuOverlay.classList.remove('active'); document.body.classList.remove('no-scroll'); });
  }

  // Auth helpers
  async function refreshSessionUser(){ try{ const { data } = await supabase.auth.getSession(); currentUser = data?.session?.user || null; }catch(e){ currentUser = null; console.error(e);} }
  refreshSessionUser();
  supabase.auth.onAuthStateChange((_ev, session)=> currentUser = session?.user || null);

  // Profile button -> show login modal or go to admin
  if(profileBtn){
    profileBtn.addEventListener('click', async ()=>{
      await refreshSessionUser();
      if(currentUser && currentUser.id === ADMIN_UID) window.location.href = 'admin.html';
      else if(loginModal) loginModal.style.display = 'block';
      else alert('Login modal not available');
    });
  }

  // login modal close
  if(closeLoginModal && loginModal){
    closeLoginModal.addEventListener('click', ()=> loginModal.style.display = 'none');
    window.addEventListener('click', (e)=> { if(e.target === loginModal) loginModal.style.display = 'none'; });
  }

  // login form submit
  if(loginForm && loginEmail && loginPassword){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();
      if(!email || !password){ alert('Please enter email and password'); return; }
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Signing in...';
      try{
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if(error){ console.error(error); alert('Login failed'); }
        else { loginModal.style.display = 'none'; window.location.href = 'admin.html'; }
      }catch(err){ console.error(err); alert('Login failed'); }
      finally{ btn.disabled = false; btn.textContent = 'Log in'; }
    });
  }

  // login with google
  if(loginWithGmail){
    loginWithGmail.addEventListener('click', async (e)=>{
      e.preventDefault();
      try{
        const { error } = await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: `${window.location.origin}/admin.html` }});
        if(error){ console.error('oauth err', error); alert('OAuth failed'); }
      }catch(err){ console.error(err); }
    });
  }

  // Fetch data
  async function fetchMovies(){
    try{
      const { data, error } = await supabase.from('movies').select('*').order('id',{ascending:false});
      if(error){ console.error('fetch movies',error); movies=[]; } else movies = data || [];
      currentPage = 1;
      renderPagedMovies();
      buildGenreGrid();
      if(movieList) renderAdminMovieList();
    }catch(err){ console.error(err); movies = []; }
  }
  async function fetchMessages(){
    try{
      const { data, error } = await supabase.from('messages').select('*').order('id',{ascending:false});
      if(error){ console.error('fetch messages', error); messages=[]; } else messages = data || [];
      renderMessages();
      if(messageList) renderAdminMessages();
    }catch(err){ console.error(err); messages=[]; }
  }

  // Messages (index bubbles)
  function renderMessages(){
    if(!adminMessagesContainer) return;
    adminMessagesContainer.innerHTML = '';
    (messages||[]).forEach(m=>{
      const div = document.createElement('div');
      div.className='message-bubble';
      div.innerHTML = `<span>${escapeHtml(m.text)}</span><button class="msg-close" aria-label="close">&times;</button>`;
      div.querySelector('.msg-close').addEventListener('click', ()=>div.remove());
      adminMessagesContainer.appendChild(div);
    });
  }

  // Genres grid
  function buildGenreGrid(){
    if(!genreGrid) return;
    const set = new Set();
    (movies||[]).forEach(m=>{ if(m.genre) m.genre.split(' ').forEach(g=>{ if(g && g.trim()) set.add(g.trim()); }); });
    genreGrid.innerHTML = '';
    [...set].sort().forEach(g=>{
      const d = document.createElement('div'); d.className='genre-chip'; d.textContent=g;
      d.onclick = ()=>{ if(searchInput) searchInput.value = g; currentPage=1; renderPagedMovies(); sideMenu?.classList.remove('active'); menuOverlay?.classList.remove('active'); document.body.classList.remove('no-scroll'); };
      genreGrid.appendChild(d);
    });
  }

  // Pagination helpers
  function computeTotalPages(len){ return Math.max(1, Math.ceil((len||0)/PAGE_SIZE)); }
  function renderPagination(filteredLength){
    if(!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const total = computeTotalPages(filteredLength);
    if(total <= 1) return;
    const create = (label, page, active=false)=>{
      const btn = document.createElement('button');
      btn.className = 'page-bubble' + (active?' active':'');
      btn.textContent = label;
      btn.dataset.page = page;
      btn.addEventListener('click', ()=>{
        if(page === 'dots') return;
        currentPage = Number(page);
        renderPagedMovies(true);
        window.scrollTo({ top: document.querySelector('.container')?.offsetTop - 8 || 0, behavior: 'smooth' });
      });
      return btn;
    };

    if(total <= 9){
      for(let i=1;i<=total;i++) paginationContainer.appendChild(create(i,i,i===currentPage));
    } else {
      if(currentPage <= 5){
        for(let i=1;i<=9;i++) paginationContainer.appendChild(create(i,i,i===currentPage));
        paginationContainer.appendChild(create('...','dots'));
      } else if(currentPage >= total-4){
        paginationContainer.appendChild(create('...','dots'));
        for(let i=total-8;i<=total;i++) paginationContainer.appendChild(create(i,i,i===currentPage));
      } else {
        paginationContainer.appendChild(create('...','dots'));
        for(let i=currentPage-3;i<=currentPage+4;i++) paginationContainer.appendChild(create(i,i,i===currentPage));
        paginationContainer.appendChild(create('...','dots'));
      }
    }
  }

  // Local comments fallback
  function loadLocalComments(movieId){ try{ const raw = localStorage.getItem(`local_comments_${movieId}`); return raw? JSON.parse(raw):[] }catch(e){return []} }
  function saveLocalComment(movieId, comment){ const arr = loadLocalComments(movieId); arr.unshift(comment); localStorage.setItem(`local_comments_${movieId}`, JSON.stringify(arr)); }

  // Render paged movies
  async function renderPagedMovies(skipScroll){
    if(!moviesGrid || !movieCount) return;
    const q = (searchInput?.value || '').toLowerCase();
    const filtered = (movies||[]).filter(m => Object.values(m||{}).some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
    const totalPages = computeTotalPages(filtered.length);
    if(currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage-1)*PAGE_SIZE;
    const pageItems = filtered.slice(start, start+PAGE_SIZE);

    moviesGrid.innerHTML = '';
    movieCount.innerText = `🎞️ تعداد فیلم‌ها: ${filtered.length}`;

    for(const m of pageItems){
      const card = document.createElement('div'); card.className='movie-card'; card.dataset.movieId = m.id;
      const cover = escapeHtml(m.cover || 'https://via.placeholder.com/300x200?text=No+Image');
      const title = escapeHtml(m.title || '-');
      const synopsis = escapeHtml((m.synopsis||'-').trim());
      const director = escapeHtml(m.director||'-');
      const product = escapeHtml(m.product||'-');
      const stars = escapeHtml(m.stars||'-');
      const imdb = escapeHtml(m.imdb||'-');
      const release_info = escapeHtml(m.release_info||'-');
      const genreLinks = (m.genre||'').split(' ').filter(g=>g.trim()).map(g=>`<a href="#" onclick="(function(){document.getElementById('search').value='${escapeHtml(g)}'; currentPage=1; renderPagedMovies();})();">${escapeHtml(g)}</a>`).join(' ');

      card.innerHTML = `
        <div class="cover-container">
          <div class="cover-blur" style="background-image:url('${cover}')"></div>
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
          <div class="field-quote">${product !== '-' ? `<a href="#" onclick="(function(){document.getElementById('search').value='${product}'; currentPage=1; renderPagedMovies();})();">${product}</a>` : '-'}</div>

          <span class="field-label"><i class="bi bi-star"></i> Stars:</span>
          <div class="field-quote">${stars}</div>

          <span class="field-label"><i class="bi bi-star-half"></i> IMDB:</span>
          <div class="field-quote">${imdb}</div>

          <span class="field-label"><i class="bi bi-calendar-event"></i> Release:</span>
          <div class="field-quote">${release_info}</div>

          <span class="field-label"><i class="bi bi-tags"></i> Genre:</span>
          <div class="field-quote">${genreLinks || '-'}</div>

          <button class="go-btn" data-link="${escapeHtml(m.link||'#')}">Go to file</button>

          <div class="comment-summary" title="Open comments">
            <div class="avatars" aria-hidden="true"></div>
            <div class="comments-count">0 comments</div>
            <button class="enter-comments" aria-label="open comments"><i class="bi bi-chat-dots"></i></button>
          </div>

          <div class="comments-panel" aria-hidden="true">
            <div class="comments-panel-inner">
              <div class="comments-panel-header">
                <div class="comments-title">Comments</div>
                <button class="comments-close" aria-label="close comments">&times;</button>
              </div>
              <div class="comments-list" role="log" aria-live="polite"></div>
              <div class="comment-input-row">
                <input class="comment-name" placeholder="Your name" maxlength="60" />
                <textarea class="comment-text" placeholder="Write a comment..." rows="2"></textarea>
                <button class="comment-send">Send</button>
              </div>
            </div>
          </div>

        </div>
      `;
      moviesGrid.appendChild(card);

      // handlers
      const goBtn = card.querySelector('.go-btn');
      goBtn?.addEventListener('click', ()=>{ const link = goBtn.dataset.link || '#'; if(link && link!=='#') window.open(link,'_blank'); });

      const movieId = m.id;
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

      async function loadCommentsForCard() {
        if(commentsCache[movieId]){ renderCommentsUI(commentsCache[movieId]); return; }
        try{
          const { data, error } = await supabase.from('comments').select('*').eq('movie_id', movieId).order('id',{ascending:false}).limit(200);
          if(!error){ commentsCache[movieId] = data || []; renderCommentsUI(commentsCache[movieId]); return; }
          else console.warn('comments fetch err', error);
        }catch(err){ console.warn('comments fetch ex', err); }
        const local = loadLocalComments(movieId);
        commentsCache[movieId] = local;
        renderCommentsUI(local);
      }

      function renderCommentsUI(arr){
        const latest = (arr||[]).slice(0,3).map(c=>c.name||'Guest');
        avatarsEl.innerHTML = latest.map(n=>`<div class="avatar">${escapeHtml(initials(n))}</div>`).join('');
        countEl.textContent = `${(arr||[]).length} comments`;
        commentsList.innerHTML = (arr||[]).slice().reverse().map(c=>`
          <div class="comment-row">
            <div class="comment-avatar">${escapeHtml(initials(c.name))}</div>
            <div class="comment-body">
              <div class="comment-meta"><strong>${escapeHtml(c.name)}</strong> · <span class="comment-time">${timeAgo(c.created_at)}</span></div>
              <div class="comment-text-content">${escapeHtml(c.text)}</div>
            </div>
          </div>
        `).join('');
        setTimeout(()=>{ commentsList.scrollTop = commentsList.scrollHeight; }, 80);
      }

      async function openComments(){ await loadCommentsForCard(); panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); setTimeout(()=> { const listEl = panel.querySelector('.comments-list'); if(listEl) listEl.scrollTop = listEl.scrollHeight; }, 160); }
      function closeComments(){ panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); }

      enterBtn?.addEventListener('click', openComments);
      summaryRow?.addEventListener('click', openComments);
      closeBtn?.addEventListener('click', closeComments);

      sendBtn?.addEventListener('click', async ()=>{
        const name = (nameInput.value||'Guest').trim()||'Guest';
        const text = (textInput.value||'').trim();
        if(!text){ alert('Please type a comment'); return; }
        sendBtn.disabled = true; sendBtn.textContent='Sending...';
        try{
          const { data, error } = await supabase.from('comments').insert([{ movie_id: movieId, name, text }]);
          if(!error){ nameInput.value=''; textInput.value=''; delete commentsCache[movieId]; await loadCommentsForCard(); }
          else { console.warn('insert err', error); saveLocalComment(movieId, { movie_id: movieId, name, text, created_at:new Date().toISOString() }); delete commentsCache[movieId]; await loadCommentsForCard(); alert('Comment saved locally (server error)'); }
        }catch(err){ console.warn('insert ex', err); saveLocalComment(movieId, { movie_id: movieId, name, text, created_at:new Date().toISOString() }); delete commentsCache[movieId]; await loadCommentsForCard(); alert('Comment saved locally (network error)'); }
        finally{ sendBtn.disabled=false; sendBtn.textContent='Send'; }
      });

      // initial avatars/count
      loadCommentsForCard();
    } // end loop pageItems

    // synopsis more/less
    document.querySelectorAll('.synopsis-quote').forEach(quote=>{
      const textEl = quote.querySelector('.quote-text');
      const btn = quote.querySelector('.quote-toggle-btn');
      if(!textEl || !btn) return;
      const fullText = textEl.textContent.trim();
      if(fullText.length > 200){
        const shortText = fullText.substring(0,200) + '...';
        textEl.textContent = shortText;
        quote.classList.add('collapsed');
        quote.style.maxHeight = '120px';
        btn.textContent = 'More';
        btn.onclick = (e) => { e.stopPropagation(); if(quote.classList.contains('collapsed')){ textEl.textContent = fullText; quote.style.maxHeight = '1000px'; quote.classList.remove('collapsed'); btn.textContent='Less'; } else { textEl.textContent = shortText; quote.style.maxHeight = '120px'; quote.classList.add('collapsed'); btn.textContent='More'; } };
      } else { if(btn) btn.remove(); }
    });

    // pagination
    renderPagination(filtered.length);
  } // renderPagedMovies

  // Admin functions (if admin page present)
  async function enforceAdminGuard(){
    try{
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if(!session || session.user.id !== ADMIN_UID){
        if(window.location.pathname.endsWith('admin.html')) window.location.href = 'index.html';
        return false;
      }
      currentUser = session.user;
      return true;
    }catch(err){ console.error(err); if(window.location.pathname.endsWith('admin.html')) window.location.href='index.html'; return false; }
  }

  if(logoutBtn){
    logoutBtn.addEventListener('click', async ()=>{
      logoutBtn.disabled = true;
      try{ const { error } = await supabase.auth.signOut(); if(error){ console.error(error); alert('Logout failed'); logoutBtn.disabled=false; } else window.location.href='index.html'; }catch(err){ console.error(err); logoutBtn.disabled=false; }
    });
  }

  // Admin add/edit movie
  if(addMovieForm && movieList){
    // ✅ نسخه اصلاح‌شده
(async () => {
  await enforceAdminGuard();
  // بقیه کدهایی که بعد از enforceAdminGuard باید اجرا بشن
})();

    addMovieForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const ok = await enforceAdminGuard();
      if(!ok) return;
      const form = e.target;
      const editId = form.dataset.editId;
      const coverInput = document.getElementById('coverFile');
      const coverFile = coverInput?.files?.[0];
      let coverUrl = '';
      if(coverFile){
        try{
          const filename = `public/${Date.now()}_${coverFile.name}`;
          const { data: upData, error: upErr } = await supabase.storage.from('covers').upload(filename, coverFile, { upsert:true });
          if(upErr){ console.error(upErr); alert('Upload failed'); return; }
          const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(upData.path);
          coverUrl = publicUrl.publicUrl;
        }catch(err){ console.error(err); alert('Upload failed'); return; }
      }

      if(editId){
        const updateData = {};
        ['title','link','synopsis','director','product','stars','imdb','release_info','genre'].forEach(f=>{ const v=document.getElementById(f)?.value?.trim(); if(v) updateData[f]=v; });
        if(coverUrl) updateData.cover = coverUrl;
        if(Object.keys(updateData).length>0){ const { error } = await supabase.from('movies').update(updateData).eq('id', editId); if(error){ console.error(error); alert('Update failed'); } else { alert('Movie updated'); form.removeAttribute('data-edit-id'); } }
        else alert('No changes detected');
      } else {
        if(!coverUrl){ alert('Please select cover'); return; }
        const movie = { title: document.getElementById('title')?.value||'', cover: coverUrl, link: document.getElementById('link')?.value||'', synopsis: document.getElementById('synopsis')?.value||'', director: document.getElementById('director')?.value||'', product: document.getElementById('product')?.value||'', stars: document.getElementById('stars')?.value||'', imdb: document.getElementById('imdb')?.value||'', release_info: document.getElementById('release_info')?.value||'', genre: document.getElementById('genre')?.value||'' };
        const { error } = await supabase.from('movies').insert([movie]);
        if(error){ console.error(error); alert('Add movie failed'); } else { alert('Movie added'); form.reset(); }
      }
      await fetchMovies();
    });

    function renderAdminMovieList(list = movies){
      movieList.innerHTML = '';
      const arr = (list && list.length)? list : (movies || []);
      arr.forEach(m=>{
        const row = document.createElement('div'); row.className='movie-item';
        row.innerHTML = `<img class="movie-cover" src="${escapeHtml(m.cover||'https://via.placeholder.com/60x80?text=No+Image')}" alt="${escapeHtml(m.title||'')}"><span class="movie-title">${escapeHtml(m.title||'')}</span><div class="movie-actions"><button class="btn-edit" data-id="${m.id}"><i class="bi bi-pencil"></i> Edit</button><button class="btn-delete" data-id="${m.id}"><i class="bi bi-trash"></i> Delete</button></div>`;
        movieList.appendChild(row);
      });
    }

    movieList.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      if(!id) return;
      if(btn.classList.contains('btn-edit')){
        const movie = movies.find(x=> String(x.id) === String(id));
        if(movie){ ['title','link','synopsis','director','product','stars','imdb','release_info','genre'].forEach(f=>{ const el=document.getElementById(f); if(el) el.value = movie[f]||'' }); addMovieForm.dataset.editId = movie.id; window.scrollTo({ top:0, behavior:'smooth' }); }
      }
      if(btn.classList.contains('btn-delete')){
        if(!confirm('Delete this movie?')) return;
        const { error } = await supabase.from('movies').delete().eq('id', id);
        if(error){ console.error(error); alert('Delete failed'); } else { alert('Movie deleted'); await fetchMovies(); }
      }
    });

    renderAdminMovieList();
  }

  // Admin messages management
  if(addMessageForm && messageList){
   // ✅ نسخه اصلاح‌شده
(async () => {
  await enforceAdminGuard();
  // بقیه کدهایی که بعد از enforceAdminGuard باید اجرا بشن
})();

    addMessageForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const text = (document.getElementById('messageText')?.value||'').trim();
      if(!text) return alert('Message cannot be empty');
      const { error } = await supabase.from('messages').insert([{ text }]);
      if(error){ console.error(error); alert('Add message failed'); } else { document.getElementById('messageText').value=''; await fetchMessages(); alert('Message added'); }
    });

    function renderAdminMessages(){
      messageList.innerHTML = '';
      (messages||[]).forEach(m=>{
        const el = document.createElement('div'); el.className='message-item';
        el.innerHTML = `<span class="message-text">${escapeHtml(m.text)}</span><div class="message-actions"><button class="btn-edit" data-id="${m.id}"><i class="bi bi-pencil"></i> Edit</button><button class="btn-delete" data-id="${m.id}"><i class="bi bi-trash"></i> Delete</button></div>`;
        messageList.appendChild(el);
      });
    }

    messageList.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button'); if(!btn) return; const id = btn.dataset.id; if(!id) return;
      if(btn.classList.contains('btn-edit')){
        const msg = messages.find(x => String(x.id) === String(id)); if(!msg) return; const newText = prompt('Edit message:', msg.text); if(newText===null) return;
        const { error } = await supabase.from('messages').update({ text: newText }).eq('id', id);
        if(error){ console.error(error); alert('Update failed'); } else { await fetchMessages(); alert('Message updated'); }
      }
      if(btn.classList.contains('btn-delete')){
        if(!confirm('Delete this message?')) return; const { error } = await supabase.from('messages').delete().eq('id', id);
        if(error){ console.error(error); alert('Delete failed'); } else { await fetchMessages(); alert('Message deleted'); }
      }
    });

    renderAdminMessages();
  }

  // admin quick search
  if(adminSearch){
    adminSearch.addEventListener('input', ()=>{
      const q = adminSearch.value.trim().toLowerCase();
      const filtered = movies.filter(m => (m.title||'').toLowerCase().includes(q));
      if(document.getElementById('movieList')){
        const movieListEl = document.getElementById('movieList');
        movieListEl.innerHTML = '';
        filtered.forEach(m=>{
          const row = document.createElement('div'); row.className='movie-item';
          row.innerHTML = `<img class="movie-cover" src="${escapeHtml(m.cover||'https://via.placeholder.com/60x80?text=No+Image')}" alt="${escapeHtml(m.title||'')}"><span class="movie-title">${escapeHtml(m.title||'')}</span><div class="movie-actions"><button class="btn-edit" data-id="${m.id}"><i class="bi bi-pencil"></i> Edit</button><button class="btn-delete" data-id="${m.id}"><i class="bi bi-trash"></i> Delete</button></div>`;
          movieListEl.appendChild(row);
        });
      }
    });
  }

  // initial fetches
  fetchMovies();
  fetchMessages();
}); // DOMContentLoaded end
