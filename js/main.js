function setSyncStatus(state, msg) {
  const dot = $('#sync-dot'), txt = $('#sync-text');
  if (!dot || !txt) return;
  dot.className = 'sync-dot ' + (state === 'busy' ? 'busy' : state === 'err' ? 'err' : '');
  txt.textContent = msg;
}

async function loadData() {
  setSyncStatus('busy', 'Conectando...');
  try {
    const res = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.record) S = data.record;
    
    if (!S.conceptos) S.conceptos = JSON.parse(JSON.stringify(CONCEPTOS_INICIALES));
    if (!S.horarios) S.horarios = {};

    hasUnsavedChanges = false;
    setSyncStatus('ok', 'Sincronizado');
  } catch(err) {
    console.error('Error al cargar datos:', err);
    setSyncStatus('err', 'Error de red');
  }
  if (currentUser) render();
}

async function saveData() {
  setSyncStatus('busy', 'Guardando...');
  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
      body: JSON.stringify(S)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    hasUnsavedChanges = false;
    const btn = $('#btn-save');
    if (btn) btn.classList.remove('unsaved');
    setSyncStatus('ok', 'Guardado en Nube');
  } catch(err) {
    console.error('Error al guardar:', err);
    setSyncStatus('err', 'Error al guardar');
    alert('❌ Error al guardar datos en la nube.');
  }
}

function doLogin(evt) {
  evt.preventDefault();
  const uInput = $('#l-user').value.trim().toUpperCase();
  const pInput = $('#l-pass').value.trim();

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

  $('#sb-user').textContent = currentUser.nombre;
  $('#sb-role').textContent = currentUser.r === 'admin' ? 'Superadministrador' : 'Operador';

  // Inicializar Select de Grupos
  const selG = $('#sel-grupo');
  selG.innerHTML = `<option value="ALL">🌐 Todos los Grupos</option>` + S.grupos.map(g => `<option value="${g}">${g}</option>`).join('');

  // Inicializar Selector de Mes/Año con el actual
  const monthInput = $('#sel-month');
  monthInput.value = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  render();
}

function render() {
  $('#app').innerHTML = V === 'm' ? renderMatriz() : V === 'p' ? renderPerfil() : V === 'g' ? renderAdminConfig() : '<h2>Vista en desarrollo</h2>';
  document.querySelectorAll('.nav-i').forEach(b => b.classList.toggle('on', b.dataset.v === V));
}

function doLogout() {
  currentUser = null;
  location.reload();
}

window.onload = function() {
  loadData();
};