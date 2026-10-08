(function () {
  const el = (id) => document.getElementById(id);
  let currentAccountEmail = null;
  let hasLoggedInOnce = false;

  // ---- state: accounts tab ----
  let accState = { page: 1, totalPages: 1, search: '', sortBy: 'createdAt', order: 'desc' };
  // ---- state: audit tab ----
  let auditState = { page: 1, totalPages: 1, search: '' };
  // ---- feature flag: CMS ----
  const CMS_ENABLED = false; // Dinonaktifkan: tidak dipakai frontend Tata dan in-memory tidak persisten

  function showToast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2800);
  }

  function confirmAction(message, title) {
    return new Promise((resolve) => {
      el('confirmTitle').textContent = title || 'Konfirmasi';
      el('confirmMessage').textContent = message;
      el('confirmModal').classList.add('visible');
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function cleanup(result) {
        el('confirmModal').classList.remove('visible');
        el('confirmOkBtn').removeEventListener('click', onOk);
        el('confirmCancelBtn').removeEventListener('click', onCancel);
        resolve(result);
      }
      el('confirmOkBtn').addEventListener('click', onOk);
      el('confirmCancelBtn').addEventListener('click', onCancel);
    });
  }

  async function api(path, options) {
    const adminToken = sessionStorage.getItem('tata_admin_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
      ...(options && options.headers ? options.headers : {})
    };
    const res = await fetch(path, {
      credentials: 'include',
      headers,
      ...options,
    });
    if (res.status === 401) {
      sessionStorage.removeItem('tata_admin_token');
      if (hasLoggedInOnce) showToast('Sesi berakhir, silakan login kembali.');
      showLogin();
      throw new Error('unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'request_failed');
    return data;
  }

  function showLogin() {
    el('loginScreen').style.display = 'flex';
    el('app').classList.remove('visible');
    setTimeout(() => el('passwordInput').focus(), 0);
  }
  function showApp() {
    hasLoggedInOnce = true;
    el('loginScreen').style.display = 'none';
    el('app').classList.add('visible');
    loadDashboard();
  }

  // ---- LOGIN ----
  el('loginBtn').addEventListener('click', doLogin);
  el('passwordInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

  async function doLogin() {
    const password = el('passwordInput').value;
    el('loginError').textContent = '';
    el('loginBtn').disabled = true;
    try {
      const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      if (data && data.token) {
        sessionStorage.setItem('tata_admin_token', data.token);
      }
      el('passwordInput').value = '';
      showApp();
    } catch (e) {
      el('loginError').textContent = e.message === 'too_many_attempts'
        ? 'Terlalu banyak percobaan, coba lagi nanti.'
        : 'Password salah atau server belum dikonfigurasi.';
    } finally {
      el('loginBtn').disabled = false;
    }
  }

  el('logoutBtn').addEventListener('click', async () => {
    sessionStorage.removeItem('tata_admin_token');
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    hasLoggedInOnce = false;
    showLogin();
  });

  // ---- TABS ----
  if (!CMS_ENABLED) {
    const cmsBtn = document.querySelector('.tab-btn[data-tab="cms"]');
    if (cmsBtn) cmsBtn.style.display = 'none';
    const cmsPanel = el('tab-cms');
    if (cmsPanel) cmsPanel.style.display = 'none';
  }

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach((p) => (p.style.display = 'none'));
      el('tab-' + btn.dataset.tab).style.display = 'block';
      if (btn.dataset.tab === 'dashboard') loadDashboard();
      if (btn.dataset.tab === 'accounts') loadAccounts();
      if (btn.dataset.tab === 'audit') loadAudit();
      if (btn.dataset.tab === 'cms' && CMS_ENABLED) loadCms();
    });
  });

  // ---- DASHBOARD ----
  let dashRequestToken = 0;
  async function loadDashboard() {
    const token = ++dashRequestToken;
    try {
      const d = await api('/api/admin/dashboard');
      if (token !== dashRequestToken) return; // respons basi, abaikan

      el('dashStats').innerHTML = `
        <div class="stat-box"><div class="num">${d.totalAccounts}</div><div class="label">Total Akun</div></div>
        <div class="stat-box"><div class="num">${d.premiumAccounts}</div><div class="label">Akun Premium</div></div>
        <div class="stat-box"><div class="num">${d.freeAccounts}</div><div class="label">Akun Free</div></div>
        <div class="stat-box"><div class="num">${d.conversionRate}%</div><div class="label">Konversi Premium</div></div>
      `;

      const maxCount = Math.max(1, ...d.signupTrend14d.map((x) => x.count));
      el('signupChart').innerHTML = d.signupTrend14d.map((x) => {
        const heightPct = Math.max(4, (x.count / maxCount) * 100);
        const shortDate = x.date.slice(5); // MM-DD
        return `
          <div class="chart-bar-col" title="${x.date}: ${x.count} pendaftar">
            <div class="chart-count">${x.count > 0 ? x.count : ''}</div>
            <div class="chart-bar" style="height:${heightPct}%"></div>
            <div class="chart-label">${shortDate}</div>
          </div>
        `;
      }).join('');

      el('sysStatusList').innerHTML = `
        <div class="mini-item"><span>SMTP Terkonfigurasi</span><span>${d.smtpConfigured ? '✅ Ya' : '❌ Belum'}</span></div>
        <div class="mini-item"><span>Gemini API Key</span><span>${d.geminiKeyConfigured ? '✅ Ya' : '❌ Belum'}</span></div>
        <div class="mini-item"><span>OTP Aktif Saat Ini</span><span class="mono">${d.otpStoreActiveCount}</span></div>
      `;

      el('recentSignupsList').innerHTML = d.recentSignups.length
        ? d.recentSignups.map((s) => `
            <div class="mini-item">
              <div>
                <div class="mini-main">${escapeHtml(s.email)}</div>
                <div class="mini-sub">${escapeHtml(s.name || '-')}</div>
              </div>
              <span class="badge ${s.isPremium ? 'premium' : 'free'}">${s.isPremium ? 'Premium' : 'Free'}</span>
            </div>
          `).join('')
        : '<div class="empty-state">Belum ada akun.</div>';

      el('recentActivityList').innerHTML = d.recentPremiumActivity.length
        ? d.recentPremiumActivity.map((a) => `
            <div class="mini-item">
              <div>
                <div class="mini-main">${escapeHtml(a.email)}</div>
                <div class="mini-sub">${formatDate(a.at)} · ${escapeHtml(a.reason)}</div>
              </div>
              <span>${a.action === 'set_premium' ? '✅' : '❌'}</span>
            </div>
          `).join('')
        : '<div class="empty-state">Belum ada perubahan manual.</div>';

      if (d.persistenceWarning) {
        el('dashWarning').style.display = 'block';
        el('dashWarning').textContent = '⚠️ ' + d.persistenceWarning;
      } else {
        el('dashWarning').style.display = 'none';
        el('dashWarning').textContent = '';
      }
    } catch (e) {
      if (e.message !== 'unauthorized') showToast('Gagal memuat dashboard.');
    }
  }

  // ---- ACCOUNTS ----
  el('searchBtn').addEventListener('click', () => { accState.search = el('searchInput').value; accState.page = 1; loadAccounts(); });
  el('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { accState.search = el('searchInput').value; accState.page = 1; loadAccounts(); }
  });
  el('exportBtn').addEventListener('click', () => {
    const q = accState.search ? '?search=' + encodeURIComponent(accState.search) : '';
    window.location.href = '/api/admin/accounts/export' + q;
  });

  const ACCOUNT_COLUMNS = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Nama' },
    { key: 'isPremium', label: 'Status' },
    { key: 'transactionCount', label: 'Transaksi' },
    { key: 'createdAt', label: 'Terdaftar' },
  ];

  let accRequestToken = 0;
  async function loadAccounts() {
    const token = ++accRequestToken;
    const wrap = el('accountsTableWrap');
    wrap.innerHTML = '<div class="empty-state">Memuat...</div>';
    try {
      const params = new URLSearchParams({
        page: String(accState.page),
        sortBy: accState.sortBy,
        order: accState.order,
      });
      if (accState.search) params.set('search', accState.search);
      const data = await api('/api/admin/accounts?' + params.toString());
      if (token !== accRequestToken) return; // respons basi, abaikan
      accState.totalPages = data.totalPages;

      if (!data.accounts.length) {
        wrap.innerHTML = '<div class="empty-state">Tidak ada akun yang cocok.</div>';
        renderAccountsPagination(data);
        return;
      }

      const headerHtml = ACCOUNT_COLUMNS.map((col) => {
        const isActive = accState.sortBy === col.key;
        const arrow = isActive ? (accState.order === 'asc' ? '▲' : '▼') : '';
        return `<th class="sortable" data-sort="${col.key}">${col.label}${isActive ? `<span class="sort-arrow">${arrow}</span>` : ''}</th>`;
      }).join('');

      const rows = data.accounts.map((acc) => `
        <tr data-email="${escapeHtml(acc.email)}">
          <td>${escapeHtml(acc.email)}</td>
          <td>${escapeHtml(acc.name || '-')}</td>
          <td>
            <span class="badge ${acc.isPremium ? 'premium' : 'free'}">${acc.isPremium ? 'Premium' : 'Free'}</span>
            ${acc.isBlocked ? ' <span class="badge" style="background:rgba(251,113,133,0.18);color:var(--red);margin-left:4px">⛔ DIBLOKIR</span>' : ''}
          </td>
          <td>${acc.transactionCount}</td>
          <td>${formatDate(acc.createdAt)}</td>
        </tr>
      `).join('');

      wrap.innerHTML = `
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:10px;color:var(--text-dim);font-size:12px">Total: ${data.total} akun</div>
      `;

      wrap.querySelectorAll('th.sortable').forEach((th) => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (accState.sortBy === key) accState.order = accState.order === 'asc' ? 'desc' : 'asc';
          else { accState.sortBy = key; accState.order = 'desc'; }
          loadAccounts();
        });
      });
      wrap.querySelectorAll('tr[data-email]').forEach((tr) => {
        tr.addEventListener('click', () => openAccountModal(tr.dataset.email));
      });

      renderAccountsPagination(data);
    } catch (e) {
      if (token !== accRequestToken) return;
      if (e.message !== 'unauthorized') wrap.innerHTML = '<div class="empty-state">Gagal memuat data.</div>';
    }
  }

  function renderAccountsPagination(data) {
    const p = el('accountsPagination');
    if (!data.total) { p.innerHTML = ''; return; }
    p.innerHTML = `
      <span>Halaman ${data.page} dari ${data.totalPages}</span>
      <div class="pg-controls">
        <button class="secondary" id="accPrevBtn" ${data.page <= 1 ? 'disabled' : ''}>← Sebelumnya</button>
        <button class="secondary" id="accNextBtn" ${data.page >= data.totalPages ? 'disabled' : ''}>Selanjutnya →</button>
      </div>
    `;
    const prevBtn = el('accPrevBtn'); const nextBtn = el('accNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => { accState.page -= 1; loadAccounts(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { accState.page += 1; loadAccounts(); });
  }

  async function openAccountModal(email) {
    try {
      const data = await api('/api/admin/accounts/' + encodeURIComponent(email));
      const acc = data.account;
      currentAccountEmail = acc.email;
      el('modalEmail').textContent = acc.email;
      el('modalName').textContent = acc.name || '-';
      el('modalStatus').innerHTML = `
        <span class="badge ${acc.isPremium ? 'premium' : 'free'}">${acc.isPremium ? 'Premium' : 'Free'}</span>${acc.isPremium && acc.premiumType ? ` <span class="mono" style="color:var(--text-dim);font-size:11px">(${escapeHtml(acc.premiumType)})</span>` : ''}
        ${acc.isBlocked ? ' <span class="badge" style="background:rgba(251,113,133,0.18);color:var(--red);margin-left:4px">⛔ DIBLOKIR</span>' : ' <span class="badge" style="background:rgba(52,211,153,0.15);color:var(--green);margin-left:4px">Aktif</span>'}
      `;
      el('modalCreatedAt').textContent = formatDate(acc.createdAt);
      el('modalLastLogin').textContent = formatDate(acc.lastLoginAt);

      const blockRow = el('modalBlockRow');
      const blockDetail = el('modalBlockDetail');
      if (acc.isBlocked) {
        blockRow.style.display = 'flex';
        blockDetail.textContent = `Diblokir (${escapeHtml(acc.blockedReason || 'Tanpa alasan')}) · ${formatDate(acc.blockedAt)}`;
      } else {
        blockRow.style.display = 'none';
      }

      const blockBtn = el('toggleBlockBtn');
      const blockText = el('blockStatusText');
      const blockSub = el('blockStatusSub');
      if (acc.isBlocked) {
        blockText.textContent = 'Status Akses: DIBLOKIR ⛔';
        blockText.style.color = 'var(--red)';
        blockSub.textContent = `Alasan: ${acc.blockedReason || '-'} (${formatDate(acc.blockedAt)})`;
        blockBtn.textContent = '✅ Buka Blokir';
        blockBtn.className = 'secondary';
      } else {
        blockText.textContent = 'Status Akses: Aktif ✅';
        blockText.style.color = 'var(--text)';
        blockSub.textContent = 'Akun dapat menggunakan seluruh layanan Tata.';
        blockBtn.textContent = '⛔ Blokir Akun';
        blockBtn.className = 'danger';
      }

      blockBtn.onclick = async () => {
        if (!acc.isBlocked) {
          const reason = prompt(`Masukkan alasan pemblokiran untuk ${acc.email}:`, 'Pelanggaran ketentuan layanan');
          if (reason === null) return;
          const cleanReason = reason.trim() || 'Pelanggaran ketentuan layanan';
          const confirmed = await confirmAction(`Apakah Anda yakin ingin memblokir akun ${acc.email}? Sesi yang sedang aktif akan langsung ditolak.`, 'Konfirmasi Blokir Akun');
          if (!confirmed) return;
          try {
            await api('/api/admin/accounts/' + encodeURIComponent(acc.email) + '/block', {
              method: 'POST',
              body: JSON.stringify({ reason: cleanReason })
            });
            showToast(`Akun ${acc.email} berhasil diblokir.`);
            openAccountModal(acc.email);
            loadAccounts();
          } catch (err) {
            showToast(err.message || 'Gagal memblokir akun.');
          }
        } else {
          const confirmed = await confirmAction(`Buka blokir untuk akun ${acc.email}? Akun akan dapat menggunakan layanan kembali.`, 'Konfirmasi Buka Blokir');
          if (!confirmed) return;
          try {
            await api('/api/admin/accounts/' + encodeURIComponent(acc.email) + '/unblock', {
              method: 'POST',
              body: JSON.stringify({ reason: 'Dibuka kembali oleh admin' })
            });
            showToast(`Blokir akun ${acc.email} berhasil dibuka.`);
            openAccountModal(acc.email);
            loadAccounts();
          } catch (err) {
            showToast(err.message || 'Gagal membuka blokir.');
          }
        }
      };

      el('premiumSelect').value = String(acc.isPremium);
      el('reasonInput').value = '';
      el('modalError').textContent = '';

      const txns = acc.transactions || [];
      el('modalTxnList').innerHTML = txns.length
        ? txns.map((t) => `
            <div class="txn-item">
              <div><strong>${escapeHtml(t.planName)}</strong> — ${escapeHtml(t.currency)} ${formatCurrency(t.amount)} (${escapeHtml(t.status)})</div>
              <div style="color:var(--text-dim)">${escapeHtml(t.paymentMethod)} · ${formatDate(t.paidAt)}</div>
            </div>
          `).join('')
        : '<div class="empty-state">Belum ada transaksi.</div>';

      el('accountModal').classList.add('visible');
    } catch (e) {
      if (e.message !== 'unauthorized') showToast('Gagal memuat detail akun.');
    }
  }

  el('closeModalBtn').addEventListener('click', () => el('accountModal').classList.remove('visible'));

  // Tutup modal via klik di area gelap (backdrop), bukan di kartu modalnya
  el('accountModal').addEventListener('click', (e) => { if (e.target === el('accountModal')) el('accountModal').classList.remove('visible'); });
  el('confirmModal').addEventListener('click', (e) => { if (e.target === el('confirmModal')) el('confirmCancelBtn').click(); });

  // Tutup modal teratas via tombol ESC
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (el('confirmModal').classList.contains('visible')) el('confirmCancelBtn').click();
    else if (el('accountModal').classList.contains('visible')) el('accountModal').classList.remove('visible');
  });

  el('saveModalBtn').addEventListener('click', async () => {
    const isPremium = el('premiumSelect').value === 'true';
    const reason = el('reasonInput').value.trim();
    el('modalError').textContent = '';
    if (reason.length < 3) {
      el('modalError').textContent = 'Alasan wajib diisi (minimal 3 karakter).';
      return;
    }
    const actionLabel = isPremium ? 'MENGAKTIFKAN' : 'MENONAKTIFKAN';
    const confirmed = await confirmAction(
      `Kamu akan ${actionLabel} status Premium untuk ${currentAccountEmail}. Lanjutkan?`,
      'Konfirmasi Perubahan Premium'
    );
    if (!confirmed) return;

    el('saveModalBtn').disabled = true;
    try {
      await api('/api/admin/accounts/' + encodeURIComponent(currentAccountEmail) + '/premium', {
        method: 'POST',
        body: JSON.stringify({ isPremium, reason }),
      });
      el('accountModal').classList.remove('visible');
      showToast('Perubahan disimpan.');
      loadAccounts();
    } catch (e) {
      if (e.message !== 'unauthorized') el('modalError').textContent = 'Gagal menyimpan perubahan.';
    } finally {
      el('saveModalBtn').disabled = false;
    }
  });

  // ---- AUDIT LOG ----
  el('auditSearchBtn').addEventListener('click', () => { auditState.search = el('auditSearchInput').value; auditState.page = 1; loadAudit(); });
  el('auditSearchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { auditState.search = el('auditSearchInput').value; auditState.page = 1; loadAudit(); }
  });

  let auditRequestToken = 0;
  async function loadAudit() {
    const token = ++auditRequestToken;
    const wrap = el('auditWrap');
    wrap.innerHTML = '<div class="empty-state">Memuat...</div>';
    try {
      const params = new URLSearchParams({ page: String(auditState.page) });
      if (auditState.search) params.set('search', auditState.search);
      const data = await api('/api/admin/audit-log?' + params.toString());
      if (token !== auditRequestToken) return; // respons basi, abaikan
      auditState.totalPages = data.totalPages;

      if (!data.entries.length) {
        wrap.innerHTML = '<div class="empty-state">Belum ada perubahan manual.</div>';
        renderAuditPagination(data);
        return;
      }
      wrap.innerHTML = `
        <table>
          <thead><tr><th>Waktu</th><th>Email</th><th>Aksi</th><th>Alasan</th></tr></thead>
          <tbody>
            ${data.entries.map((e) => `
              <tr>
                <td>${formatDate(e.at)}</td>
                <td>${escapeHtml(e.email)}</td>
                <td>${e.action === 'set_premium' ? '✅ Aktifkan' : '❌ Nonaktifkan'}</td>
                <td>${escapeHtml(e.reason)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      renderAuditPagination(data);
    } catch (e) {
      if (token !== auditRequestToken) return;
      if (e.message !== 'unauthorized') wrap.innerHTML = '<div class="empty-state">Gagal memuat log.</div>';
    }
  }

  function renderAuditPagination(data) {
    const p = el('auditPagination');
    if (!data.total) { p.innerHTML = ''; return; }
    p.innerHTML = `
      <span>Halaman ${data.page} dari ${data.totalPages}</span>
      <div class="pg-controls">
        <button class="secondary" id="auditPrevBtn" ${data.page <= 1 ? 'disabled' : ''}>← Sebelumnya</button>
        <button class="secondary" id="auditNextBtn" ${data.page >= data.totalPages ? 'disabled' : ''}>Selanjutnya →</button>
      </div>
    `;
    const prevBtn = el('auditPrevBtn'); const nextBtn = el('auditNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => { auditState.page -= 1; loadAudit(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { auditState.page += 1; loadAudit(); });
  }

  // ---- CMS KONTEN APLIKASI ----
  let cmsRequestToken = 0;

  el('cmsAddBtn').addEventListener('click', async () => {
    const key = el('cmsNewKey').value.trim();
    const value = el('cmsNewValue').value;
    el('cmsAddError').textContent = '';
    if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {
      el('cmsAddError').textContent = 'Key hanya boleh huruf, angka, titik, underscore, strip (tanpa spasi).';
      return;
    }
    if (!value.trim()) {
      el('cmsAddError').textContent = 'Isi teksnya jangan kosong.';
      return;
    }
    el('cmsAddBtn').disabled = true;
    try {
      await api('/api/admin/cms/content', { method: 'PATCH', body: JSON.stringify({ updates: { [key]: value } }) });
      el('cmsNewKey').value = '';
      el('cmsNewValue').value = '';
      showToast('Konten ditambahkan.');
      loadCms();
    } catch (e) {
      if (e.message !== 'unauthorized') el('cmsAddError').textContent = 'Gagal menambah konten (mungkin key sudah ada / tidak valid).';
    } finally {
      el('cmsAddBtn').disabled = false;
    }
  });

  async function loadCms() {
    if (!CMS_ENABLED) return;
    const token = ++cmsRequestToken;
    const wrap = el('cmsListWrap');
    wrap.innerHTML = '<div class="empty-state">Memuat...</div>';
    try {
      const data = await api('/api/admin/cms/content');
      if (token !== cmsRequestToken) return;
      const keys = Object.keys(data.content).sort();
      if (!keys.length) {
        wrap.innerHTML = '<div class="empty-state">Belum ada konten. Tambahkan lewat form di atas.</div>';
      } else {
        wrap.innerHTML = keys.map((key) => {
          const entry = data.content[key];
          return `
            <div class="cms-row" data-key="${escapeHtml(key)}">
              <div class="cms-key">${escapeHtml(key)}</div>
              <textarea data-original="${escapeHtml(entry.value)}">${escapeHtml(entry.value)}</textarea>
              <div class="cms-meta">Terakhir diubah: ${formatDate(entry.updatedAt)}</div>
              <div class="cms-actions">
                <button class="secondary cms-save-btn" disabled>Simpan</button>
                <button class="danger cms-delete-btn">Hapus</button>
              </div>
            </div>
          `;
        }).join('');

        wrap.querySelectorAll('.cms-row').forEach((row) => {
          const key = row.dataset.key;
          const textarea = row.querySelector('textarea');
          const saveBtn = row.querySelector('.cms-save-btn');
          const deleteBtn = row.querySelector('.cms-delete-btn');

          textarea.addEventListener('input', () => {
            saveBtn.disabled = textarea.value === textarea.dataset.original;
          });

          saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            try {
              await api('/api/admin/cms/content', { method: 'PATCH', body: JSON.stringify({ updates: { [key]: textarea.value } }) });
              textarea.dataset.original = textarea.value;
              showToast('Konten "' + key + '" disimpan.');
            } catch (e) {
              if (e.message !== 'unauthorized') { showToast('Gagal menyimpan.'); saveBtn.disabled = false; }
            }
          });

          deleteBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction(`Hapus konten "${key}"? Aplikasi akan pakai teks default lagi setelah ini.`, 'Hapus Konten');
            if (!confirmed) return;
            try {
              await api('/api/admin/cms/content/' + encodeURIComponent(key), { method: 'DELETE' });
              showToast('Konten dihapus.');
              loadCms();
            } catch (e) {
              if (e.message !== 'unauthorized') showToast('Gagal menghapus.');
            }
          });
        });
      }

      try {
        const auditData = await api('/api/admin/cms/audit-log');
        if (token !== cmsRequestToken) return;
        el('cmsAuditList').innerHTML = auditData.entries.length
          ? auditData.entries.slice(0, 10).map((e) => `
              <div class="mini-item">
                <div>
                  <div class="mini-main">${escapeHtml(e.key)}</div>
                  <div class="mini-sub">${formatDate(e.at)}</div>
                </div>
              </div>
            `).join('')
          : '<div class="empty-state">Belum ada perubahan.</div>';
      } catch (e) {
        if (e.message !== 'unauthorized') el('cmsAuditList').innerHTML = '<div class="empty-state">Gagal memuat riwayat.</div>';
      }
    } catch (e) {
      if (token !== cmsRequestToken) return;
      if (e.message !== 'unauthorized') wrap.innerHTML = '<div class="empty-state">Gagal memuat konten.</div>';
    }
  }

  // ---- HELPERS ----
  function formatDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleString('id-ID'); } catch { return iso; }
  }
  function formatCurrency(amount) {
    const n = Number(amount);
    if (Number.isNaN(n)) return String(amount);
    return n.toLocaleString('id-ID');
  }
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---- INIT ----
  (async function init() {
    try {
      await api('/api/admin/me');
      showApp();
    } catch (e) {
      showLogin();
    }
  })();
})();
