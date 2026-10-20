function checkAdminSummaryOnLogin() {
  if (!currentUser || currentUser.u !== 'KRUKI') return;

  const lastLogin = S.config.lastAdminLogin ? new Date(S.config.lastAdminLogin) : new Date(0);
  const logsRecientes = S.logs.filter(l => new Date(l.t) > lastLogin && l.u !== 'KRUKI');

  const container = $('#admin-summary-list');
  if (!container) return;

  if (logsRecientes.length === 0) {
    container.innerHTML = `<p style="color:var(--muted); margin:0;">Sin novedades o cambios registrados desde tu último ingreso.</p>`;
  } else {
    container.innerHTML = logsRecientes.map(l => {
      const dateFmt = new Date(l.t).toLocaleString('es-AR');
      return `
        <div class="summary-item">
          <b>${e(l.u)}</b> - <span style="color:var(--muted);">${dateFmt}</span><br>
          ${e(l.a)}
        </div>
      `;
    }).join('');
  }

  $('#admin-summary-modal').style.display = 'flex';
}

function closeAdminSummary() {
  S.config.lastAdminLogin = new Date().toISOString();
  $('#admin-summary-modal').style.display = 'none';
  saveData(); // Guarda la nueva fecha de login
}