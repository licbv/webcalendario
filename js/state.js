const $ = s => document.querySelector(s);
const e = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// NÓMINA COMPLETA POR DEFECTO (Para garantizar que nunca quede en blanco)
const INITIAL_DATA = {
  config: { lastAdminLogin: null, year: 2026 },
  grupos: ["Migracion", "Triagem", "2daLinea", "0800 TECO", "Chat Provision"],
  conceptos: [
    { id: "VAC", nombre: "Vacaciones", color: "#CFEFFF", textColor: "#00577A" },
    { id: "GUA", nombre: "Guardia", color: "#FFE9A8", textColor: "#8A4B00" },
    { id: "HEX", nombre: "Horas Extras", color: "#D1F4E0", textColor: "#0F6235" },
    { id: "FRA", nombre: "Franco", color: "#E8D5FF", textColor: "#5B21B6" },
    { id: "SUS", nombre: "Licencia / Suspensión", color: "#FFC9CB", textColor: "#B3171C" }
  ],
  usuarios: [
    { u: "KRUKI", p: "adMIN", r: "admin", nombre: "Iván Javier Kruk Losada", email: "ivan.kruk@tmoviles.com.ar", grupo: "Administración" },
    { u: "berraondon", p: "berraondon", r: "user", nombre: "Berraondo, Nestor Fabian", grupo: "Migracion", email: "nestor.berraondo@tmoviles.com.ar" },
    { u: "gramajod", p: "gramajod", r: "user", nombre: "Gramajo, Domingo", grupo: "Migracion", email: "domingo.gramajo@tmoviles.com.ar" },
    { u: "tettamantia", p: "tettamantia", r: "user", nombre: "Tettamanti, Alberto Oscar", grupo: "Triagem", email: "alberto.tettamanti@tmoviles.com.ar" },
    { u: "lojom", p: "lojom", r: "user", nombre: "Lojo, Marcelo", grupo: "Migracion", email: "marcelo.lojo@tmoviles.com.ar" },
    { u: "gadeaca", p: "gadeaca", r: "user", nombre: "Gadea, Carlos Miguel", grupo: "Migracion", email: "carlos.gadeag2@tmoviles.com.ar" },
    { u: "samaniegoc", p: "samaniegoc", r: "user", nombre: "Samaniego, Claudio Gabriel", grupo: "Migracion", email: "claudio.samaniego@tmoviles.com.ar" },
    { u: "percivatie", p: "percivatie", r: "user", nombre: "Percivati, Franco Esteban Carlos", grupo: "Triagem", email: "esteban.percivati@tmoviles.com.ar" },
    { u: "galvans", p: "galvans", r: "user", nombre: "Galvan, Sergio Gustavo", grupo: "Migracion", email: "segio.galvan@tmoviles.com.ar" },
    { u: "gimenezga", p: "gimenezga", r: "user", nombre: "Gimenez, Gabriel Leonardo", grupo: "2daLinea", email: "gabriel.gimenez@tmoviles.com.ar" },
    { u: "laize", p: "laize", r: "user", nombre: "Laiz, Emiliano", grupo: "Migracion", email: "emiliano.laiz@tmoviles.com.ar" },
    { u: "delgadosil", p: "delgadosil", r: "user", nombre: "Delgado, Silvana Edith", grupo: "2daLinea", email: "silvana.delgado@tmoviles.com.ar" },
    { u: "zamoranod", p: "zamoranod", r: "user", nombre: "Zamorano, Daniela", grupo: "Triagem", email: "daniela.zamorano@tmoviles.com.ar" },
    { u: "torellal", p: "torellal", r: "user", nombre: "Torella, Laura Beatriz", grupo: "2daLinea", email: "laura.torella@tmoviles.com.ar" },
    { u: "carrizof", p: "carrizof", r: "user", nombre: "Carrizo, Franco", "grupo": "2daLinea", email: "franco.carrizo@tmoviles.com.ar" },
    { u: "balderramae", p: "balderramae", r: "user", nombre: "Balderrama, Elias Miguel", grupo: "0800 TECO", email: "eliasm.balderrama@tmoviles.com.ar" },
    { u: "sostop", p: "sostop", r: "user", nombre: "Sosto, Patricia", grupo: "Chat Provision", email: "patricia.sosto@tmoviles.com.ar" },
    { u: "navarroan", "p": "navarroan", r: "user", nombre: "Navarro, Antonio Luis", grupo: "0800 TECO", email: "antonio.navarrro@tmoviles.com.ar" },
    { u: "sansebastiano", p: "sansebastiano", r: "user", nombre: "San Sebastian, Oscar Abel", grupo: "Chat Provision", email: "oscar.san@tmoviles.com.ar" }
  ],
  registros: [],
  horarios: {
    "berraondon": { entrada: "07:00", hsDiarias: 8 },
    "gramajod": { entrada: "07:00", hsDiarias: 8 },
    "tettamantia": { entrada: "06:30", hsDiarias: 8 },
    "lojom": { entrada: "07:00", hsDiarias: 8 },
    "gadeaca": { entrada: "07:00", hsDiarias: 8 },
    "samaniegoc": { entrada: "07:00", hsDiarias: 8 },
    "percivatie": { entrada: "06:30", hsDiarias: 8 },
    "galvans": { entrada: "07:00", hsDiarias: 8 },
    "gimenezga": { entrada: "06:30", hsDiarias: 8 },
    "laize": { entrada: "07:00", hsDiarias: 8 },
    "delgadosil": { entrada: "06:30", hsDiarias: 8 },
    "zamoranod": { entrada: "06:30", hsDiarias: 8 },
    "torellal": { entrada: "06:30", hsDiarias: 8 },
    "carrizof": { entrada: "06:30", hsDiarias: 8 },
    "balderramae": { entrada: "07:00", hsDiarias: 8 },
    "sostop": { entrada: "07:00", hsDiarias: 8 },
    "navarroan": { entrada: "07:00", hsDiarias: 8 },
    "sansebastiano": { entrada: "07:00", hsDiarias: 8 }
  },
  logs: []
};

let S = JSON.parse(JSON.stringify(INITIAL_DATA));

let V = 'm';
let DIST_FILTER = 'ALL';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentUser = null;
let hasUnsavedChanges = false;

function setMonthYear(ymStr) {
  if (!ymStr) return;
  const parts = ymStr.split('-');
  currentYear = parseInt(parts[0]);
  currentMonth = parseInt(parts[1]);
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function markUnsaved() {
  hasUnsavedChanges = true;
  const btn = $('#btn-save');
  if (btn) btn.classList.add('unsaved');
}

function logAction(act) {
  if (!Array.isArray(S.logs)) S.logs = [];
  S.logs.unshift({
    u: currentUser ? currentUser.u : 'Sistema',
    a: act,
    t: new Date().toISOString()
  });
}

function calcularHoraSalida(horaEntrada, hsDiarias) {
  if (!horaEntrada || !hsDiarias) return '--:--';
  const parts = horaEntrada.split(':');
  let h = parseInt(parts[0]);
  let m = parseInt(parts[1]);
  h = (h + parseInt(hsDiarias)) % 24;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
