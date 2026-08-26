/**
 * CloudSms Admin Dashboard - Core Application Script
 * 43toWeb Standard Live Visual Inline Website Editor & System Engine
 */

const API_BASE = 'http://localhost:5000/api';

// Global State
let currentTab = 'liveEditor';
let currentFilename = 'index.html';
let editorMode = 'visual'; // 'visual' | 'code'
let currentViewport = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
let selectedImgElement = null;

let settingsData = {};
let contactsData = [];
let currentUser = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initLiveEditor();
    initSettingsEvents();
    initContactsEvents();
    initAccountEvents();
});

/* ==============================================================================
   1. AUTHENTICATION & SESSION
   ============================================================================== */
function initAuth() {
    const token = localStorage.getItem('cloudsms_admin_token');
    const userStr = localStorage.getItem('cloudsms_admin_user');

    if (token && userStr) {
        try {
            currentUser = JSON.parse(userStr);
            document.getElementById('loginOverlay').classList.remove('active');
            updateUserUI();
            loadInitialData();
        } catch (e) {
            showLogin();
        }
    } else {
        showLogin();
    }

    // Toggle password visibility
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const passInput = document.getElementById('loginPassword');
    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passInput.type === 'password';
            passInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
        });
    }

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            const submitBtn = document.getElementById('loginSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xác thực...';

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('cloudsms_admin_token', data.token);
                    localStorage.setItem('cloudsms_admin_user', JSON.stringify(data.admin));
                    currentUser = data.admin;
                    document.getElementById('loginOverlay').classList.remove('active');
                    updateUserUI();
                    showToast('Đăng nhập thành công!', 'success');
                    loadInitialData();
                } else {
                    showToast(data.message || 'Sai thông tin đăng nhập!', 'error');
                }
            } catch (err) {
                showToast('Không thể kết nối đến Backend API! Hãy chắc chắn server Node.js đang chạy trên cổng 5000.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa fa-sign-in"></i> Đăng Nhập Vào Hệ Thống';
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?')) {
                localStorage.removeItem('cloudsms_admin_token');
                localStorage.removeItem('cloudsms_admin_user');
                currentUser = null;
                showLogin();
                showToast('Đã đăng xuất an toàn.', 'info');
            }
        });
    }
}

function showLogin() {
    document.getElementById('loginOverlay').classList.add('active');
}

function updateUserUI() {
    if (currentUser) {
        document.getElementById('topbarAdminName').innerText = currentUser.name || currentUser.username;
        const accName = document.getElementById('accName');
        const accEmail = document.getElementById('accEmail');
        if (accName) accName.value = currentUser.name || '';
        if (accEmail) accEmail.value = currentUser.email || '';
    }
}

/* ==============================================================================
   2. NAVIGATION & TABS
   ============================================================================== */
function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            switchAdminTab(tab);
        });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('adminSidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function switchAdminTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    const titles = {
        liveEditor: { title: 'Chỉnh Sửa Trực Tiếp Trang Web', desc: 'Click trực tiếp vào chữ và hình ảnh trên trang web để sửa theo thời gian thực' },
        contacts: { title: 'Hộp Thư Khách Hàng', desc: 'Danh sách và trạng thái xử lý các yêu cầu tư vấn & báo giá' },
        account: { title: 'Tài Khoản Quản Trị', desc: 'Cập nhật thông tin cá nhân và đổi mật khẩu đăng nhập' }
    };

    if (titles[tabName]) {
        document.getElementById('currentSectionTitle').innerText = titles[tabName].title;
        document.getElementById('currentSectionDesc').innerText = titles[tabName].desc;
    }

    if (tabName === 'contacts') {
        loadContacts();
    }
}

/* ==============================================================================
   3. 43toWeb LIVE VISUAL WEBSITE EDITOR
   ============================================================================== */
function initLiveEditor() {
    const selectPage = document.getElementById('selectLivePage');
    if (selectPage) {
        selectPage.addEventListener('change', (e) => {
            loadLivePage(e.target.value);
        });
    }

    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame) {
        liveFrame.addEventListener('load', onLiveFrameLoaded);
    }

    // Modal Image File upload
    const modalImgFileInput = document.getElementById('modalImgFileInput');
    if (modalImgFileInput) {
        modalImgFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            showToast('Đang tải ảnh lên...', 'info');

            try {
                const res = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                if (result.success) {
                    document.getElementById('modalImgSrcInput').value = result.url;
                    document.getElementById('modalImgPreview').src = '../' + result.url;
                    showToast('Tải ảnh mới lên thành công!', 'success');
                } else {
                    showToast(result.message || 'Lỗi tải ảnh', 'error');
                }
            } catch (err) {
                showToast('Không thể upload ảnh lên server!', 'error');
            }
        });
    }
}

function loadLivePage(filename) {
    currentFilename = filename;
    switchAdminTab('liveEditor');

    const select = document.getElementById('selectLivePage');
    if (select) select.value = filename;

    const externalBtn = document.getElementById('btnPreviewExternal');
    if (externalBtn) externalBtn.href = `../${filename}`;

    const codeFilename = document.getElementById('codeEditorFilename');
    if (codeFilename) codeFilename.innerText = filename;

    // Load iframe
    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame) {
        liveFrame.src = `../${filename}?t=${Date.now()}`;
    }

    // Load source code for textarea
    fetchRawHtmlForCodeEditor(filename);
}

async function fetchRawHtmlForCodeEditor(filename) {
    try {
        const res = await fetch(`${API_BASE}/html-pages/${filename}`);
        const result = await res.json();
        if (result.success) {
            document.getElementById('rawHtmlTextarea').value = result.content;
        }
    } catch (err) {
        console.error('Error loading HTML source:', err);
    }
}

let isLiveEditActive = true;

function toggleInlineEditState(isActive) {
    isLiveEditActive = isActive;

    const statusBadge = document.getElementById('editModeStatusText');
    const group = document.querySelector('.edit-toggle-switch-group');

    if (statusBadge) {
        statusBadge.innerText = isActive ? 'ĐANG BẬT' : 'ĐÃ TẮT';
        statusBadge.className = `badge-status-edit ${isActive ? 'active' : 'inactive'}`;
    }

    if (group) {
        group.classList.toggle('disabled-state', !isActive);
    }

    applyEditStateToIframe(isActive);

    if (isActive) {
        showToast('Đã BẬT chế độ sửa. Bạn có thể click trực tiếp vào chữ trên trang để sửa!', 'success');
    } else {
        showToast('Đã TẮT chế độ sửa (Chuyển sang chế độ xem trước khách hàng).', 'info');
    }
}

function onLiveFrameLoaded() {
    applyEditStateToIframe(isLiveEditActive);
    updateRawTextareaFromFrame();
}

function applyEditStateToIframe(isActive) {
    const liveFrame = document.getElementById('liveFrame');
    if (!liveFrame || !liveFrame.contentDocument) return;

    const doc = liveFrame.contentDocument;

    // 1. Injected Visual Editor Style
    let injectedStyle = doc.getElementById('live-editor-injected-style');
    if (isActive) {
        if (!injectedStyle) {
            injectedStyle = doc.createElement('style');
            injectedStyle.id = 'live-editor-injected-style';
            injectedStyle.innerHTML = `
                [contenteditable="true"] {
                    outline: none !important;
                    transition: outline 0.15s ease, background 0.15s ease !important;
                    cursor: text !important;
                }
                [contenteditable="true"]:hover {
                    outline: 1.5px dashed #0284c7 !important;
                    outline-offset: 2px !important;
                    background-color: rgba(2, 132, 199, 0.05) !important;
                }
                [contenteditable="true"]:focus {
                    outline: 2px solid #f97316 !important;
                    outline-offset: 2px !important;
                    background-color: rgba(249, 115, 22, 0.06) !important;
                    box-shadow: 0 0 8px rgba(249, 115, 22, 0.25) !important;
                }
                img {
                    cursor: pointer !important;
                    transition: transform 0.2s, outline 0.2s !important;
                }
                img:hover {
                    outline: 2px solid #0284c7 !important;
                    outline-offset: 2px !important;
                }
            `;
            doc.head.appendChild(injectedStyle);
        }
    } else {
        if (injectedStyle) injectedStyle.remove();
    }

    // 2. Enable/Disable contenteditable on editable text elements
    const editableSelectors = 'h1, h2, h3, h4, h5, h6, p, a, button, td, th, b, strong, em, address, .btn, .pricing-plan-title';
    const elements = doc.querySelectorAll(editableSelectors);

    elements.forEach(el => {
        if (['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'IFRAME'].includes(el.tagName)) return;

        if (isActive) {
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');

            if (el.tagName === 'A') {
                el.onclick = (e) => {
                    if (isLiveEditActive) e.preventDefault();
                };
            }
        } else {
            el.removeAttribute('contenteditable');
            el.removeAttribute('spellcheck');
            if (el.tagName === 'A') {
                el.onclick = null;
            }
        }
    });

    // 3. Double click on images
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
        if (isActive) {
            img.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openImageEditModal(img);
            };
        } else {
            img.ondblclick = null;
        }
    });
}

function updateRawTextareaFromFrame() {
    const liveFrame = document.getElementById('liveFrame');
    if (!liveFrame || !liveFrame.contentDocument) return;

    const docClone = liveFrame.contentDocument.documentElement.cloneNode(true);
    const style = docClone.querySelector('#live-editor-injected-style');
    if (style) style.remove();
    docClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    docClone.querySelectorAll('[spellcheck]').forEach(el => el.removeAttribute('spellcheck'));

    const cleanHtml = '<!DOCTYPE html>\n' + docClone.outerHTML;
    const textarea = document.getElementById('rawHtmlTextarea');
    if (textarea && editorMode === 'visual') {
        textarea.value = cleanHtml;
    }
}

async function saveCurrentLiveHtml() {
    const btn = document.getElementById('btnSaveLiveHtml');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';

    let finalHtml = '';

    if (editorMode === 'visual') {
        const liveFrame = document.getElementById('liveFrame');
        if (!liveFrame || !liveFrame.contentDocument) {
            showToast('Không tìm thấy khung chỉnh sửa!', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa fa-save"></i> <strong>LƯU TRANG TRỰC TIẾP</strong>';
            return;
        }

        const docClone = liveFrame.contentDocument.documentElement.cloneNode(true);
        // Remove editor style
        const style = docClone.querySelector('#live-editor-injected-style');
        if (style) style.remove();

        // Clean contenteditable attributes
        docClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        docClone.querySelectorAll('[spellcheck]').forEach(el => el.removeAttribute('spellcheck'));

        finalHtml = '<!DOCTYPE html>\n' + docClone.outerHTML;
    } else {
        finalHtml = document.getElementById('rawHtmlTextarea').value;
    }

    try {
        const res = await fetch(`${API_BASE}/html-pages/${currentFilename}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: finalHtml })
        });
        const result = await res.json();

        if (result.success) {
            showToast(`Đã lưu và cập nhật trực tiếp trang "${currentFilename}" thành công!`, 'success');
            // If in code mode, reload visual frame
            if (editorMode === 'code') {
                reloadLiveFrame();
            }
        } else {
            showToast(result.message || 'Lỗi khi lưu trang!', 'error');
        }
    } catch (err) {
        showToast('Không thể kết nối đến Backend API để lưu trang!', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save"></i> <strong>LƯU TRANG TRỰC TIẾP</strong>';
    }
}

function reloadLiveFrame() {
    loadLivePage(currentFilename);
    showToast(`Đã tải lại trang ${currentFilename}`, 'info');
}

function setEditorMode(mode) {
    editorMode = mode;

    document.getElementById('btnModeVisual').classList.toggle('active', mode === 'visual');
    document.getElementById('btnModeCode').classList.toggle('active', mode === 'code');

    const viewportGroup = document.getElementById('viewportGroup');
    const visualBanner = document.getElementById('visualHintBanner');
    const canvasViewport = document.getElementById('canvasViewport');
    const sourceCodeWrap = document.getElementById('sourceCodeWrap');

    if (mode === 'visual') {
        viewportGroup.style.display = 'flex';
        visualBanner.style.display = 'block';
        canvasViewport.style.display = 'block';
        sourceCodeWrap.style.display = 'none';
        reloadLiveFrame();
    } else {
        viewportGroup.style.display = 'none';
        visualBanner.style.display = 'none';
        canvasViewport.style.display = 'none';
        sourceCodeWrap.style.display = 'flex';
        fetchRawHtmlForCodeEditor(currentFilename);
    }
}

function setLiveViewport(vp) {
    currentViewport = vp;
    const canvas = document.getElementById('canvasViewport');
    if (!canvas) return;

    canvas.className = `canvas-viewport ${vp}`;

    const buttons = document.querySelectorAll('#viewportGroup .btn-vp-toggle');
    buttons.forEach((btn, idx) => {
        btn.classList.toggle('active', 
            (vp === 'desktop' && idx === 0) ||
            (vp === 'tablet' && idx === 1) ||
            (vp === 'mobile' && idx === 2)
        );
    });
}

// Image Edit Modal
function openImageEditModal(imgEl) {
    selectedImgElement = imgEl;
    const modal = document.getElementById('imageEditModal');
    const input = document.getElementById('modalImgSrcInput');
    const preview = document.getElementById('modalImgPreview');

    const currentSrc = imgEl.getAttribute('src') || imgEl.src;
    input.value = currentSrc;
    preview.src = imgEl.src;

    input.oninput = () => {
        preview.src = input.value.startsWith('http') ? input.value : '../' + input.value;
    };

    modal.style.display = 'flex';
}

function closeImageEditModal() {
    document.getElementById('imageEditModal').style.display = 'none';
    selectedImgElement = null;
}

function applyImageModalChanges() {
    if (!selectedImgElement) return;
    const newSrc = document.getElementById('modalImgSrcInput').value.trim();
    if (newSrc) {
        selectedImgElement.setAttribute('src', newSrc);
        selectedImgElement.src = newSrc.startsWith('http') ? newSrc : '../' + newSrc;
        showToast('Đã đổi ảnh trực tiếp trên trang!', 'success');
    }
    closeImageEditModal();
}

/* ==============================================================================
   4. DATA LOADING & DASHBOARD METRICS
   ============================================================================== */
async function loadInitialData() {
    await Promise.all([
        loadContacts(),
        loadLivePage(currentFilename)
    ]);
}

async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        const result = await res.json();
        if (result.success) {
            settingsData = result.data;
            populateSettingsForm(settingsData);
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

async function loadContacts() {
    try {
        const res = await fetch(`${API_BASE}/contacts`);
        const result = await res.json();
        if (result.success) {
            contactsData = result.data;
            updateDashboardMetrics();
            renderRecentContactsTable();
            renderFullContactsTable();
        }
    } catch (err) {
        console.error('Error loading contacts:', err);
    }
}

function updateDashboardMetrics() {
    const total = contactsData.length;
    const pending = contactsData.filter(c => c.status === 'pending').length;
    const completed = contactsData.filter(c => c.status === 'completed').length;

    const totalEl = document.getElementById('statTotalContacts');
    const pendingEl = document.getElementById('statPendingContacts');
    const completedEl = document.getElementById('statCompletedContacts');

    if (totalEl) totalEl.innerText = total;
    if (pendingEl) pendingEl.innerText = pending;
    if (completedEl) completedEl.innerText = completed;

    const badge = document.getElementById('pendingContactsBadge');
    if (badge) {
        badge.innerText = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
}

function getInitials(name) {
    if (!name) return 'KH';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getTimeStr(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch(e) { return ''; }
}

function getDateStr(isoStr) {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) { return ''; }
}

function renderRecentContactsTable() {
    const tbody = document.querySelector('#dashboardRecentTable tbody');
    if (!tbody) return;

    const recents = contactsData.slice(0, 5);
    if (recents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Chưa có tin nhắn liên hệ nào từ khách hàng.</td></tr>`;
        return;
    }

    tbody.innerHTML = recents.map(c => `
        <tr>
            <td>
                <div class="lead-user-cell">
                    <div class="lead-avatar">${getInitials(c.name)}</div>
                    <div class="lead-info">
                        <span class="lead-name">${escapeHtml(c.name)}</span>
                        <span class="lead-id-tag">#${c.id.replace('ct_', '')}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="lead-contact-cell">
                    ${c.phone ? `<a href="tel:${escapeHtml(c.phone)}" class="contact-pill phone"><i class="fa fa-phone"></i> ${escapeHtml(c.phone)}</a>` : '<span class="text-muted">—</span>'}
                </div>
            </td>
            <td>
                <div class="lead-msg-box">
                    <div class="lead-subject"><i class="fa fa-tag text-primary"></i> ${escapeHtml(c.subject || 'Yêu cầu tư vấn')}</div>
                    <div class="lead-msg-text">${escapeHtml(c.message || '')}</div>
                </div>
            </td>
            <td>
                <div class="lead-date-cell">
                    <span class="lead-time">${getTimeStr(c.createdAt)}</span>
                    <span class="lead-date">${getDateStr(c.createdAt)}</span>
                </div>
            </td>
            <td><span class="status-select-styled ${c.status}">${getStatusLabel(c.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-primary-soft" onclick="switchAdminTab('contacts')">
                    <i class="fa fa-eye"></i> Xem Chi Tiết
                </button>
            </td>
        </tr>
    `).join('');
}

function renderFullContactsTable() {
    const tbody = document.getElementById('contactsTableBody');
    if (!tbody) return;

    const filter = document.getElementById('filterContactStatus')?.value || 'all';
    const filtered = contactsData.filter(c => filter === 'all' || c.status === filter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5"><i class="fa fa-inbox fa-3x d-block mb-3 text-light"></i>Không có tin nhắn liên hệ nào phù hợp bộ lọc.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr id="row_${c.id}">
            <!-- 1. Customer Column -->
            <td>
                <div class="lead-user-cell">
                    <div class="lead-avatar">${getInitials(c.name)}</div>
                    <div class="lead-info">
                        <span class="lead-name">${escapeHtml(c.name)}</span>
                        <span class="lead-id-tag">#${c.id.replace('ct_', '')}</span>
                    </div>
                </div>
            </td>

            <!-- 2. Contact Column (Phone & Email) -->
            <td>
                <div class="lead-contact-cell">
                    ${c.phone ? `<a href="tel:${escapeHtml(c.phone)}" class="contact-pill phone" title="Bấm để gọi điện"><i class="fa fa-phone"></i> ${escapeHtml(c.phone)}</a>` : '<span class="text-muted">—</span>'}
                    ${c.email ? `<a href="mailto:${escapeHtml(c.email)}" class="contact-pill email" title="Bấm để gửi email"><i class="fa fa-envelope-o"></i> ${escapeHtml(c.email)}</a>` : ''}
                </div>
            </td>

            <!-- 3. Subject & Message -->
            <td>
                <div class="lead-msg-box">
                    <div class="lead-subject"><i class="fa fa-tag text-primary"></i> ${escapeHtml(c.subject || 'Yêu cầu tư vấn dịch vụ')}</div>
                    <div class="lead-msg-text">${escapeHtml(c.message || 'Khách hàng quan tâm đến giải pháp CloudSms.')}</div>
                </div>
            </td>

            <!-- 4. Date Time -->
            <td>
                <div class="lead-date-cell">
                    <span class="lead-time"><i class="fa fa-clock-o text-muted"></i> ${getTimeStr(c.createdAt)}</span>
                    <span class="lead-date"><i class="fa fa-calendar-o text-muted"></i> ${getDateStr(c.createdAt)}</span>
                </div>
            </td>

            <!-- 5. Status Select -->
            <td>
                <div class="status-select-wrap">
                    <select class="status-select-styled ${c.status}" onchange="changeContactStatus('${c.id}', this.value, this)">
                        <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                        <option value="processing" ${c.status === 'processing' ? 'selected' : ''}>Đang tư vấn</option>
                        <option value="completed" ${c.status === 'completed' ? 'selected' : ''}>Đã hoàn tất</option>
                    </select>
                </div>
            </td>

            <!-- 6. CSKH Notes -->
            <td>
                <input type="text" class="lead-note-input" placeholder="Ghi chú CSKH..." value="${escapeHtml(c.notes || '')}" onblur="saveContactNotes('${c.id}', this.value)">
            </td>

            <!-- 7. Delete Action -->
            <td style="text-align: center;">
                <button type="button" class="btn-action-delete" onclick="deleteContactLead('${c.id}')" title="Xóa liên hệ này">
                    <i class="fa fa-trash-o"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function changeContactStatus(id, newStatus, selectEl) {
    try {
        const res = await fetch(`${API_BASE}/contacts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await res.json();
        if (result.success) {
            const item = contactsData.find(c => c.id === id);
            if (item) item.status = newStatus;
            if (selectEl) {
                selectEl.className = `status-select-styled ${newStatus}`;
            }
            updateDashboardMetrics();
            showToast('Đã cập nhật trạng thái liên hệ!', 'success');
        }
    } catch (err) {
        showToast('Lỗi khi cập nhật trạng thái!', 'error');
    }
}

async function saveContactNotes(id, notes) {
    try {
        const res = await fetch(`${API_BASE}/contacts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        const result = await res.json();
        if (result.success) {
            const item = contactsData.find(c => c.id === id);
            if (item) item.notes = notes;
            showToast('Đã lưu ghi chú CSKH!', 'info');
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteContactLead(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa tin nhắn liên hệ này khỏi hệ thống?')) return;

    try {
        const res = await fetch(`${API_BASE}/contacts/${id}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (result.success) {
            contactsData = contactsData.filter(c => c.id !== id);
            updateDashboardMetrics();
            renderRecentContactsTable();
            renderFullContactsTable();
            showToast('Đã xóa liên hệ thành công!', 'success');
        }
    } catch (err) {
        showToast('Không thể xóa liên hệ!', 'error');
    }
}

function initContactsEvents() {
    const filterSelect = document.getElementById('filterContactStatus');
    if (filterSelect) {
        filterSelect.addEventListener('change', renderFullContactsTable);
    }

    const btnRefresh = document.getElementById('btnRefreshContacts');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            loadContacts();
            showToast('Đã làm mới hộp thư liên hệ.', 'info');
        });
    }
}

/* ==============================================================================
   5. SETTINGS TAB LOGIC
   ============================================================================== */
function populateSettingsForm(s) {
    const setSiteName = document.getElementById('setSiteName');
    if (!setSiteName) return;

    setSiteName.value = s.siteName || '';
    document.getElementById('setCompanyName').value = s.companyName || '';
    document.getElementById('setSlogan').value = s.slogan || '';
    document.getElementById('setHotline').value = s.hotline || '';
    document.getElementById('setEmail').value = s.email || '';
    document.getElementById('setAddress').value = s.address || '';
    document.getElementById('setFacebook').value = s.facebookUrl || '';
    document.getElementById('setYoutube').value = s.youtubeUrl || '';
    document.getElementById('setZalo').value = s.zaloUrl || '';
    document.getElementById('setLogoUrl').value = s.logoUrl || 'images/upload/logo.png';

    const preview = document.getElementById('previewLogoImg');
    if (preview && s.logoUrl) {
        preview.src = '../' + s.logoUrl;
    }
}

function initSettingsEvents() {
    const btnSave = document.getElementById('btnSaveSettings');
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';

            const payload = {
                siteName: document.getElementById('setSiteName').value.trim(),
                companyName: document.getElementById('setCompanyName').value.trim(),
                slogan: document.getElementById('setSlogan').value.trim(),
                hotline: document.getElementById('setHotline').value.trim(),
                email: document.getElementById('setEmail').value.trim(),
                address: document.getElementById('setAddress').value.trim(),
                facebookUrl: document.getElementById('setFacebook').value.trim(),
                youtubeUrl: document.getElementById('setYoutube').value.trim(),
                zaloUrl: document.getElementById('setZalo').value.trim(),
                logoUrl: document.getElementById('setLogoUrl').value.trim()
            };

            try {
                const res = await fetch(`${API_BASE}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (result.success) {
                    settingsData = result.data;
                    showToast('Đã lưu và đồng bộ cài đặt website thành công!', 'success');
                } else {
                    showToast(result.message || 'Lỗi lưu cấu hình', 'error');
                }
            } catch (err) {
                showToast('Không thể kết nối API để lưu cấu hình!', 'error');
            } finally {
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fa fa-save"></i> Lưu Cấu Hình';
            }
        });
    }

    // Logo Upload
    const uploadInput = document.getElementById('uploadLogoFile');
    if (uploadInput) {
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            showToast('Đang tải ảnh logo lên...', 'info');

            try {
                const res = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                if (result.success) {
                    document.getElementById('setLogoUrl').value = result.url;
                    document.getElementById('previewLogoImg').src = '../' + result.url;
                    showToast('Tải logo mới lên thành công!', 'success');
                } else {
                    showToast(result.message || 'Lỗi upload ảnh', 'error');
                }
            } catch (err) {
                showToast('Không thể upload ảnh lên server!', 'error');
            }
        });
    }
}

/* ==============================================================================
   7. ACCOUNT PROFILE LOGIC
   ============================================================================== */
function initAccountEvents() {
    const form = document.getElementById('formAccount');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('accName').value.trim();
            const email = document.getElementById('accEmail').value.trim();
            const currentPassword = document.getElementById('accCurrentPassword').value.trim();
            const newPassword = document.getElementById('accNewPassword').value.trim();

            const btn = document.getElementById('btnSaveAccount');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang cập nhật...';

            try {
                const res = await fetch(`${API_BASE}/auth/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, currentPassword, newPassword })
                });
                const result = await res.json();
                if (result.success) {
                    currentUser = result.admin;
                    localStorage.setItem('cloudsms_admin_user', JSON.stringify(currentUser));
                    updateUserUI();
                    document.getElementById('accCurrentPassword').value = '';
                    document.getElementById('accNewPassword').value = '';
                    showToast('Cập nhật tài khoản quản trị viên thành công!', 'success');
                } else {
                    showToast(result.message || 'Lỗi cập nhật tài khoản', 'error');
                }
            } catch (err) {
                showToast('Không thể kết nối server để lưu thông tin!', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-save"></i> Cập Nhật Thông Tin Tài Khoản';
            }
        });
    }
}

/* ==============================================================================
   8. UTILITIES
   ============================================================================== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fa ${icon} toast-icon"></i>
        <div class="toast-msg">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function getStatusLabel(status) {
    if (status === 'pending') return 'Chờ xử lý';
    if (status === 'processing') return 'Đang tư vấn';
    if (status === 'completed') return 'Đã hoàn tất';
    return status;
}

function formatDate(isoStr) {
    if (!isoStr) return '—';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return isoStr;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
