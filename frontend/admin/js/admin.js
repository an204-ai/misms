/**
 * CloudSms Admin Dashboard - Core Application Script
 * 43toWeb Standard Live Visual Inline Website Editor & System Engine
 */

// Global State
let currentTab = 'liveEditor';
let currentFilename = 'index.html';
let currentViewport = 'desktop';

let contactsData = [];
let currentUser = null;
let mediaLibraryList = [];
let currentMediaCategory = 'all';
let mediaSearchQuery = '';
let selectedMediaItem = null;
let availablePagesList = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initLiveEditor();
    initMediaLibraryEvents();
    initContactsEvents();
    initAccountEvents();
});

/* ==============================================================================
   1. AUTHENTICATION & SESSION
   ============================================================================== */
function initAuth() {
    const token = getAuthToken();
    const userStr = localStorage.getItem('cloudsms_admin_user');

    if (!token || !userStr) {
        redirectToLogin();
        return;
    }

    try {
        currentUser = JSON.parse(userStr);
        updateUserUI();
        loadInitialData();

        // Validate token with server in background
        authFetch('/auth/profile').catch(() => {
            // handleSessionExpired will trigger on 401
        });
    } catch (e) {
        redirectToLogin();
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?')) {
                clearAuthSession();
                currentUser = null;
                redirectToLogin();
            }
        });
    }
}

function handleSessionExpired() {
    clearAuthSession();
    currentUser = null;
    redirectToLogin();
}

function redirectToLogin() {
    window.location.replace('login.html');
}

function updateUserUI() {
    if (currentUser) {
        const topbarName = document.getElementById('topbarAdminName');
        if (topbarName) topbarName.innerText = currentUser.username || 'admin';
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
            closeMobileSidebar();
        });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active', isOpen);
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
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
        liveEditor: { title: 'Xem & Quản Lý Trang Web', desc: 'Xem trước giao diện website và mở trình chỉnh sửa trực quan' },
        mediaLibrary: { title: 'Quản Lý Thư Viện Hình Ảnh', desc: 'Xem, tải lên, tìm kiếm và quản lý kho tài nguyên hình ảnh website' },
        contacts: { title: 'Hộp Thư Khách Hàng', desc: 'Danh sách và trạng thái xử lý các yêu cầu tư vấn & báo giá' },
        account: { title: 'Đổi Mật Khẩu Đăng Nhập', desc: 'Bảo mật và cập nhật mật khẩu quản trị viên hệ thống CloudSms' }
    };

    if (titles[tabName]) {
        document.getElementById('currentSectionTitle').innerText = titles[tabName].title;
        document.getElementById('currentSectionDesc').innerText = titles[tabName].desc;
    }

    if (tabName === 'mediaLibrary') {
        loadMediaLibrary();
    } else if (tabName === 'contacts') {
        loadContacts();
    }
}

/* ==============================================================================
   3. WEBSITE PAGE PREVIEW & EDITOR LAUNCHER
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
        liveFrame.addEventListener('load', () => {
            try {
                const pathname = liveFrame.contentWindow.location.pathname;
                const loadedFile = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
                if (loadedFile && loadedFile.endsWith('.html')) {
                    currentFilename = loadedFile;
                    if (selectPage && selectPage.value !== currentFilename) {
                        selectPage.value = currentFilename;
                    }
                    const externalBtn = document.getElementById('btnPreviewExternal');
                    if (externalBtn) externalBtn.href = `../${currentFilename}`;
                }
            } catch (err) {
                console.warn('Iframe nav sync:', err);
            }
        });
        liveFrame.src = `../${currentFilename}?t=${Date.now()}`;
    }
}

async function loadPagesList() {
    try {
        const { ok, data } = await authFetch('/html-pages');
        if (ok && data.success && Array.isArray(data.data)) {
            availablePagesList = data.data;
            populatePageDropdowns(availablePagesList);
        }
    } catch (e) {
        console.warn('Cannot fetch dynamic page list, keeping static fallback.');
    }
}

function populatePageDropdowns(pages) {
    const selectPage = document.getElementById('selectLivePage');
    if (!selectPage || !pages.length) return;

    const currentVal = selectPage.value || currentFilename;
    selectPage.innerHTML = pages.map(p => `
        <option value="${escapeHtml(p.filename)}" ${p.filename === currentVal ? 'selected' : ''}>
            ${escapeHtml(p.name)}
        </option>
    `).join('');
}

function loadLivePage(filename) {
    currentFilename = filename;
    switchAdminTab('liveEditor');

    const select = document.getElementById('selectLivePage');
    if (select) select.value = filename;

    const externalBtn = document.getElementById('btnPreviewExternal');
    if (externalBtn) externalBtn.href = `../${filename}`;

    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame) {
        liveFrame.src = `../${filename}?t=${Date.now()}`;
    }
}

function reloadLiveFrame() {
    loadLivePage(currentFilename);
    showToast(`Đã tải lại trang ${currentFilename}`, 'info');
}

function openPageEditorInNewTab() {
    const editUrl = `editor.html?page=${encodeURIComponent(currentFilename)}`;
    window.open(editUrl, '_blank');
    showToast(`Đang mở trình chỉnh sửa cho trang "${currentFilename}" trong tab mới...`, 'info');
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

/* ==============================================================================
   4. DATA LOADING & DASHBOARD METRICS
   ============================================================================== */
async function loadInitialData() {
    await Promise.allSettled([
        loadPagesList(),
        loadContacts(),
        loadLivePage(currentFilename)
    ]);
}

async function loadContacts() {
    try {
        const { ok, data } = await authFetch('/contacts');
        if (ok && data.success) {
            contactsData = data.data || [];
            updateDashboardMetrics();
            renderRecentContactsTable();
            renderFullContactsTable();
        } else {
            showToast(data.message || 'Không thể nạp danh sách liên hệ!', 'error');
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
                    <div class="lead-avatar">${escapeHtml(getInitials(c.name))}</div>
                    <div class="lead-info">
                        <span class="lead-name">${escapeHtml(c.name)}</span>
                        <span class="lead-id-tag">#${escapeHtml(c.id.replace('ct_', ''))}</span>
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
                    <span class="lead-time">${escapeHtml(getTimeStr(c.createdAt))}</span>
                    <span class="lead-date">${escapeHtml(getDateStr(c.createdAt))}</span>
                </div>
            </td>
            <td><span class="status-select-styled ${escapeHtml(c.status)}">${escapeHtml(getStatusLabel(c.status))}</span></td>
            <td>
                <button type="button" class="btn btn-sm btn-primary-soft" onclick="switchAdminTab('contacts')">
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
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-table-state"><i class="fa fa-inbox empty-table-icon"></i><span class="empty-table-text">Không có tin nhắn liên hệ nào phù hợp bộ lọc.</span></div></td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr id="row_${escapeHtml(c.id)}">
            <td>
                <div class="lead-user-cell">
                    <div class="lead-avatar">${escapeHtml(getInitials(c.name))}</div>
                    <div class="lead-info">
                        <span class="lead-name">${escapeHtml(c.name)}</span>
                        <span class="lead-id-tag">#${escapeHtml(c.id.replace('ct_', ''))}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="lead-contact-cell">
                    ${c.phone ? `<a href="tel:${escapeHtml(c.phone)}" class="contact-pill phone" title="Bấm để gọi điện"><i class="fa fa-phone"></i> ${escapeHtml(c.phone)}</a>` : '<span class="text-muted">—</span>'}
                    ${c.email ? `<a href="mailto:${escapeHtml(c.email)}" class="contact-pill email" title="Bấm để gửi email"><i class="fa fa-envelope-o"></i> ${escapeHtml(c.email)}</a>` : ''}
                </div>
            </td>
            <td>
                <div class="lead-msg-box">
                    <div class="lead-subject"><i class="fa fa-tag text-primary"></i> ${escapeHtml(c.subject || 'Yêu cầu tư vấn dịch vụ')}</div>
                    <div class="lead-msg-text">${escapeHtml(c.message || 'Khách hàng quan tâm đến giải pháp CloudSms.')}</div>
                </div>
            </td>
            <td>
                <div class="lead-date-cell">
                    <span class="lead-time"><i class="fa fa-clock-o text-muted"></i> ${escapeHtml(getTimeStr(c.createdAt))}</span>
                    <span class="lead-date"><i class="fa fa-calendar-o text-muted"></i> ${escapeHtml(getDateStr(c.createdAt))}</span>
                </div>
            </td>
            <td>
                <div class="status-select-wrap">
                    <select class="status-select-styled ${escapeHtml(c.status)}" onchange="changeContactStatus('${escapeHtml(c.id)}', this.value, this)">
                        <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                        <option value="processing" ${c.status === 'processing' ? 'selected' : ''}>Đang tư vấn</option>
                        <option value="completed" ${c.status === 'completed' ? 'selected' : ''}>Đã hoàn tất</option>
                    </select>
                </div>
            </td>
            <td>
                <input type="text" class="lead-note-input" placeholder="Ghi chú CSKH..." value="${escapeHtml(c.notes || '')}" onblur="saveContactNotes('${escapeHtml(c.id)}', this.value)">
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn-action-delete" onclick="deleteContactLead('${escapeHtml(c.id)}')" title="Xóa liên hệ này">
                    <i class="fa fa-trash-o"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function changeContactStatus(id, newStatus, selectEl) {
    try {
        const { ok, data } = await authFetch(`/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        if (ok && data.success) {
            const item = contactsData.find(c => c.id === id);
            if (item) item.status = newStatus;
            if (selectEl) {
                selectEl.className = `status-select-styled ${newStatus}`;
            }
            updateDashboardMetrics();
            showToast('Đã cập nhật trạng thái liên hệ!', 'success');
        } else {
            showToast(data.message || 'Lỗi khi cập nhật trạng thái!', 'error');
        }
    } catch (err) {
        showToast('Lỗi khi cập nhật trạng thái!', 'error');
    }
}

async function saveContactNotes(id, notes) {
    try {
        const { ok, data } = await authFetch(`/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ notes })
        });
        if (ok && data.success) {
            const item = contactsData.find(c => c.id === id);
            if (item) item.notes = notes;
            showToast('Đã lưu ghi chú CSKH!', 'info');
        }
    } catch (err) {
        console.error('Error saving contact notes:', err);
    }
}

async function deleteContactLead(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa tin nhắn liên hệ này khỏi hệ thống?')) return;

    try {
        const { ok, data } = await authFetch(`/contacts/${id}`, {
            method: 'DELETE'
        });
        if (ok && data.success) {
            contactsData = contactsData.filter(c => c.id !== id);
            updateDashboardMetrics();
            renderRecentContactsTable();
            renderFullContactsTable();
            showToast('Đã xóa liên hệ thành công!', 'success');
        } else {
            showToast(data.message || 'Không thể xóa liên hệ!', 'error');
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
   5. ACCOUNT SECURITY / CHANGE PASSWORD
   ============================================================================== */
function initAccountEvents() {
    // Password visibility toggles
    const toggleBtns = document.querySelectorAll('.btn-toggle-pwd');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                const isPassword = targetInput.type === 'password';
                targetInput.type = isPassword ? 'text' : 'password';
                btn.innerHTML = isPassword ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
            }
        });
    });

    // Reset button
    const btnReset = document.getElementById('btnResetPasswordForm');
    const form = document.getElementById('formChangePassword');
    if (btnReset && form) {
        btnReset.addEventListener('click', () => {
            form.reset();
        });
    }

    // Change Password Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('accCurrentPassword').value;
            const newPassword = document.getElementById('accNewPassword').value;
            const confirmPassword = document.getElementById('accConfirmPassword').value;

            if (!currentPassword) {
                showToast('Vui lòng nhập mật khẩu hiện tại!', 'warning');
                return;
            }

            if (!newPassword) {
                showToast('Vui lòng nhập mật khẩu mới!', 'warning');
                return;
            }

            if (newPassword.length < 6) {
                showToast('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'warning');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('Mật khẩu mới và xác nhận mật khẩu không khớp!', 'error');
                return;
            }

            if (newPassword === currentPassword) {
                showToast('Mật khẩu mới không được trùng với mật khẩu hiện tại!', 'warning');
                return;
            }

            const submitBtn = document.getElementById('btnSubmitChangePassword');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang cập nhật...';

            try {
                const { ok, data } = await authFetch('/auth/profile', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
                });

                if (ok && data.success) {
                    showToast(data.message || 'Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới.', 'success');
                    form.reset();
                } else {
                    showToast(data.message || 'Không thể đổi mật khẩu!', 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối tới máy chủ khi đổi mật khẩu!', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa fa-check-circle"></i> Xác Nhận Đổi Mật Khẩu';
            }
        });
    }
}

function getStatusLabel(status) {
    if (status === 'pending') return 'Chờ xử lý';
    if (status === 'processing') return 'Đang tư vấn';
    if (status === 'completed') return 'Đã hoàn tất';
    return status;
}

/* ==============================================================================
   6. MEDIA LIBRARY IMPLEMENTATION
   ============================================================================== */
function initMediaLibraryEvents() {
    // Category Filter Pills
    const catButtons = document.querySelectorAll('#mediaCategoriesContainer .btn-cat-pill');
    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMediaCategory = btn.getAttribute('data-category');
            renderMediaGrid();
        });
    });

    // Search Box
    const searchInput = document.getElementById('mediaSearchInput');
    const clearBtn = document.getElementById('btnClearMediaSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            mediaSearchQuery = e.target.value.trim().toLowerCase();
            if (clearBtn) clearBtn.style.display = mediaSearchQuery ? 'block' : 'none';
            renderMediaGrid();
        });
    }
    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            mediaSearchQuery = '';
            clearBtn.style.display = 'none';
            renderMediaGrid();
        });
    }

    // Trigger Upload button & Dropzone
    const triggerBtn = document.getElementById('btnTriggerUpload');
    const fileInput = document.getElementById('mediaFileInput');
    const dropzone = document.getElementById('mediaDropzone');
    const dropzoneTrigger = document.getElementById('dropzoneTrigger');

    if (triggerBtn && fileInput) {
        triggerBtn.addEventListener('click', () => fileInput.click());
    }
    if (dropzoneTrigger && fileInput) {
        dropzoneTrigger.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleMediaUpload(Array.from(e.target.files));
                fileInput.value = '';
            }
        });
    }

    // Drag and Drop
    if (dropzone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });
        });
        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                handleMediaUpload(Array.from(dt.files));
            }
        });
    }

    // Refresh Button
    const refreshBtn = document.getElementById('btnRefreshMedia');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadMediaLibrary(true);
        });
    }

    // Modal Delete Button
    const btnModalDelete = document.getElementById('btnModalDeleteMedia');
    if (btnModalDelete) {
        btnModalDelete.addEventListener('click', () => {
            if (selectedMediaItem) {
                deleteMediaItem(selectedMediaItem.relativePath);
            }
        });
    }
}

async function loadMediaLibrary(showNotification = false) {
    try {
        const { ok, data } = await authFetch('/media');
        if (ok && data.success) {
            mediaLibraryList = data.data || [];
            const meta = data.meta || {};

            const countBadge = document.getElementById('mediaTotalCountBadge');
            const sizeBadge = document.getElementById('mediaTotalSizeBadge');
            const totalBadge = document.getElementById('totalMediaBadge');

            if (countBadge) countBadge.innerHTML = `<i class="fa fa-image"></i> ${meta.totalFiles || 0} ảnh`;
            if (sizeBadge) sizeBadge.innerHTML = `<i class="fa fa-database"></i> ${meta.totalSizeFormatted || '0 MB'}`;
            if (totalBadge) {
                totalBadge.innerText = meta.totalFiles || 0;
                totalBadge.style.display = meta.totalFiles ? 'inline-block' : 'none';
            }

            if (meta.categories) {
                for (const [cat, count] of Object.entries(meta.categories)) {
                    const el = document.getElementById(`catCount-${cat}`);
                    if (el) el.innerText = count;
                }
            }

            renderMediaGrid();

            if (showNotification) {
                showToast(`Đã làm mới thư viện: ${mediaLibraryList.length} ảnh`, 'info');
            }
        } else {
            showToast(data.message || 'Không thể tải danh sách hình ảnh!', 'error');
        }
    } catch (err) {
        console.error('Failed to load media library:', err);
    }
}

function renderMediaGrid() {
    const grid = document.getElementById('mediaGrid');
    const emptyState = document.getElementById('mediaEmptyState');
    if (!grid) return;

    let filtered = mediaLibraryList.filter(item => {
        const matchCategory = currentMediaCategory === 'all' || item.category === currentMediaCategory;
        const matchSearch = !mediaSearchQuery || 
            item.filename.toLowerCase().includes(mediaSearchQuery) || 
            item.relativePath.toLowerCase().includes(mediaSearchQuery);
        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = filtered.map(item => `
        <div class="media-card" data-id="${escapeHtml(item.id)}">
            <div class="media-card-thumb" data-action="view-detail" data-id="${escapeHtml(item.id)}" title="Nhấp để xem chi tiết">
                <span class="media-category-badge">${escapeHtml(item.category)}</span>
                <img src="../${escapeHtml(item.relativePath)}" alt="${escapeHtml(item.filename)}" loading="lazy" onerror="this.src='../images/upload/logo.png'">
            </div>
            <div class="media-card-info">
                <div class="media-card-name" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div>
                <div class="media-card-meta">
                    <span>${escapeHtml(item.sizeFormatted)}</span>
                    <span>${escapeHtml(formatShortDate(item.modifiedAt))}</span>
                </div>
                <div class="media-card-actions">
                    <button type="button" class="btn-action copy" data-action="copy-path" data-path="${escapeHtml(item.relativePath)}" title="Sao chép đường dẫn ảnh">
                        <i class="fa fa-copy"></i> Sao Chép
                    </button>
                    <button type="button" class="btn-action view" data-action="view-detail" data-id="${escapeHtml(item.id)}" title="Xem chi tiết">
                        <i class="fa fa-search-plus"></i>
                    </button>
                    <button type="button" class="btn-action delete" data-action="delete" data-path="${escapeHtml(item.relativePath)}" title="Xóa ảnh">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Event delegation for grid actions
    grid.onclick = (e) => {
        const targetBtn = e.target.closest('[data-action]');
        if (!targetBtn) return;
        const action = targetBtn.getAttribute('data-action');
        if (action === 'copy-path') {
            const path = targetBtn.getAttribute('data-path');
            copyTextToClipboard(path, `Đã sao chép: ${path}`);
        } else if (action === 'view-detail') {
            const id = targetBtn.getAttribute('data-id');
            openMediaDetailModal(id);
        } else if (action === 'delete') {
            const path = targetBtn.getAttribute('data-path');
            deleteMediaItem(path);
        }
    };
}

async function handleMediaUpload(files) {
    if (!files || files.length === 0) return;

    const progressBox = document.getElementById('uploadProgressBox');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');

    if (progressBox) progressBox.style.display = 'block';

    let successCount = 0;
    let failCount = 0;
    let lastErrMsg = '';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const percent = Math.round(((i + 1) / files.length) * 100);

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.innerText = `Đang tải ảnh ${i + 1}/${files.length}: ${file.name}...`;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { ok, data } = await authFetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (ok && data.success) {
                successCount++;
            } else {
                failCount++;
                lastErrMsg = data.message || 'Lỗi tải tệp';
            }
        } catch (err) {
            failCount++;
            lastErrMsg = 'Lỗi kết nối máy chủ';
        }
    }

    setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (successCount > 0) {
            showToast(`Tải lên thành công ${successCount} hình ảnh mới!`, 'success');
            loadMediaLibrary();
        }
        if (failCount > 0) {
            showToast(`Có ${failCount} ảnh tải lên thất bại: ${lastErrMsg}`, 'error');
        }
    }, 400);
}

function openMediaDetailModal(idOrPath) {
    const item = mediaLibraryList.find(m => m.id === idOrPath || m.relativePath === idOrPath);
    if (!item) return;

    selectedMediaItem = item;

    const modal = document.getElementById('mediaDetailModal');
    const img = document.getElementById('mediaModalImg');
    const filename = document.getElementById('mediaModalFilename');
    const category = document.getElementById('mediaModalCategory');
    const size = document.getElementById('mediaModalSize');
    const date = document.getElementById('mediaModalDate');
    const relPath = document.getElementById('mediaModalRelativePath');

    if (img) img.src = '../' + item.relativePath;
    if (filename) filename.innerText = item.filename;
    if (category) category.innerText = item.category;
    if (size) size.innerText = item.sizeFormatted;
    if (date) date.innerText = formatDate(item.modifiedAt);
    if (relPath) relPath.value = item.relativePath;

    if (modal) modal.style.display = 'flex';
}

function closeMediaDetailModal() {
    const modal = document.getElementById('mediaDetailModal');
    if (modal) modal.style.display = 'none';
    selectedMediaItem = null;
}

function copyPathFromModal() {
    const relPath = document.getElementById('mediaModalRelativePath');
    if (relPath && relPath.value) {
        copyTextToClipboard(relPath.value, `Đã sao chép: ${relPath.value}`);
    }
}

async function deleteMediaItem(relativePath) {
    if (!relativePath) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn file ảnh:\n"${relativePath}"?\n\nLưu ý: Nếu trang web đang sử dụng ảnh này thì ảnh sẽ không hiển thị được nữa.`)) {
        return;
    }

    try {
        const { ok, data } = await authFetch('/media', {
            method: 'DELETE',
            body: JSON.stringify({ relativePath })
        });

        if (ok && data.success) {
            showToast(`Đã xóa ảnh "${relativePath}" thành công!`, 'success');
            closeMediaDetailModal();
            loadMediaLibrary();
        } else {
            showToast(data.message || 'Lỗi khi xóa ảnh!', 'error');
        }
    } catch (err) {
        showToast('Không thể kết nối API để xóa ảnh!', 'error');
    }
}
