const lang = {
  es: {
    welcome: 'Introduce tu idea de marca',
    start: 'Comenzar',
    progress: fase => `Fase ${fase} de 7`,
    modeAuto: 'Modo automático',
    modeEdit: 'Modo editable',
    regenerate: 'Regenerar',
    download: 'Descargar informe',
    dark: 'Modo oscuro',
    light: 'Modo claro',
  },
  en: {
    welcome: 'Enter your brand idea',
    start: 'Start',
    progress: phase => `Step ${phase} of 7`,
    modeAuto: 'Auto mode',
    modeEdit: 'Editable mode',
    regenerate: 'Regenerate',
    download: 'Download report',
    dark: 'Dark mode',
    light: 'Light mode',
  }
};
// database: persist selected language
let currentLang = localStorage.getItem('lang') || 'es';
// database: persist project in localStorage
let data = JSON.parse(localStorage.getItem('project')) || {phase:0, answers:{}};
const app = document.getElementById('app');

// database: open indexedDB to persist projects
let db;
const request = indexedDB.open('rebranding', 1);
request.onupgradeneeded = event => {
  db = event.target.result;
  db.createObjectStore('projects', {keyPath: 'id'});
};
request.onsuccess = event => {
  db = event.target.result;
  const tx = db.transaction('projects');
  const store = tx.objectStore('projects');
  const getReq = store.get('current');
  getReq.onsuccess = () => {
    if(getReq.result){
      data = getReq.result.data;
      render();
    }
  };
};

function t(key, ...args){
  const val = lang[currentLang][key];
  return typeof val === 'function' ? val(...args) : val;
}

function save(){
  // database: save to localStorage
  localStorage.setItem('project', JSON.stringify(data));
  if(db){
    // database: also save to indexedDB
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    store.put({id: 'current', data});
  }
}

function toggleLang(){
  currentLang = currentLang==='es' ? 'en' : 'es';
  localStorage.setItem('lang', currentLang);
  render();
}

function toggleDark(){
  document.documentElement.classList.toggle('dark');
}

function start(){
  data.phase = 1;
  save();
  render();
}

const phases = [
  { title:'Auditoría de marca', questions:[{id:'perc', type:'radio', label:'Percepción actual', options:['Positiva','Neutral','Negativa']} ] },
  { title:'Estrategia de marca', questions:[{id:'val', type:'checkbox', label:'Valores', options:['Innovación','Tradición','Sostenibilidad']} ] },
  { title:'Naming', questions:[{id:'nameStyle', type:'radio', label:'Estilo de nombre', options:['Abstracto','Descriptivo','Acrónimo']}] },
  { title:'Identidad visual', questions:[{id:'color', type:'dropdown', label:'Paleta de colores', options:['Vibrante','Neutro','Pastel']}] },
  { title:'Aplicaciones de marca', questions:[{id:'aplic', type:'checkbox', label:'Piezas requeridas', options:['Papelería','Web','Redes sociales']}] },
  { title:'Plan de lanzamiento', questions:[{id:'camp', type:'radio', label:'Tipo de campaña', options:['Digital','Eventos','Mixta']}] },
  { title:'Implementación y seguimiento', questions:[{id:'monit', type:'radio', label:'Monitoreo', options:['Mensual','Trimestral','Anual']}] }
];

function questionHTML(q){
  const saved = data.answers[q.id] || [];
  let html = '';
  if(q.type==='radio'){
    html += q.options.map(o=>`<label class='block'><input type='radio' name='${q.id}' value='${o}' ${saved.includes(o)?'checked':''}> ${o}</label>`).join('');
  }else if(q.type==='checkbox'){
    html += q.options.map(o=>`<label class='block'><input type='checkbox' name='${q.id}' value='${o}' ${saved.includes(o)?'checked':''}> ${o}</label>`).join('');
  }else if(q.type==='dropdown'){
    html += `<select name='${q.id}' class='w-full border p-2'>`+ q.options.map(o=>`<option ${saved.includes(o)?'selected':''}>${o}</option>`).join('') + `</select>`;
  }
  return `<div class='mb-4'><p class='font-semibold'>${q.label}</p>${html}</div>`;
}

function render(){
  if(data.phase===0){
    app.innerHTML = `
      <div class='space-y-4'>
        <textarea id='idea' class='w-full border p-2' placeholder='${t('welcome')}'></textarea>
        <button class='bg-blue-500 text-white px-4 py-2' onclick='start()'>${t('start')}</button>
        <button class='ml-2 underline' onclick='toggleLang()'>${currentLang==='es'?'English':'Español'}</button>
        <button class='ml-2 underline' onclick='toggleDark()'>${t('dark')}</button>
      </div>`;
  }else if(data.phase<=7){
    const phase = phases[data.phase-1];
    const questions = phase.questions.map(q=>questionHTML(q)).join('');
    app.innerHTML = `
      <div>
        <div class='flex justify-between items-center'>
          <h2 class='text-xl font-bold'>${phase.title}</h2>
          <span>${t('progress', data.phase)}</span>
        </div>
        <form id='wizardForm' class='my-4'>${questions}</form>
        <div class='flex justify-between'>
          ${data.phase>1?`<button onclick='prev()' class='px-4 py-2 bg-gray-300'>◀</button>`:''}
          ${data.phase<7?`<button onclick='next()' class='px-4 py-2 bg-blue-500 text-white'>▶</button>`:`<button onclick='finish()' class='px-4 py-2 bg-green-500 text-white'>${t('download')}</button>`}
        </div>
        <button class='underline mt-4' onclick='toggleLang()'>${currentLang==='es'?'English':'Español'}</button>
        <button class='underline ml-2' onclick='toggleDark()'>${t('dark')}</button>
      </div>`;
  }else{
    renderReport();
  }
}

function prev(){
  saveAnswers();
  data.phase--; save(); render();
}
function next(){
  saveAnswers();
  data.phase++; save(); render();
}
function saveAnswers(){
  const form = document.getElementById('wizardForm');
  if(!form) return;
  const formData = new FormData(form);
  phases[data.phase-1].questions.forEach(q=>{
    if(q.type==='checkbox'){
      data.answers[q.id] = formData.getAll(q.id);
    }else{
      data.answers[q.id] = [formData.get(q.id)];
    }
  });
}

function finish(){
  saveAnswers();
  data.phase = 8; save();
  render();
}

function renderReport(){
  let html = `<h1>Informe</h1>`;
  phases.forEach((p,i)=>{
    html += `<h2>${p.title}</h2><ul>`;
    p.questions.forEach(q=>{
      html += `<li><strong>${q.label}:</strong> ${(data.answers[q.id]||[]).join(', ')}</li>`;
    });
    html += `</ul>`;
  });
  const report = `<!DOCTYPE html><html lang="${currentLang}"><head><meta charset='UTF-8'><title>Informe</title></head><body>${html}</body></html>`;
  const blob = new Blob([report], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  app.innerHTML = `<a href='${url}' download='informe.html' class='bg-green-500 text-white px-4 py-2'>${t('download')}</a>`;
}

render();
