function setSyncStatus(state, msg) {
  const dot = $('#sync-dot'), txt = $('#sync-text');
  if (!dot || !txt) return;
  dot.className = 'sync-dot ' + (state === 'busy' ? 'busy' : state === 'err' ? 'err' : '');
  txt.textContent = msg;
}

async function loadData() {
  setSyncStatus('busy', 'Conectando...');
  try {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Meta': 'false'
      }
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const rawData = await res.json();
    const parsedData = rawData.record ? rawData.record : rawData;

    if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.usuarios) && parsedData.usuarios.length >= 2) {
      S = parsedData;
      console.log("✅ Datos cargados correctamente desde la nube:", S);
    } else {
      console.warn("⚠️ Base de datos en la nube vacía. Cargando nómina de 18 integrantes...");
      S = JSON.parse(JSON.stringify(INITIAL_DATA));
      await saveData();
    }

    hasUnsavedChanges = false;
    setSyncStatus('ok', 'Sincronizado');
  } catch(err) {
    console.error('❌ Usando respaldo local:', err);
    if (!S || !S.usuarios || S.usuarios.length < 2) {
      S = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    setSyncStatus('err', 'Modo Offline');
  }

  checkSavedSession();

  if (currentUser) render();
}

function checkSavedSession() {
  const savedUser = localStorage.getItem('cper_logged_user');
  if (savedUser && !currentUser) {
    const found = S.usuarios.find(x => String(x.u).toLowerCase() === savedUser.toLowerCase());
    if (found) {
      currentUser = found;
      showApp();
    }
  }
}

async function saveData() {
  if (!S || !Array.isArray(S.usuarios) || S.usuarios.length < 2) {
    alert("❌ Error: Intentó guardarse la base de datos vacía. Proceso detenido.");
    return;
  }

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

    if (!res.ok) throw new Error('HTTP ' + res.status);

    hasUnsavedChanges = false;
    const btn = $('#btn-save');
    if (btn) btn.classList.remove('unsaved');

    setSyncStatus('ok', 'Guardado en Nube');
    setTimeout(function() { setSyncStatus('ok', 'Sincronizado'); }, 2000);
  } catch(err) {
    console.error('❌ Error al guardar:', err);
    setSyncStatus('err', 'Error al guardar');
    alert('❌ No se pudo guardar en la nube:\n' + err.message);
  }
}

function doLogin(evt) {
  evt.preventDefault();
  const uInput = $('#l-user').value.trim().toLowerCase();
  const pInput = $('#l-pass').value.trim();

  if (!S.usuarios || S.usuarios.length === 0) {
    alert("Cargando datos del servidor... Aguarde un segundo.");
    return;
  }

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

function openChangePwdModal() {
  const modal = $('#pwd-modal');
  if (modal) modal.style.display = 'flex';
}

function saveNewPwd(evt) {
  evt.preventDefault();
  const oldP = $('#pwd-old').value.trim();
  const newP = $('#pwd-new').value.trim();
  const confP = $('#pwd-confirm').value.trim();

  if (oldP !== currentUser.p) {
    alert('La contraseña actual es incorrecta.');
    return;
  }
  if (newP !== confP) {
    alert('Las nuevas contraseñas no coinciden.');
    return;
  }

  currentUser.p = newP;
  const userIdx = S.usuarios.findIndex(u => u.u.toLowerCase() === currentUser.u.toLowerCase());
  if (userIdx >= 0) S.usuarios[userIdx].p = newP;

  const modal = $('#pwd-modal');
  if (modal) modal.style.display = 'none';
  logAction("Cambió su contraseña de acceso");
  saveData();
  alert('✅ Contraseña actualizada correctamente.');
}

function showApp() {
  $('#login-screen').style.display = 'none';
  $('#sb').style.display = 'flex';
  $('#main-header').style.display = 'flex';
  $('#app').style.display = 'block';

  document.querySelectorAll('.adm-section').forEach(function(el) {
    el.style.display = currentUser.r === 'admin' ? 'block' : 'none';
  });

  $('#sb-user').textContent = currentUser.nombre || currentUser.u;
  $('#sb-role').textContent = currentUser.r === 'admin' ? 'Superadministrador' : 'Operador';

  const selG = $('#sel-grupo');
  if (selG) {
    selG.innerHTML = '<option value="ALL">🌐 Todos los Grupos</option>' + (S.grupos || []).map(function(g) { return '<option value="' + g + '">' + g + '</option>'; }).join('');
  }

  const monthInput = $('#sel-month');
  if (monthInput) {
    monthInput.value = currentYear + '-' + String(currentMonth).padStart(2, '0');
  }

  // BINDING DE NAVEGACIÓN EN EL MENÚ LATERAL
  document.querySelectorAll('.nav-i').forEach(function(btn) {
    btn.onclick = function() {
      V = this.dataset.v;
      render();
    };
  });

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

  document.querySelectorAll('.nav-i').forEach(function(b) {
    b.classList.toggle('on', b.dataset.v === V);
  });
}

function doLogout() {
  localStorage.removeItem('cper_logged_user');
  currentUser = null;
  location.reload();
}

window.onload = function() {
  loadData();
};
