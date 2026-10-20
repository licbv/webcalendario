function setSyncStatus(state, msg) {
  const dot = $('#sync-dot'), txt = $('#sync-text');
  if (!dot || !txt) return;
  dot.className = 'sync-dot ' + (state === 'busy' ? 'busy' : state === 'err' ? 'err' : '');
  txt.textContent = msg;
}

async function loadData() {
  setSyncStatus('busy', 'Conectando...');
  try {
    const res = await fetch(API_URL + '/latest', {
      method: 'GET',
      headers: {
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data && typeof data === 'object') S = data;

    // Estructuras de resguardo por si el bin está inicializado parcialmente
    if (!S.usuarios || !Array.isArray(S.usuarios) || S.usuarios.length === 0) {
      S.usuarios = [
        { u: "KRUKI", p: "adMIN", r: "admin", nombre: "Iván Javier Kruk Losada", email: "ivan.kruk@tmoviles.com.ar", grupo: "Administración" }
      ];
    }
    if (!S.conceptos || !Array.isArray(S.conceptos)) S.conceptos = JSON.parse(JSON.stringify(CONCEPTOS_INICIALES));
    if (!S.registros || !Array.isArray(S.registros)) S.registros = [];
    if (!S.horarios) S.horarios = {};
    if (!S.grupos || !Array.isArray(S.grupos)) S.grupos = ["Migracion", "Triagem", "2daLinea", "0800 TECO", "Chat Provision"];
    if (!S.logs || !Array.isArray(S.logs)) S.logs = [];

    hasUnsavedChanges = false;
    setSyncStatus('ok', 'Sincronizado');
  } catch(err) {
    console.error('❌ Error al cargar datos de JSONBin:', err);
    setSyncStatus('err', 'Error de red');
  }

  if (currentUser) render();
}

async function saveData() {
  setSyncStatus('busy', 'Guardando...');
  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      },
      body: JSON.stringify(S)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    hasUnsavedChanges = false;
    const btn = $('#btn-save');
    if (btn) btn.classList.remove('unsaved');

    setSyncStatus('ok', 'Guardado en Nube');
    setTimeout(() => setSyncStatus('ok', 'Sincronizado'), 2000);
  } catch(err) {
    console.error('❌ Error al guardar:', err);
    setSyncStatus('err', 'Error al guardar');
    alert(`❌ Error al guardar datos en la nube:\n${err.message}`);
  }
}

function doLogin(evt) {
  evt.preventDefault();
  const uInput = $('#l-user').value.trim().toLowerCase();
  const pInput = $('#l-pass').value.trim();

  if (!S.usuarios || S.usuarios.length === 0) {
    alert("Cargando datos del servidor... Aguardá un instante e intentá de nuevo.");
    return;
  }

  const found = S.usuarios.find(x => String(x.u).toLowerCase() === uInput);

  if (found && String(found.p) === pInput) {
    currentUser = found;
    $('#l-err').style.display = 'none';
    showApp();
    if (currentUser.u.toUpperCase() === 'KRUKI') checkAdminSummaryOnLogin();
  } else {
    $('#l-err').style.display = 'block';
  }
}

function showApp() {
  $('#login-screen').style.display = 'none';
  $('#sb').style.display = 'flex';
  $('#main-header').style.display = 'flex';
  $('#app').style.display = 'block';

  document.querySelectorAll('.adm-section').forEach(el => {
    el.style.display = currentUser.r === 'admin' ? 'block' : 'none';
  });

  $('#sb-user').textContent = currentUser.nombre || currentUser.u;
  $('#sb-role').textContent = currentUser.r === 'admin' ? 'Superadministrador' : 'Operador';

  const selG = $('#sel-grupo');
  if (selG) {
    selG.innerHTML = `<option value="ALL">🌐 Todos los Grupos</option>` + (S.grupos || []).map(g => `<option value="${g}">${g}</option>`).join('');
  }

  const monthInput = $('#sel-month');
  if (monthInput) {
    monthInput.value = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  }

  render();
}

function render() {
  const app = $('#app');
  if (!app) return;

  if (V === 'm') app.innerHTML = renderMatriz();
  else if (V === 'p') app.innerHTML = renderPerfil();
  else if (V === 'g') app.innerHTML = renderAdminConfig();
  else if (V === 'u') app.innerHTML = renderUsuarios();
  else if (V === 'l') app.innerHTML = renderLogs();

  document.querySelectorAll('.nav-i').forEach(b => b.classList.toggle('on', b.dataset.v === V));
}

function doLogout() {
  currentUser = null;
  location.reload();
}

window.onload = function() {
  loadData();
};
