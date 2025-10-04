// Sentient Mini Dashboard JS
// State & helpers
const state = {
  mode: localStorage.getItem('mode') || 'manual',
  tweets: JSON.parse(localStorage.getItem('tweets') || '[]'),
  galxe: JSON.parse(localStorage.getItem('galxe') || '[]'),
  community: JSON.parse(localStorage.getItem('community') || '[]'),
  views: { tweets: 'carousel', community: 'carousel' },
  edit: { tweet: null, galxe: null, community: null }
};

// Configurable backend URL for API mode (set via localStorage.setItem('backendUrl', 'http://host:port'))
const BACKEND_URL = localStorage.getItem('backendUrl') || 'http://localhost:5174';

const el = id => document.getElementById(id);
const save = () => {
  localStorage.setItem('mode', state.mode);
  localStorage.setItem('tweets', JSON.stringify(state.tweets));
  localStorage.setItem('galxe', JSON.stringify(state.galxe));
  localStorage.setItem('community', JSON.stringify(state.community));
};

function dataUrlFromFile(file){
  return new Promise((res, rej) => {
    if(!file) return res(null);
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  // Theme init
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  // Mode toggle
  const modeToggle = el('modeToggle');
  modeToggle.checked = state.mode === 'api';
  el('modeLabel').textContent = 'API Mode / Manual Mode';
  applyModeUI();

  modeToggle.addEventListener('change', () => {
    state.mode = modeToggle.checked ? 'api' : 'manual';
    save();
    applyModeUI();
  });

  // Theme toggle
  el('themeToggle').addEventListener('click', () => {
    const newTheme = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });

  // Export & Share
  el('exportBtn').addEventListener('click', () => window.print());
  el('shareBtn').addEventListener('click', async () => {
    const url = window.location.href;
    try{
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard');
    }catch{
      prompt('Copy this link:', url);
    }
  });

  // Tweets view switching
  el('tweetViewCarousel').addEventListener('click', () => { state.views.tweets = 'carousel'; renderTweets(); });
  el('tweetViewGrid').addEventListener('click', () => { state.views.tweets = 'grid'; renderTweets(); });
  // Community view switching
  el('communityViewCarousel').addEventListener('click', () => { state.views.community = 'carousel'; renderCommunity(); });
  el('communityViewGrid').addEventListener('click', () => { state.views.community = 'grid'; renderCommunity(); });

  // Forms
  wireTweetForms();
  wireGalxeForm();
  wireCommunityForm();

  // Render initial
  renderTweets();
  renderGalxe();
  renderCommunity();
  renderTweetChart();
});

function applyModeUI(){
  const isApi = state.mode === 'api';
  // Twitter controls
  document.querySelector('#tweetForm').classList.toggle('hidden', isApi);
  document.querySelector('#tweetApiForm').classList.toggle('hidden', !isApi);
}

// Tweets
function wireTweetForms(){
  // Manual add
  el('tweetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = el('tweetDesc').value.trim();
    const date = el('tweetDate').value;
    const likes = Number(el('tweetLikes').value || 0);
    const retweets = Number(el('tweetRetweets').value || 0);
    const replies = Number(el('tweetReplies').value || 0);
    const imgFile = el('tweetImage').files[0];
    const image = await dataUrlFromFile(imgFile);
    if(state.edit.tweet !== null){
      const i = state.edit.tweet;
      const prev = state.tweets[i] || {};
      state.tweets[i] = { type:'manual', desc, date, likes, retweets, replies, image: image || prev.image };
      clearTweetEdit();
    } else {
      state.tweets.unshift({ type:'manual', desc, date, likes, retweets, replies, image });
    }
    save();
    e.target.reset();
    el('tweetSubmitBtn').textContent = 'Add';
    el('tweetCancelEdit').classList.add('hidden');
    renderTweets();
  });

  // API fetch
  el('tweetApiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el('tweetUsername').value.trim();
    let count = parseInt(el('tweetCount').value || '5', 10);
    count = Math.max(1, Math.min(10, count));
    if(!username){ alert('Enter a username'); return; }

    try{
      const url = `${BACKEND_URL}/api/twitter?username=${encodeURIComponent(username)}&count=${count}`;
      const res = await fetch(url);
      if(!res.ok){ throw new Error('API request failed'); }
      const json = await res.json();
      // Map into display shape
      state.tweets = json.tweets.map(t => ({
        type:'api',
        id: t.id,
        desc: t.text,
        date: t.created_at?.slice(0,10) || '',
        likes: t.public_metrics?.like_count || 0,
        retweets: t.public_metrics?.retweet_count || 0,
        replies: t.public_metrics?.reply_count || 0,
        image: null
      }));
      save();
      renderTweets();
    }catch(err){
      console.error(err);
      alert('Failed to fetch tweets. Is the backend running, BACKEND_URL correct, and API key set?');
    }
  });
}

function renderTweets(){
  const inCarousel = state.views.tweets === 'carousel';
  const container = el('tweetsContainer');
  const carousel = el('tweetsCarousel');
  container.classList.toggle('hidden', inCarousel);
  carousel.classList.toggle('hidden', !inCarousel);

  if(inCarousel){
    const track = el('tweetsTrack');
    track.innerHTML = '';
    state.tweets.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'carousel-item';
      item.innerHTML = tweetCardHTML(t, i);
      track.appendChild(item);
    });
    setupCarousel('tweets');
  } else {
    container.innerHTML = state.tweets.map((t, i) => tweetCardHTML(t, i)).join('');
  }

  // Bind actions (only for manual tweets)
  document.querySelectorAll('[data-action="tweet-edit"]').forEach(btn => {
    btn.addEventListener('click', () => setTweetEdit(parseInt(btn.dataset.index,10)));
  });
  document.querySelectorAll('[data-action="tweet-delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteTweet(parseInt(btn.dataset.index,10)));
  });

  // Update chart after render
  renderTweetChart();
  bindLightbox();
}

function tweetCardHTML(t, index){
  const stats = `<div class="stats"><span>❤ ${t.likes||0}</span><span>↻ ${t.retweets||0}</span><span>💬 ${t.replies||0}</span>${t.date?`<span>• ${t.date}</span>`:''}</div>`;
  const actions = (t.type === 'manual') ? `
    <div class="actions">
      <button class="btn ghost small" data-action="tweet-edit" data-index="${index}">Edit</button>
      <button class="btn danger small" data-action="tweet-delete" data-index="${index}">Delete</button>
    </div>` : '';
  const img = t.image ? `<div class="image-wrap"><img class="proof-img" src="${t.image}" alt="proof"/></div>` : '';
  return `
    <div class="proof-card">
      <div class="description"><p>${escapeHtml(t.desc||'')}</p></div>
      ${stats}
      ${actions}
      ${img}
    </div>`;
}

// Galxe
function wireGalxeForm(){
  el('galxeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = el('galxeName').value.trim();
    const date = el('galxeDate').value;
    const percent = Math.max(0, Math.min(100, parseInt(el('galxePercent').value||'0',10)));
    const badgeFile = el('galxeBadge').files[0];
    const badge = await dataUrlFromFile(badgeFile);

    if(state.edit.galxe !== null){
      const i = state.edit.galxe;
      const prev = state.galxe[i] || {};
      state.galxe[i] = { name, date, percent, badge: badge || prev.badge };
      clearGalxeEdit();
    } else {
      state.galxe.unshift({ name, date, percent, badge });
    }
    save();
    e.target.reset();
    el('galxeSubmitBtn').textContent = 'Add/Update';
    el('galxeCancelEdit').classList.add('hidden');
    renderGalxe();
  });
}

function renderGalxe(){
  const list = el('galxeList');
  list.innerHTML = state.galxe.map((q, i) => {
    const complete = q.percent === 100;
    const stats = `<div class="stats"><span>${q.percent}%</span>${q.date?`<span>• ${q.date}</span>`:''}</div>`;
    const completed = complete ? '<div class="badge" style="margin-top:8px">✨ Completed</div>' : '';
    const img = q.badge ? `<div class="image-wrap"><img class="proof-img" src="${q.badge}" alt="badge"/></div>` : '';
    return `
      <div class="proof-card">
        <div class="description"><h3>${escapeHtml(q.name)}</h3></div>
        <div class="progress ${complete?'complete':''}"><div class="bar" style="width:${q.percent}%"></div></div>
        ${stats}
        ${completed}
        <div class="actions">
          <button class="btn ghost small" data-action="galxe-edit" data-index="${i}">Edit</button>
          <button class="btn danger small" data-action="galxe-delete" data-index="${i}">Delete</button>
        </div>
        ${img}
      </div>`;
  }).join('');

  document.querySelectorAll('[data-action="galxe-edit"]').forEach(btn => {
    btn.addEventListener('click', () => setGalxeEdit(parseInt(btn.dataset.index,10)));
  });
  document.querySelectorAll('[data-action="galxe-delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteGalxe(parseInt(btn.dataset.index,10)));
  });
  bindLightbox();
}

// Community
function wireCommunityForm(){
  el('communityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = el('communityDesc').value.trim();
    const top = el('communityTop').checked;
    const roleBadge = el('communityBadge').value || '';
    const imgFile = el('communityImage').files[0];
    const image = await dataUrlFromFile(imgFile);
    if(state.edit.community !== null){
      const i = state.edit.community;
      const prev = state.community[i] || {};
      state.community[i] = { desc, top, roleBadge, image: image || prev.image };
      clearCommunityEdit();
    } else {
      state.community.push({ desc, top, roleBadge, image });
    }
    save();
    e.target.reset();
    el('communitySubmitBtn').textContent = 'Add';
    el('communityCancelEdit').classList.add('hidden');
    renderCommunity();
  });
}

function renderCommunity(){
  const inCarousel = state.views.community === 'carousel';
  const carousel = el('communityCarousel');
  const grid = el('communityGrid');
  carousel.classList.toggle('hidden', !inCarousel);
  grid.classList.toggle('hidden', inCarousel);

  if(inCarousel){
    const track = el('communityTrack');
    track.innerHTML = '';
    state.community.forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'carousel-item';
      item.innerHTML = communityCardHTML(c, i);
      track.appendChild(item);
    });
    setupCarousel('community');
  } else {
    grid.innerHTML = state.community.map((c, i) => communityCardHTML(c, i)).join('');
  }

  document.querySelectorAll('[data-action="community-edit"]').forEach(btn => {
    btn.addEventListener('click', () => setCommunityEdit(parseInt(btn.dataset.index,10)));
  });
  document.querySelectorAll('[data-action="community-delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteCommunity(parseInt(btn.dataset.index,10)));
  });
}

function communityCardHTML(c, i){
  const badges = [c.top ? '🏆 Top Contributor' : null, c.roleBadge ? c.roleBadge : null].filter(Boolean);
  const stats = badges.length ? `<div class="stats">${badges.map(b=>`<span>${escapeHtml(b)}</span>`).join('')}</div>` : '';
  const img = c.image ? `<div class="image-wrap"><img class="proof-img" src="${c.image}" alt="community"/></div>` : '';
  return `
    <div class="proof-card">
      <div class="description"><p>${escapeHtml(c.desc||'')}</p></div>
      ${stats}
      <div class="actions">
        <button class="btn ghost small" data-action="community-edit" data-index="${i}">Edit</button>
        <button class="btn danger small" data-action="community-delete" data-index="${i}">Delete</button>
      </div>
      ${img}
    </div>`;
}

// Carousel utilities
const carousels = {};
function setupCarousel(key){
  const track = el(key === 'tweets' ? 'tweetsTrack' : 'communityTrack');
  const prev = document.querySelector(`.carousel-btn.prev[data-target="${key}"]`);
  const next = document.querySelector(`.carousel-btn.next[data-target="${key}"]`);
  const stateObj = carousels[key] || { index:0 };

  function update(){
    const total = track.children.length;
    if(total===0) return;
    stateObj.index = Math.max(0, Math.min(stateObj.index, total-1));
    track.style.transform = `translateX(-${stateObj.index*100}%)`;
  }

  prev.onclick = () => { stateObj.index--; update(); };
  next.onclick = () => { stateObj.index++; update(); };
  carousels[key] = stateObj;
  update();
}

// Utils
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

// Bind click-to-expand on any .proof-img
function bindLightbox(){
  const lb = el('lightbox');
  const lbImg = el('lightboxImg');
  const lbClose = el('lightboxClose');
  document.querySelectorAll('.proof-img').forEach(img => {
    if(img.dataset.lbBound === '1') return;
    img.dataset.lbBound = '1';
    img.addEventListener('click', () => {
      if(lb && lbImg){ lbImg.src = img.src; lb.classList.add('open'); }
    });
  });
  if(lb && !lb.dataset.bound){
    lb.dataset.bound = '1';
    lb.addEventListener('click', (e) => { if(e.target === lb) lb.classList.remove('open'); });
  }
  if(lbClose && !lbClose.dataset.bound){
    lbClose.dataset.bound = '1';
    lbClose.onclick = () => lb.classList.remove('open');
  }
}

function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = el('themeToggle');
  if(btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}

// Charts
let tweetChart;
function renderTweetChart(){
  const ctx = el('tweetChart');
  if(!ctx || typeof Chart === 'undefined') return;
  const labels = state.tweets.map((t, i) => t.date || `#${state.tweets.length - i}`);
  const likes = state.tweets.map(t => Number(t.likes||0));
  const retweets = state.tweets.map(t => Number(t.retweets||0));
  const data = {
    labels,
    datasets:[
      { label:'Likes', data: likes, borderColor:'#6c5ce7', backgroundColor:'rgba(108,92,231,0.2)', tension:0.3 },
      { label:'Retweets', data: retweets, borderColor:'#00d4ff', backgroundColor:'rgba(0,212,255,0.2)', tension:0.3 }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins:{ legend:{ labels:{ color: getComputedStyle(document.documentElement).getPropertyValue('--text') } } },
    scales:{
      x:{ ticks:{ color: getComputedStyle(document.documentElement).getPropertyValue('--muted') }, grid:{ display:false } },
      y:{ ticks:{ color: getComputedStyle(document.documentElement).getPropertyValue('--muted') }, grid:{ color:'rgba(255,255,255,0.08)' } }
    }
  };
  if(tweetChart){ tweetChart.destroy(); }
  tweetChart = new Chart(ctx, { type:'line', data, options });
}

// Edit/Delete helpers — Tweets
function setTweetEdit(index){
  const t = state.tweets[index];
  if(!t || t.type !== 'manual') return;
  state.edit.tweet = index;
  el('tweetDesc').value = t.desc || '';
  el('tweetDate').value = t.date || '';
  el('tweetLikes').value = t.likes || 0;
  el('tweetRetweets').value = t.retweets || 0;
  el('tweetReplies').value = t.replies || 0;
  el('tweetSubmitBtn').textContent = 'Save';
  el('tweetCancelEdit').classList.remove('hidden');
}
function clearTweetEdit(){
  state.edit.tweet = null;
  el('tweetForm').reset();
  el('tweetSubmitBtn').textContent = 'Add';
  el('tweetCancelEdit').classList.add('hidden');
}
el('tweetCancelEdit').addEventListener('click', clearTweetEdit);
function deleteTweet(index){
  const t = state.tweets[index];
  if(!t || t.type !== 'manual') return;
  if(!confirm('Delete this tweet card?')) return;
  state.tweets.splice(index,1);
  save();
  renderTweets();
}

// Edit/Delete helpers — Galxe
function setGalxeEdit(index){
  const q = state.galxe[index];
  if(!q) return;
  state.edit.galxe = index;
  el('galxeName').value = q.name || '';
  el('galxeDate').value = q.date || '';
  el('galxePercent').value = q.percent || 0;
  el('galxeSubmitBtn').textContent = 'Save';
  el('galxeCancelEdit').classList.remove('hidden');
}
function clearGalxeEdit(){
  state.edit.galxe = null;
  el('galxeForm').reset();
  el('galxeSubmitBtn').textContent = 'Add/Update';
  el('galxeCancelEdit').classList.add('hidden');
}
el('galxeCancelEdit').addEventListener('click', clearGalxeEdit);
function deleteGalxe(index){
  if(!confirm('Delete this quest?')) return;
  state.galxe.splice(index,1);
  save();
  renderGalxe();
}

// Edit/Delete helpers — Community
function setCommunityEdit(index){
  const c = state.community[index];
  if(!c) return;
  state.edit.community = index;
  el('communityDesc').value = c.desc || '';
  el('communityTop').checked = !!c.top;
  el('communityImage').required = false; // allow saving without new image
  el('communitySubmitBtn').textContent = 'Save';
  el('communityCancelEdit').classList.remove('hidden');
}
function clearCommunityEdit(){
  state.edit.community = null;
  el('communityForm').reset();
  el('communityImage').required = true;
  el('communitySubmitBtn').textContent = 'Add';
  el('communityCancelEdit').classList.add('hidden');
}
el('communityCancelEdit').addEventListener('click', clearCommunityEdit);
function deleteCommunity(index){
  if(!confirm('Delete this community highlight?')) return;
  state.community.splice(index,1);
  save();
  renderCommunity();
}
