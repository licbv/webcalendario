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
        'X-Bin-Meta': 'false' // Trae directamente el objeto de datos sin metadatos
      }
    });

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }

    const data = await res.json();
    
    if (data && typeof data === 'object') {
      S = data;
    }

    // Aseguramos arreglos mínimos en caso de que el Bin esté vacío
    if (!S.usuarios || !Array.isArray(S.usuarios) || S.usuarios.length === 0) {
      S.usuarios = [
        { u: "KRUKI", p: "adMIN", r: "admin", nombre: "Iván Javier Kruk Losada", email: "ivan.kruk@tmoviles.com.ar" }
      ];
    }
    if (!S.conceptos) S.conceptos = JSON.parse(JSON.stringify(CONCEPTOS_INICIALES));
    if (!S.registros) S.registros = [];
    if (!S.horarios) S.horarios = {};
    if (!S.logs) S.logs = [];

    hasUnsavedChanges = false;
    setSyncStatus('ok', 'Sincronizado');
    console.log("✅ Datos cargados correctamente desde JSONBin:", S);
  } catch(err) {
    console.error('❌ Error al cargar datos de JSONBin:', err);
    setSyncStatus('err', 'Error de lectura');
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

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }

    hasUnsavedChanges = false;
    const btn = $('#btn-save');
    if (btn) btn.classList.remove('unsaved');
    
    setSyncStatus('ok', 'Guardado en Nube');
    setTimeout(() => setSyncStatus('ok', 'Sincronizado'), 2000);
    console.log("✅ Datos guardados con éxito en JSONBin");
  } catch(err) {
    console.error('❌ Error al guardar en JSONBin:', err);
    setSyncStatus('err', 'Error al guardar');
    alert(`❌ No se pudo guardar en la nube.\nDetalle: ${err.message}\n\nComprobá que tu conexión esté activa y que el BIN_ID sea correcto.`);
  }
}

function doLogin(evt) {
  evt.preventDefault();
  const uInput = $('#l-user').value.trim().toUpperCase();
  const pInput = $('#l-pass').value.trim();

  if (!S.usuarios || S.usuarios.length === 0) {
    alert("Cargando datos de la base de datos... Por favor intentá en un instante.");
    return;
  }

  const found = S.usuarios.find(x => x.u.toUpperCase() === uInput);

  if (found && found.p === pInput) {
    currentUser = found;
    $('#l-err').style.display = 'none';
    showApp();
    if (currentUser.u === 'KRUKI') checkAdminSummaryOnLogin();
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
  app.innerHTML = V === 'm' ? renderMatriz() : V === 'p' ? renderPerfil() : V === 'g' ? renderAdminConfig() : '<h2>Vista en desarrollo</h2>';
  document.querySelectorAll('.nav-i').forEach(b => b.classList.toggle('on', b.dataset.v === V));
}

function doLogout() {
  currentUser = null;
  location.reload();
}

window.onload = function() {
  loadData();
};