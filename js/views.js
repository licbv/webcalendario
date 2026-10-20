function renderMatriz() {
  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const monthStr = String(currentMonth).padStart(2, '0');
  
  const usuariosFiltrados = S.usuarios.filter(u => u.r !== 'admin' && (DIST_FILTER === 'ALL' || u.grupo === DIST_FILTER));

  let html = `
  <div class="card">
    <h3>
      <span>Matriz Operativa - ${monthStr}/${currentYear}</span>
      <span style="font-size:12px; font-weight:400; color:var(--muted)">Mostrando ${usuariosFiltrados.length} integrantes</span>
    </h3>
    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th class="r">Operador / Horario</th>
            ${Array.from({length: daysCount}, (_, i) => `<th>${i+1}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  usuariosFiltrados.forEach(u => {
    const hor = S.horarios[u.u] || { entrada: "07:00", hsDiarias: 8 };
    const salida = calcularHoraSalida(hor.entrada, hor.hsDiarias);

    const isOwnProfile = currentUser && (currentUser.u === u.u || currentUser.r === 'admin');

    html += `
      <tr>
        <td class="r">
          <b>${e(u.nombre)}</b>
          <div style="font-size:10px; color:var(--muted)">
            [${e(u.grupo || 'Sin Grupo')}] 🕒 ${hor.entrada} a ${salida} (${hor.hsDiarias}hs)
          </div>
        </td>
    `;

    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${currentYear}-${monthStr}-${String(day).padStart(2, '0')}`;
      const reg = S.registros.find(r => r.u === u.u && r.fecha === dateStr);
      const conceptoObj = reg ? S.conceptos.find(c => c.id === reg.concepto) : null;

      if (reg && conceptoObj) {
        html += `<td style="background:${conceptoObj.color}; color:${conceptoObj.textColor};" 
                     title="${conceptoObj.nombre}${reg.horas ? ' ('+reg.horas+'hs)' : ''}"
                     ${isOwnProfile ? `onclick="openEditCell('${u.u}', '${dateStr}')"` : ''}>
                   <b>${conceptoObj.id}</b>
                 </td>`;
      } else {
        html += `<td ${isOwnProfile ? `onclick="openEditCell('${u.u}', '${dateStr}')"` : ''}>-</td>`;
      }
    }
    html += `</tr>`;
  });

  html += `</tbody></table></div></div>`;
  return html;
}

function openEditCell(userU, dateStr) {
  const reg = S.registros.find(r => r.u === userU && r.fecha === dateStr) || { concepto: "", horas: 0, motivo: "" };
  
  const options = `<option value="">-- Sin Carga / Limpiar --</option>` + 
    S.conceptos.map(c => `<option value="${c.id}" ${reg.concepto === c.id ? 'selected':''}>${c.nombre}</option>`).join('');

  const conceptoVal = prompt(`Carga Operativa para ${userU} en fecha ${dateStr}:\nEscribí el código de concepto (${S.conceptos.map(c=>c.id).join(', ')}):\nDejá vacío para eliminar la carga.`);

  if (conceptoVal === null) return;

  const cleanVal = conceptoVal.trim().toUpperCase();
  S.registros = S.registros.filter(r => !(r.u === userU && r.fecha === dateStr));

  if (cleanVal && S.conceptos.some(c => c.id === cleanVal)) {
    let hs = 0;
    if (cleanVal === 'HEX') {
      hs = parseInt(prompt("Cantidad de Horas Extras:", "2")) || 0;
    }
    S.registros.push({ u: userU, fecha: dateStr, concepto: cleanVal, horas: hs });
    logAction(`Cargó/Actualizó concepto [${cleanVal}] para ${userU} el ${dateStr}`);
  } else if (cleanVal !== "") {
    alert("Código de concepto no válido.");
    return;
  }

  markUnsaved();
  render();
}

function renderPerfil() {
  if (!currentUser) return '';
  const hor = S.horarios[currentUser.u] || { entrada: "07:00", hsDiarias: 8 };
  const salida = calcularHoraSalida(hor.entrada, hor.hsDiarias);

  return `
  <div class="card">
    <h3>Mi Perfil de Usuario y Horarios</h3>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
      <div>
        <p><b>Nombre:</b> ${e(currentUser.nombre)}</p>
        <p><b>Usuario (U_RED):</b> ${e(currentUser.u)}</p>
        <p><b>Email:</b> ${e(currentUser.email || 'Sin correo')}</p>
        <p><b>Grupo de Trabajo:</b> ${e(currentUser.grupo || 'Sin asignar')}</p>
      </div>
      <div style="background:#F8FAFC; padding:14px; border-radius:8px; border:1px solid var(--border);">
        <h4 style="margin:0 0 10px;">Configuración de Jornada</h4>
        <div class="field-group">
          <label>Hora de Ingreso:</label>
          <input id="p-entrada" type="time" value="${hor.entrada}" onchange="updateHorarioUsuario()">
        </div>
        <div class="field-group">
          <label>Horas Diarias de Trabajo:</label>
          <input id="p-hs" type="number" min="1" max="16" value="${hor.hsDiarias}" onchange="updateHorarioUsuario()">
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
  
  S.horarios[currentUser.u] = { entrada, hsDiarias: hs };
  $('#p-salida').textContent = calcularHoraSalida(entrada, hs);
  logAction(`Actualizó su horario de jornada: ${entrada} (${hs}hs)`);
  markUnsaved();
}

function renderAdminConfig() {
  if (!currentUser || currentUser.r !== 'admin') return '<p class="login-err">Acceso Denegado.</p>';

  return `
  <div class="card">
    <h3>⚙️ Gestión de Conceptos Personalizados (Crear / Renombrar Tipos de Cargas)</h3>
    <p style="color:var(--muted)">Podés crear nuevas consultas o formas de carga (ej: Vacaciones, Franco, Licencias con goce, etc.):</p>

    <table class="tb" style="width:100%; margin-bottom:14px;">
      <thead>
        <tr style="text-align:left;"><th>Código / ID</th><th>Nombre del Concepto</th><th>Color de Fondo</th><th>Acción</th></tr>
      </thead>
      <tbody>
        ${S.conceptos.map((c, idx) => `
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
      <input id="nc-nom" type="text" placeholder="Nombre completo del concepto">
      <button class="btn" onclick="addConcepto()">➕ Agregar Concepto</button>
    </div>
  </div>`;
}

function addConcepto() {
  const id = $('#nc-id').value.trim().toUpperCase();
  const nombre = $('#nc-nom').value.trim();
  if (!id || !nombre) return alert('Ingresá ID y Nombre');
  if (S.conceptos.some(c => c.id === id)) return alert('Ya existe ese ID');

  S.conceptos.push({ id, nombre, color: "#E2E8F0", textColor: "#0F172A" });
  logAction(`Creó un nuevo concepto de carga: [${id}] ${nombre}`);
  markUnsaved();
  render();
}