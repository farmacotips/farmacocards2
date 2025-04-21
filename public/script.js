// Screen IDs
const SCREENS = {
  home: 'homeScreen',
  create: 'createScreen',
  manage: 'manageScreen',
  edit: 'editScreen',
  study: 'studyApp'
};
// Elements
const btnBack = document.getElementById('btnBack'),
      btnHome = document.getElementById('btnHome'),
      btnMazos = document.getElementById('btnMazos'),
      btnCreate = document.getElementById('btnCreate'),
      btnManage = document.getElementById('btnManage'),
      backFromCreate = document.getElementById('backFromCreate'),
      backFromEdit = document.getElementById('backFromEdit'),
      createForm = document.getElementById('createForm'),
      decksList = document.getElementById('decksList'),
      editDeckTitle = document.getElementById('editDeckTitle'),
      cardsPage = document.getElementById('cardsPage'),
      prevPage = document.getElementById('prevPage'),
      nextPage = document.getElementById('nextPage'),
      pageInfo = document.getElementById('pageInfo'),
      nextDueSpan = document.getElementById('nextDueCountdown'),
      // study elements
      studyApp = document.getElementById('studyApp'),
      circleText = document.getElementById('circleText'),
      progressCircle = document.getElementById('progressCircle'),
      pendingEl = document.getElementById('pendingCount'),
      reviewEl = document.getElementById('reviewCount'),
      totalEl = document.getElementById('totalCount'),
      progressFill = document.getElementById('progressFill'),
      flashcardEl = document.getElementById('flashcard'),
      questionEl = document.getElementById('question'),
      answerEl = document.getElementById('answer'),
      editCardBtn = document.getElementById('editCard'),
      diffButtons = document.querySelectorAll('.btn-diff');

// Navigation
function show(screen) {
  Object.values(SCREENS).forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById(screen).classList.remove('hidden');
  // Back arrow visibility
  if ([SCREENS.manage, SCREENS.edit, SCREENS.study].includes(screen)) {
    btnBack.classList.remove('hidden');
  } else {
    btnBack.classList.add('hidden');
  }
}
btnHome.onclick = () => show(SCREENS.home);
// start at home
show(SCREENS.home);

// Cargar mazos públicos al iniciar
fetch('/mazos-publicos')
  .then(res => res.json())
  .then(publicDecks => {
    const publicList = document.getElementById('publicDecksList');

    publicDecks.forEach(publicDeck => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.innerText = `[Público] ${publicDeck.name}`;
      const btnEstudiar = document.createElement('button');
      btnEstudiar.className = 'btn-study';
      btnEstudiar.innerText = 'Estudiar';
      btnEstudiar.onclick = () => loadStudy(publicDeck);
      li.append(span, btnEstudiar);
      publicList.appendChild(li);
    });
  });


btnMazos.onclick = () => { renderDecks(); show(SCREENS.manage); };
btnBack.onclick = () => show(prevScreen || SCREENS.home);
btnCreate.onclick = () => show(SCREENS.create);
backFromCreate.onclick = () => show(SCREENS.home);
btnManage.onclick = () => { renderDecks(); show(SCREENS.manage); };
backFromEdit.onclick = () => show(SCREENS.manage);

// Storage
function getDecks() { return JSON.parse(localStorage.getItem('farmacoDecks')||'[]'); }
function saveDecks(ds) { localStorage.setItem('farmacoDecks', JSON.stringify(ds)); }

// Create deck
createForm.onsubmit = async e => {
  e.preventDefault();
  const name = document.getElementById('deckName').value.trim();
  const file = e.target.csv.files[0];
  if (!name || !file) return alert('Nombre y CSV requeridos');
  const fd = new FormData(e.target);
  await fetch('/upload',{method:'POST',body:fd});
  const cards = await (await fetch('/cards')).json();

// Guardar el mazo en localStorage como copia
const decks = getDecks();
const newDeck = { name, cards };
decks.push(newDeck);
saveDecks(decks);

// También guardar en farmacoCards para que funcione el estudio sin perderlo
localStorage.setItem('farmacoCards', JSON.stringify(cards));
  alert('Mazo creado');
  show(SCREENS.home);
};

// Manage decks
function renderDecks() {
  decksList.innerHTML = '';
  getDecks().forEach((deck, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.innerText = deck.name;
    const btnE = document.createElement('button');
    btnE.className = 'btn-study'; btnE.innerText = 'Estudiar';
    btnE.onclick = () => loadStudy(deck);
    const btnEd = document.createElement('button');
    btnEd.className = 'btn-admin'; btnEd.innerText = 'Editar';
    btnEd.onclick = () => enterEdit(deck, i);
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-delete'; btnDel.innerText = 'Borrar';
    btnDel.onclick = () => {
      if (!confirm('Borrar mazo?')) return;
      const ds = getDecks(); ds.splice(i,1); saveDecks(ds); renderDecks();
    };
    li.append(span, btnE, btnEd, btnDel);
    decksList.appendChild(li);
  });
}

// Edit deck pagination
let currentDeckIndex=0, currentPage=0;
function enterEdit(deck,i) {
  currentDeckIndex=i; currentPage=0;
  editDeckTitle.innerText = `Editar mazo: ${deck.name}`;
  prevScreen = SCREENS.manage;
  show(SCREENS.edit);
  renderPage();
}
function renderPage() {
  const deck = getDecks()[currentDeckIndex], per=10;
  const start = currentPage*per;
  cardsPage.innerHTML = '';
  deck.cards.slice(start, start+per).forEach((c, idx) => {
    const div = document.createElement('div');
    div.className = 'edit-form';
    div.innerHTML = `
      <label>Pregunta:</label>
      <input id="q${idx}" type="text" value="${c.question}">
      <label>Respuesta:</label>
      <input id="a${idx}" type="text" value="${c.answer}">
      <button id="save${idx}" class="btn-admin">Guardar</button>
    `;
    cardsPage.appendChild(div);
    document.getElementById(`save${idx}`).onclick = () => {
      const qv = document.getElementById(`q${idx}`).value;
      const av = document.getElementById(`a${idx}`).value;
      deck.cards[start+idx].question = qv;
      deck.cards[start+idx].answer   = av;
      const ds = getDecks(); ds[currentDeckIndex] = deck; saveDecks(ds);
      alert('Guardado');
    };
  });
  const total = deck.cards.length, pages = Math.ceil(total/per);
  pageInfo.innerText = `Página ${currentPage+1}/${pages}`;
  prevPage.disabled = currentPage===0;
  nextPage.disabled = (currentPage+1)*per >= total;
}
prevPage.onclick = () => { if (currentPage>0) { currentPage--; renderPage(); } };
nextPage.onclick = () => {
  const deck = getDecks()[currentDeckIndex], per=10;
  if ((currentPage+1)*per < deck.cards.length) { currentPage++; renderPage(); }
};

// Study functionality
let cards = [], due = [];
const SM2_MIN_EF = 1.3;
const firstIntervals = {1:5*60000,2:15*60000,3:30*60000,4:8*3600000,5:24*3600000};
const qualityNames = {1:'Difícil',2:'Complicado',3:'Medio',4:'Fácil',5:'Dominado'};

function initSM2(c) {
  if (c.EF==null) c.EF = 2.5;
  if (c.reps==null) c.reps = 0;
  if (c.interval==null) c.interval = 1;
  if (c.dueDate==null) c.dueDate = Date.now();
}

function updateSM2(c, q) {
  if (c.reps===0) {
    c.dueDate = Date.now() + firstIntervals[q];
    c.reps = 1;
  } else {
    if (q<3) {
      c.reps = 0;
      c.interval = 1;
    } else {
      c.reps++;
      c.interval = (c.reps===2 ? 6 : Math.round(c.interval * c.EF));
    }
    c.EF = Math.max(SM2_MIN_EF, c.EF + (0.1 - (5-q)*(0.08+(5-q)*0.02)));
    c.dueDate = Date.now() + c.interval*86400000;
  }
}

function formatInterval(ms) {
  const m = Math.floor(ms/60000);
  if (m<60) return m+'m';
  const h = Math.floor(m/60);
  if (h<24) return h+'h';
  return Math.floor(h/24)+'d';
}

function saveCards() {
  localStorage.setItem('farmacoCards', JSON.stringify(cards));
}

function loadStored() {
  const s = localStorage.getItem('farmacoCards');
  return s ? JSON.parse(s) : [];
}

function filterDue() {
  const now = Date.now();
  due = cards.filter(c => c.dueDate <= now).sort((a,b)=>a.dueDate-b.dueDate);
}

function updateUI() {
  const pending = due.length;
  const total = cards.length;
  const review = total - pending;
  pendingEl.innerText = pending;
  reviewEl.innerText = review < 0 ? 0 : review;
  totalEl.innerText = total;
  circleText.textContent = pending;
  const pct = total ? ((total - pending)/total)*339.292 : 0;
  progressCircle.style.strokeDashoffset = 339.292 - pct;
  progressFill.style.width = total ? ((total-pending)/total)*100+'%' : '0%';
}

function updateButtons(c) {
  diffButtons.forEach(btn => {
    const q = +btn.dataset.score;
    let temp = {...c};
    initSM2(temp);
    updateSM2(temp, q);
    btn.innerText = qualityNames[q] + ' ' + formatInterval(temp.dueDate - Date.now());
  });
}

function showCard() {
  if (due.length===0) {
    questionEl.innerText = 'Se acabó';
    answerEl.innerText = '';
    return;
  }
  const c = due[0];
  questionEl.innerHTML = `
  <div class="card-label">PREGUNTA</div>
  <div class="card-text">${c.question}</div>
`;

answerEl.innerHTML = `
  <div class="card-label">RESPUESTA</div>
  <div class="card-text hidden-answer">${c.answer}</div>
`;

answerEl.classList.add('hidden');

  updateButtons(c);
  editCardBtn.classList.remove('hidden');
  editCardBtn.onclick = () => {
    const nq = prompt('Editar pregunta', c.question);
    const na = prompt('Editar respuesta', c.answer);
    if (nq!=null) c.question = nq;
    if (na!=null) c.answer = na;
    saveCards();
    updateUI();
    showCard();
  };
}

flashcardEl.addEventListener('click', () => {
  const ansText = answerEl.querySelector('.card-text');
  if (ansText) ansText.classList.toggle('hidden-answer');
});



diffButtons.forEach(btn => {
  btn.onclick = () => {
    if (!due.length) return;
    const q = +btn.dataset.score;
    const c = due.shift();
    updateSM2(c, q);
    saveCards();
    filterDue();
    updateUI();
    showCard();
  };
});

function loadStudy(deck) {
  cards = deck.cards;
  cards.forEach(initSM2);
  saveCards();
  filterDue();
  updateUI();
  showCard();
  prevScreen = SCREENS.manage;
  show(SCREENS.study);
}

// Countdown
setInterval(() => {
  const now = Date.now();
  let next = Infinity;
  cards.forEach(c => { if(c.dueDate>now && c.dueDate<next) next=c.dueDate; });
  if (!next || next===Infinity) nextDueSpan.innerText = '0';
  else {
    const diff=next-now, d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000),
          m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
    nextDueSpan.innerText = `${d}d ${h}h ${m}m ${s}s`;
  }
},1000);

// start at home
show(SCREENS.home);
