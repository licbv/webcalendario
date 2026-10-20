const $ = s => document.querySelector(s);
const e = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let S = {
  config: { lastAdminLogin: null },
  grupos: ["Migracion", "Triagem", "2daLinea", "0800 TECO", "Chat Provision"],
  conceptos: JSON.parse(JSON.stringify(CONCEPTOS_INICIALES)),
  usuarios: [
    { u: "KRUKI", p: "adMIN", r: "admin", nombre: "Iván Javier Kruk Losada", email: "ivan.kruk@tmoviles.com.ar" }
  ],
  registros: [], // Lista de eventos: { u: "BERRAONDON", fecha: "2026-10-20", concepto: "HEX", horas: 4, motivo: "Migración" }
  horarios: {},  // Configuración de horarios: { u_red: { entrada: "07:00", hsDiarias: 8 } }
  logs: []
};

let V = 'm'; // Vista actual: 'm' (matriz), 'p' (perfil), 'g' (grupos/conceptos), 'u' (usuarios), 'l' (logs)
let DIST_FILTER = 'ALL';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1 a 12
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
  const d = new Date();
  const timestamp = d.toISOString();
  S.logs.unshift({
    u: currentUser ? currentUser.u : 'Sistema',
    a: act,
    t: timestamp
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