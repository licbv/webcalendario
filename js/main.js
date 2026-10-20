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
        'X-Master-Key': MASTER_KEY
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rawData = await res.json();
    
    // JSONBin puede devolver los datos directamente o envueltos en "record"
    const parsedData = rawData.record ? rawData.record : rawData;

    if (parsedData && typeof parsedData === 'object') {
      // Fusionamos validando que no perdamos la nómina de usuarios si en la nube viniera vacía
      if (Array.isArray(parsedData.usuarios) && parsedData.usuarios.length > 0) {
        S.usuarios = parsedData.usuarios;
      }
      if (Array.isArray(parsedData.conceptos)) S.conceptos = parsedData.conceptos;
      if (Array.isArray(parsedData.registros)) S.registros = parsedData.registros;
      if (parsedData.horarios) S.horarios = parsedData.horarios;
      if (Array.isArray(parsedData.grupos)) S.grupos = parsedData.grupos;
      if (Array.isArray(parsedData.logs)) S.logs = parsedData.logs;
      if (parsedData.config) S.config = parsedData.config;
    }

    hasUnsavedChanges = false;
    setSyncStatus('ok', 'Sincronizado');
  } catch(err) {
    console.error('❌ Error al conectar con JSONBin. Se usará la nómina local:', err);
    setSyncStatus('err', 'Modo Local');
  }

  // Verificar si había sesión iniciada previamente en esta máquina
  checkSavedSession();

  if (currentUser) render();
}

function checkSavedSession() {
  const savedUser = localStorage.getItem('cper_logged_user');
  if (savedUser) {
    const found = S.usuarios.find(x => String(x.u).toLowerCase() === savedUser.toLowerCase());
    if (found) {
      currentUser = found;
      showApp();
    }
  }
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

  const found = S.usuarios.find(x => String(x.u).toLowerCase() === uInput);

  if (found && String(found.p) === pInput) {
    currentUser = found;
    localStorage.setItem('cper_logged_user', currentUser.u);
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
  localStorage.removeItem('cper_logged_user');
  currentUser = null;
  location.reload();
}

window.onload = function() {
  loadData();
};
