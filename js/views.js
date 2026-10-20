let FERIADOS_AR = [
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-03-24", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-25", "2026-06-17", "2026-06-20", "2026-07-09", "2026-08-17",
  "2026-10-12", "2026-11-20", "2026-12-08", "2026-12-25"
];
let lastFetchedYear = null;
let activeConcepto = "VAC";

async function fetchFeriados(year) {
  if (lastFetchedYear === year) return;
  try {
    const res = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + year + '/AR');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        FERIADOS_AR = data.map(f => f.date);
        lastFetchedYear = year;
        document.querySelectorAll('th[data-date]').forEach(th => {
          if (FERIADOS_AR.includes(th.dataset.date)) {
            th.style.background = '#FEE2E2';
            th.title = 'Feriado Nacional';
          }
        });
      }
    }
  } catch (err) {
    console.warn('Usando feriados de respaldo para ' + year);
  }
}

function isWeekendOrHoliday(year, month, day) {
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isHoliday = FERIADOS_AR.includes(dateStr);
  return { isNonWorking: dayOfWeek === 0 || dayOfWeek === 6 || isHoliday, isHoliday };
}

function renderMatriz() {
  fetchFeriados(currentYear);

  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const monthStr = String(currentMonth).padStart(2, '0');

  const todosUsuarios = (S && Array.isArray(S.usuarios)) ? S.usuarios : [];
  const usuariosFiltrados = todosUsuarios.filter(u => {
    if (!u || u.r === 'admin') return false;
    if (DIST_FILTER === 'ALL') return true;
    return String(u.grupo || '').trim().toLowerCase() === String(DIST_FILTER).trim().toLowerCase();
  });

  let html = `
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
      <div>
        <h3 style="margin:0;">Matriz Operativa - ${monthStr}/${currentYear}</h3>
        <span style="font-size:11px; color:var(--muted)">Mostrando ${usuariosFiltrados.length} operadores</span>
      </div>
      <div style="background:#F1F5F9; padding:8px 14px; border-radius:8px; display:flex; align-items:center; gap:8px; border:1px solid var(--border);">
        <label style="font-weight:700; font-size:11px; color:var(--navy);">⚡ Modo de Carga Activo:</label>
        <select id="sel-active-concept" onchange="activeConcepto=this.value;" style="font-weight:700;">
          ${(S.conceptos || []).map(c => `<option value="${c.id}" ${activeConcepto === c.id ? 'selected':''}>${e(c.nombre)} (${c.id})</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th class="r">Operador / Horario Base</th>
            ${Array.from({length: daysCount}, (_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${monthStr}-${String(day).padStart(2, '0')}`;
              const { isNonWorking, isHoliday } = isWeekendOrHoliday(currentYear, currentMonth, day);
              const bg = isHoliday ? '#FEE2E2' : isNonWorking ? '#E2E8F0' : '#F6F7F9';
              return `<th data-date="${dateStr}" style="background:${bg};" title="${isHoliday ? 'Feriado Nacional' : ''}">${day}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  if (usuariosFiltrados.length === 0) {
    html += `<tr><td colspan="${daysCount + 1}" style="padding:20px; color:var(--muted); text-align:center;">No hay operadores registrados en este grupo.</td></tr>`;
  } else {
    usuariosFiltrados.forEach(u => {
      const uKey = String(u.u || '').toLowerCase();
      const hor = (S.horarios && S.horarios[uKey]) ? S.horarios[uKey] : { entrada: "07:00", hsDiarias: 8 };
      const entradaBase = hor.entrada || "07:00";
      const hsDiariasBase = hor.hsDiarias || 8;
      const salidaBase = calcularHoraSalida(entradaBase, hsDiariasBase);
      const isOwnProfile = currentUser && (currentUser.u.toLowerCase() === uKey || currentUser.r === 'admin');

      html += `
        <tr>
          <td class="r">
            <b>${e(u.nombre)}</b>
            <div style="font-size:10px; color:var(--muted)">
              [${e(u.grupo || 'Sin Grupo')}] 🕒 Base: ${entradaBase} a ${salidaBase}
            </div>
          </td>
      `;

      for (let day = 1; day <= daysCount; day++) {
        const dateStr = `${currentYear}-${monthStr}-${String(day).padStart(2, '0')}`;
        const reg = (S.registros || []).find(r => String(r.u).toLowerCase() === uKey && r.fecha === dateStr);
        const conceptoObj = reg ? (S.conceptos || []).find(c => c.id === reg.concepto) : null;
        const { isNonWorking, isHoliday } = isWeekendOrHoliday(currentYear, currentMonth, day);

        let cellStyle = "cursor:pointer;";
        if (reg && conceptoObj) {
          cellStyle = `background:${conceptoObj.color}; color:${conceptoObj.textColor}; font-weight:700; cursor:pointer;`;
        } else if (isHoliday) {
          cellStyle = "background:#FEE2E2; color:#991B1B; cursor:pointer;";
        } else if (isNonWorking) {
          cellStyle = "background:#F1F5F9; color:#64748B; cursor:pointer;";
        }

        const horarioTexto = reg && reg.horaInicio ? ` (${reg.horaInicio}-${reg.horaFin})` : '';

        html += `<td style="${cellStyle}" title="${conceptoObj ? e(conceptoObj.nombre) + horarioTexto : isHoliday ? 'Feriado' : 'Día Laboral'}" ${isOwnProfile ? `onclick="toggleCellConcept('${u.u}', '${dateStr}')"` : ''}>
                   ${conceptoObj ? `<b>${conceptoObj.id}</b><div style="font-size:9px; font-weight:normal;">${reg.horaInicio || ''}</div>` : '-'}
                 </td>`;
      }
      html += `</tr>`;
    });
  }

  html += `</tbody></table></div></div>`;
  return html;
}

function toggleCellConcept(userU, dateStr) {
  if (!S.registros) S.registros = [];
  const uKey = String(userU).toLowerCase();
  const existingIndex = S.registros.findIndex(r => String(r.u).toLowerCase() === uKey && r.fecha === dateStr);
  const currentReg = existingIndex >= 0 ? S.registros[existingIndex] : null;

  const horBase = (S.horarios && S.horarios[uKey]) ? S.horarios[uKey] : { entrada: "07:00", hsDiarias: 8 };
  const salidaBase = calcularHoraSalida(horBase.entrada || "07:00", horBase.hsDiarias || 8);

  if (!currentReg) {
    const rangoHorario = prompt(`Horario para ${activeConcepto} (${dateStr}):\nFormato: HH:MM a HH:MM`, `${horBase.entrada} a ${salidaBase}`);
    if (rangoHorario === null) return;

    const parts = rangoHorario.split('a').map(s => s.trim());
    const horaInicio = parts[0] || horBase.entrada;
    const horaFin = parts[1] || salidaBase;

    S.registros.push({ u: uKey, fecha: dateStr, concepto: activeConcepto, horaInicio, horaFin });
    logAction(`Cargó [${activeConcepto}] (${horaInicio}-${horaFin}) para ${uKey} el ${dateStr}`);
  } else {
    if (currentReg.concepto === activeConcepto) {
      S.registros.splice(existingIndex, 1);
      logAction(`Quitó [${activeConcepto}] de ${uKey} el ${dateStr}`);
    } else {
      const rangoHorario = prompt(`Nuevo horario para ${activeConcepto} (${dateStr}):`, `${currentReg.horaInicio || horBase.entrada} a ${currentReg.horaFin || salidaBase}`);
      if (rangoHorario === null) return;

      const parts = rangoHorario.split('a').map(s => s.trim());
      const horaInicio = parts[0] || horBase.entrada;
      const horaFin = parts[1] || salidaBase;

      S.registros[existingIndex] = { u: uKey, fecha: dateStr, concepto: activeConcepto, horaInicio, horaFin };
      logAction(`Cambió a [${activeConcepto}] (${horaInicio}-${horaFin}) para ${uKey} el ${dateStr}`);
    }
  }

  markUnsaved();
  render();
}

function renderPerfil() {
  if (!currentUser) return '';
  const uKey = currentUser.u.toLowerCase();
  const hor = (S.horarios && S.horarios[uKey]) ? S.horarios[uKey] : { entrada: "07:00", hsDiarias: 8 };
  const salida = calcularHoraSalida(hor.entrada || "07:00", hor.hsDiarias || 8);

  return `
  <div class="card">
    <h3>Mi Perfil y Horario de Jornada</h3>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
      <div>
        <p><b>Nombre Operador:</b> ${e(currentUser.nombre)}</p>
        <p><b>Usuario de Red:</b> ${e(currentUser.u)}</p>
        <p><b>Email Telefónica:</b> ${e(currentUser.email || 'Sin registrar')}</p>
        <p><b>Grupo Operativo:</b> ${e(currentUser.grupo || 'Sin asignar')}</p>
        <button class="btn" style="margin-top:10px;" onclick="openChangePwdModal()">🔑 Cambiar Mi Contraseña</button>
      </div>
      <div style="background:#F8FAFC; padding:14px; border-radius:8px; border:1px solid var(--border);">
        <h4 style="margin:0 0 10px;">Configurar Mi Turno Base</h4>
        <div class="field-group">
          <label>Hora de Ingreso Base:</label>
          <input id="p-entrada" type="time" value="${hor.entrada || '07:00'}" onchange="updateHorarioUsuario()">
        </div>
        <div class="field-group">
          <label>Duración de Jornada (Horas):</label>
          <input id="p-hs" type="number" min="1" max="16" value="${hor.hsDiarias || 8}" onchange="updateHorarioUsuario()">
        </div>
        <p style="font-weight:700; color:var(--blue); margin-top:10px;">
          Hora estimada de Salida: <span id="p-salida">${salida}</span>
        </p>
      </div>
    </div>
  </div>`;
}

function updateHorarioUsuario() {
  if (!currentUser) return;
  const entrada = $('#p-entrada').value;
  const hs = parseInt($('#p-hs').value) || 8;
  const uKey = currentUser.u.toLowerCase();
  if (!S.horarios) S.horarios = {};
  S.horarios[uKey] = { entrada, hsDiarias: hs };
  $('#p-salida').textContent = calcularHoraSalida(entrada, hs);
  logAction(`Actualizó su turno base a las ${entrada} (${hs}hs)`);
  markUnsaved();
}

function renderAdminConfig() {
  if (!currentUser || currentUser.r !== 'admin') return '<div class="card"><p style="color:var(--danger)">Acceso Denegado.</p></div>';

  return `
  <div class="card">
    <h3>⚙️ Gestión de Conceptos de Carga (Vacaciones, Licencias, etc.)</h3>
    <table style="width:100%; text-align:left; margin-bottom:14px;">
      <thead>
        <tr><th>Código</th><th>Nombre del Concepto</th><th>Color</th><th>Acciones</th></tr>
      </thead>
      <tbody>
        ${(S.conceptos || []).map((c, idx) => `
          <tr>
            <td><b>${e(c.id)}</b></td>
            <td><input type="text" value="${e(c.nombre)}" onchange="S.conceptos[${idx}].nombre=this.value; markUnsaved();"></td>
            <td><input type="color" value="${c.color}" onchange="S.conceptos[${idx}].color=this.value; markUnsaved();"></td>
            <td><button class="btn" style="background:var(--danger);" onclick="S.conceptos.splice(${idx},1); markUnsaved(); render();">Eliminar</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="display:flex; gap:10px;">
      <input id="nc-id" type="text" placeholder="ID (ej: LIC)" style="width:100px; text-transform:uppercase;">
      <input id="nc-nom" type="text" placeholder="Nombre completo">
      <button class="btn" onclick="addConcepto()">➕ Agregar Concepto</button>
    </div>
  </div>`;
}

function addConcepto() {
  const id = $('#nc-id').value.trim().toUpperCase();
  const nombre = $('#nc-nom').value.trim();
  if (!id || !nombre) return alert('Ingresá ID y Nombre');
  if (!S.conceptos) S.conceptos = [];
  if (S.conceptos.some(c => c.id === id)) return alert('Ya existe ese código.');

  S.conceptos.push({ id, nombre, color: "#E2E8F0", textColor: "#0F172A" });
  logAction(`Creó el concepto [${id}] ${nombre}`);
  markUnsaved();
  render();
}

function renderUsuarios() {
  if (!currentUser || currentUser.r !== 'admin') return '<div class="card"><p style="color:var(--danger)">Acceso Denegado.</p></div>';

  return `
  <div class="card">
    <h3>👥 Gestión de Personal, Horarios Base y Contraseñas (${(S.usuarios || []).length})</h3>
    <div style="background:#F8FAFC; padding:12px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
      <h4 style="margin:0 0 8px;">➕ Dar de Alta Nuevo Integrante</h4>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <input id="nu-u" type="text" placeholder="Usuario (u_red)" style="width:140px;">
        <input id="nu-p" type="text" placeholder="Contraseña Inicial" style="width:140px;">
        <input id="nu-nom" type="text" placeholder="Apellido, Nombre" style="width:180px;">
        <select id="nu-g">
          ${(S.grupos || []).map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <button class="btn" onclick="addUsuario()">Crear Operador</button>
      </div>
    </div>

    <table style="width:100%; text-align:left; font-size:12px;">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Contraseña</th>
          <th>Nombre Completo</th>
          <th>Grupo</th>
          <th>Hora Ingreso</th>
          <th>Hs Diarias</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${(S.usuarios || []).map((u, idx) => {
          const uKey = u.u.toLowerCase();
          const hor = (S.horarios && S.horarios[uKey]) ? S.horarios[uKey] : { entrada: "07:00", hsDiarias: 8 };
          return `
          <tr>
            <td><b>${e(u.u)}</b></td>
            <td><input type="text" value="${e(u.p)}" style="width:100px;" onchange="S.usuarios[${idx}].p=this.value; markUnsaved();"></td>
            <td><input type="text" value="${e(u.nombre)}" style="width:180px;" onchange="S.usuarios[${idx}].nombre=this.value; markUnsaved();"></td>
            <td>
              <select onchange="S.usuarios[${idx}].grupo=this.value; markUnsaved();">
                ${(S.grupos || []).map(g => `<option value="${g}" ${u.grupo === g ? 'selected':''}>${g}</option>`).join('')}
              </select>
            </td>
            <td><input type="time" value="${hor.entrada \vert{}\vert{} '07:00'}" onchange="updateHorarioAdmin('${uKey}', this.value, null)"></td>
            <td><input type="number" min="1" max="16" value="${hor.hsDiarias \vert{}\vert{} 8}" style="width:60px;" onchange="updateHorarioAdmin('${uKey}', null, this.value)"></td>
            <td>
              ${u.u.toUpperCase() === 'KRUKI' ? '<i>Superadmin</i>' : `<button class="btn" style="background:var(--danger);" onclick="S.usuarios.splice(${idx},1); markUnsaved(); render();">Eliminar</button>`}
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  </div>`;
}

function updateHorarioAdmin(uKey, entrada, hsDiarias) {
  if (!S.horarios) S.horarios = {};
  if (!S.horarios[uKey]) S.horarios[uKey] = { entrada: "07:00", hsDiarias: 8 };

  if (entrada !== null) S.horarios[uKey].entrada = entrada;
  if (hsDiarias !== null) S.horarios[uKey].hsDiarias = parseInt(hsDiarias) || 8;

  logAction(`Admin actualizó el horario base de ${uKey}`);
  markUnsaved();
}

function addUsuario() {
  const u = $('#nu-u').value.trim().toLowerCase();
  const p = $('#nu-p').value.trim() || u;
  const nombre = $('#nu-nom').value.trim();
  const grupo = $('#nu-g').value;

  if (!u || !nombre) return alert('Ingresá usuario y nombre.');
  if (!S.usuarios) S.usuarios = [];
  if (S.usuarios.some(x => x.u.toLowerCase() === u)) return alert('El usuario ya existe.');

  S.usuarios.push({ u, p, r: "user", nombre, grupo, email: `${u}@tmoviles.com.ar` });
  if (!S.horarios) S.horarios = {};
  S.horarios[u] = { entrada: "07:00", hsDiarias: 8 };
  logAction(`Dio de alta al operador "${u}" (${nombre})`);
  markUnsaved();
  render();
}

function renderLogs() {
  if (!currentUser || currentUser.r !== 'admin') return '<div class="card"><p style="color:var(--danger)">Acceso Denegado.</p></div>';

  return `
  <div class="card">
    <h3>📋 Log de Auditoría y Cambios (${(S.logs || []).length} eventos)</h3>
    <table style="width:100%; text-align:left;">
      <thead>
        <tr><th>Fecha y Hora</th><th>Usuario</th><th>Acción Registrada</th></tr>
      </thead>
      <tbody>
        ${(S.logs || []).map(l => `
          <tr>
            <td style="font-family:monospace; font-size:11px; color:var(--muted);">${new Date(l.t).toLocaleString('es-AR')}</td>
            <td><b>${e(l.u)}</b></td>
            <td>${e(l.a)}</td>
          </tr>
        `).join('') || '<tr><td colspan="3">Sin registros de actividad.</td></tr>'}
      </tbody>
    </table>
  </div>`;
}
