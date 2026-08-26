/**
 * CloudSms Dedicated Visual Page Editor Script
 * Full-screen Visual Inline Website Editor Engine with Live Save Status & Session Protection
 */

// State
let currentFilename = 'index.html';
let editorMode = 'edit'; // 'edit' | 'preview'
let currentViewport = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
let selectedImgElement = null;
let isLiveEditActive = true;
let hasUnsavedChanges = false;
let editorMediaList = [];
let isSessionValid = true;

document.addEventListener('DOMContentLoaded', () => {
    initEditorPage();
    initBeforeUnloadWarning();
});

async function initEditorPage() {
    // 1. Parse URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
        currentFilename = pageParam;
    }

    // 2. Initial Auth Guard: Check token immediately
    const token = getAuthToken();
    if (!token) {
        handleSessionExpired();
        // Still load iframe in pure readonly view
        loadIframePreview();
        return;
    }

    // 3. Verify token with server
    try {
        const { ok } = await authFetch('/auth/profile');
        if (!ok) {
            handleSessionExpired();
            loadIframePreview();
            return;
        }
    } catch (e) {
        // authFetch handles 401 and calls handleSessionExpired()
        loadIframePreview();
        return;
    }

    // 4. If authenticated, load dynamic pages list for dropdown
    loadEditorPagesList();

    // 5. Select page dropdown listener
    const selectPage = document.getElementById('selectEditorPage');
    if (selectPage) {
        selectPage.value = currentFilename;
        selectPage.addEventListener('change', (e) => {
            if (hasUnsavedChanges) {
                if (!confirm('Bạn có thay đổi chưa lưu trên trang hiện tại. Bạn có chắc muốn chuyển trang khác không?')) {
                    selectPage.value = currentFilename;
                    return;
                }
            }
            const newPage = e.target.value;
            window.location.href = `editor.html?page=${encodeURIComponent(newPage)}`;
        });
    }

    // 6. Setup title
    document.title = `Chỉnh Sửa: ${currentFilename} | CloudSms™ Editor`;

    // 7. Load iframe and setup edit state
    loadIframePreview();

    // 8. Image upload listener
    initImageUpload();
}

function loadIframePreview() {
    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame) {
        liveFrame.addEventListener('load', onLiveFrameLoaded);
        liveFrame.src = `../${currentFilename}?t=${Date.now()}`;
    }
}

/**
 * Handle Session Expiration / Unauthorized
 * Hides editing toolbars, disables contenteditable, shows notification bar & modal
 */
function handleSessionExpired() {
    isSessionValid = false;
    isLiveEditActive = false;
    hasUnsavedChanges = false;
    clearAuthSession();

    // 1. Add session-expired class to body (CSS rule hides toolbar & subbar)
    document.body.classList.add('session-expired');

    // 2. Explicitly hide editing headers to ensure no flash
    const header = document.getElementById('editorHeader');
    const subbar = document.getElementById('visualHintBanner');
    if (header) header.style.display = 'none';
    if (subbar) subbar.style.display = 'none';

    // 3. Show compact expired top bar
    const expiredBar = document.getElementById('editorExpiredBar');
    if (expiredBar) expiredBar.style.display = 'flex';

    // 4. Show modal overlay prompt
    const overlay = document.getElementById('sessionExpiredOverlay');
    if (overlay) overlay.style.display = 'flex';

    // 5. Remove editing capabilities from iframe
    applyEditStateToIframe(false);

    showToast('Phiên làm việc đã hết hạn. Thanh công cụ chỉnh sửa đã được ẩn!', 'warning');
}

function dismissExpiredModal() {
    const overlay = document.getElementById('sessionExpiredOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function loadEditorPagesList() {
    try {
        const { ok, data } = await authFetch('/html-pages');
        if (ok && data.success && Array.isArray(data.data)) {
            const selectPage = document.getElementById('selectEditorPage');
            if (selectPage) {
                const currentVal = currentFilename;
                selectPage.innerHTML = data.data.map(p => `
                    <option value="${escapeHtml(p.filename)}" ${p.filename === currentVal ? 'selected' : ''}>
                        ${escapeHtml(p.name)}
                    </option>
                `).join('');
            }
        }
    } catch (e) {
        // Handled silently or by 401 guard
    }
}

function initBeforeUnloadWarning() {
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges && isSessionValid) {
            e.preventDefault();
            e.returnValue = 'Bạn có thay đổi chưa lưu trên trang!';
        }
    });
}

function updateSaveStatus(status) {
    const indicator = document.getElementById('saveStatusIndicator');
    const statusText = document.getElementById('saveStatusText');
    if (!indicator || !statusText) return;

    indicator.className = `save-status-indicator ${status}`;

    if (status === 'saved') {
        hasUnsavedChanges = false;
        statusText.innerText = 'Đã lưu mọi thay đổi';
    } else if (status === 'unsaved') {
        hasUnsavedChanges = true;
        statusText.innerText = 'Có thay đổi chưa lưu';
    } else if (status === 'saving') {
        statusText.innerText = 'Đang lưu thay đổi...';
    }
}

function onLiveFrameLoaded() {
    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame && liveFrame.contentWindow) {
        try {
            const pathname = liveFrame.contentWindow.location.pathname;
            const loadedFilename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
            
            if (loadedFilename && loadedFilename.endsWith('.html')) {
                currentFilename = loadedFilename;
                
                const selectPage = document.getElementById('selectEditorPage');
                if (selectPage && selectPage.value !== currentFilename) {
                    selectPage.value = currentFilename;
                }
                
                document.title = `Chỉnh Sửa: ${currentFilename} | CloudSms™ Editor`;
                
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('page', currentFilename);
                window.history.replaceState({}, '', newUrl);
            }
        } catch (err) {
            console.warn('Cannot sync iframe location:', err);
        }
    }

    if (isSessionValid) {
        applyEditStateToIframe(isLiveEditActive);
        updateSaveStatus('saved');
    } else {
        applyEditStateToIframe(false);
    }
}

function applyEditStateToIframe(isActive) {
    const liveFrame = document.getElementById('liveFrame');
    if (!liveFrame || !liveFrame.contentDocument) return;

    const doc = liveFrame.contentDocument;

    // If session is expired, force inactive
    if (!isSessionValid) {
        isActive = false;
    }

    // Listen to changes inside iframe to mark unsaved status
    if (!doc._hasInputListenerAttached && isSessionValid) {
        doc.addEventListener('input', (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            if (e.target.isContentEditable) {
                updateSaveStatus('unsaved');
            }
        });
        doc.addEventListener('keyup', (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            if (e.target.isContentEditable && (['Backspace', 'Delete', 'Enter'].includes(e.key) || e.key.length === 1)) {
                updateSaveStatus('unsaved');
            }
        });
        doc.addEventListener('paste', (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            if (e.target.isContentEditable) {
                updateSaveStatus('unsaved');
            }
        });
        doc._hasInputListenerAttached = true;
    }

    // Injected Visual Editor Style
    let injectedStyle = doc.getElementById('live-editor-injected-style');
    if (isActive) {
        if (!injectedStyle) {
            injectedStyle = doc.createElement('style');
            injectedStyle.id = 'live-editor-injected-style';
            injectedStyle.innerHTML = `
                *:before, *:after, .pt-plan:before, .pricing--item:before, .caption:before {
                    pointer-events: none !important;
                }
                [contenteditable="true"] {
                    outline: none !important;
                    transition: outline 0.15s ease, background 0.15s ease !important;
                    cursor: text !important;
                    user-select: text !important;
                    -webkit-user-select: text !important;
                    position: relative !important;
                    z-index: 5 !important;
                    pointer-events: auto !important;
                }
                [contenteditable="true"]:hover {
                    outline: 2px dashed #0284c7 !important;
                    outline-offset: 2px !important;
                    background-color: rgba(2, 132, 199, 0.06) !important;
                }
                [contenteditable="true"]:focus {
                    outline: 2.5px solid #10b981 !important;
                    outline-offset: 2px !important;
                    background-color: rgba(16, 185, 129, 0.08) !important;
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important;
                }
                img {
                    cursor: pointer !important;
                    transition: transform 0.2s, outline 0.2s !important;
                }
                img:hover {
                    outline: 2.5px solid #0284c7 !important;
                    outline-offset: 2px !important;
                }
            `;
            doc.head.appendChild(injectedStyle);
        }
    } else {
        if (injectedStyle) injectedStyle.remove();
    }

    if (isActive) {
        doc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

        const textSelectors = 'h1, h2, h3, h4, h5, h6, p, li, a, button, td, th, blockquote, figcaption, .pt-price-tag, .note_module, .caption, .pricing-plan-title, .item-title, .desc, .sub-title, .pt-plan span, span.span, span, b, strong, em, i, u, label, small';
        doc.querySelectorAll(textSelectors).forEach(el => {
            if (['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'FORM', 'BODY', 'HTML'].includes(el.tagName)) return;
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');
            if (el.tagName === 'A') {
                el.onclick = (e) => e.preventDefault();
            }
        });

        doc.querySelectorAll('div').forEach(el => {
            if (['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'FORM', 'BODY', 'HTML', 'SECTION', 'MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName)) return;
            if (el.children.length === 0 && el.textContent.trim().length > 0) {
                el.setAttribute('contenteditable', 'true');
                el.setAttribute('spellcheck', 'false');
            }
        });

        doc.querySelectorAll('[contenteditable="true"]').forEach(el => {
            const editableChildren = el.querySelectorAll('[contenteditable="true"]');
            if (editableChildren.length > 0) {
                el.removeAttribute('contenteditable');
            }
        });

        doc.querySelectorAll('img').forEach(img => {
            img.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openImageEditModal(img);
            };
        });
    } else {
        doc.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('spellcheck');
        });

        doc.querySelectorAll('a').forEach(a => {
            a.onclick = null;
            a.removeAttribute('contenteditable');
            const href = a.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
                a.removeAttribute('target');
            }
        });

        doc.querySelectorAll('img').forEach(img => {
            img.ondblclick = null;
        });
    }
}

async function saveCurrentLiveHtml() {
    if (!isSessionValid) {
        handleSessionExpired();
        return;
    }

    const btn = document.getElementById('btnSaveLiveHtml');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> <strong>Đang lưu...</strong>';
    updateSaveStatus('saving');

    const liveFrame = document.getElementById('liveFrame');
    if (!liveFrame || !liveFrame.contentDocument) {
        showToast('Không tìm thấy khung chỉnh sửa!', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-floppy-o"></i> <strong>Lưu Thay Đổi</strong>';
        updateSaveStatus(hasUnsavedChanges ? 'unsaved' : 'saved');
        return;
    }

    const docClone = liveFrame.contentDocument.documentElement.cloneNode(true);
    
    // Remove injected styles
    const style = docClone.querySelector('#live-editor-injected-style');
    if (style) style.remove();

    // Clean editor attributes
    docClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    docClone.querySelectorAll('[spellcheck]').forEach(el => el.removeAttribute('spellcheck'));

    // Clean dynamic Owl Carousel wrappers
    docClone.querySelectorAll('.owl-carousel, [id="partner-slide"], .partner-slide, .banner-slider, .testimonial-slider').forEach(carousel => {
        const items = [];
        carousel.querySelectorAll('.item').forEach(item => {
            items.push(item.cloneNode(true));
        });
        if (items.length > 0) {
            carousel.innerHTML = '';
            items.forEach(item => carousel.appendChild(item));
        }
        carousel.classList.remove('owl-carousel', 'owl-theme');
        carousel.removeAttribute('style');
    });

    // Reset default form values
    docClone.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="radio"]):not([type="checkbox"])').forEach(input => {
        if (!input.defaultValue) {
            input.removeAttribute('value');
        } else {
            input.setAttribute('value', input.defaultValue);
        }
    });
    docClone.querySelectorAll('textarea').forEach(ta => {
        if (!ta.defaultValue) {
            ta.innerHTML = '';
            ta.textContent = '';
        } else {
            ta.textContent = ta.defaultValue;
        }
    });

    const finalHtml = '<!DOCTYPE html>\n' + docClone.outerHTML;

    try {
        const { ok, data } = await authFetch(`/html-pages/${encodeURIComponent(currentFilename)}`, {
            method: 'PUT',
            body: JSON.stringify({ content: finalHtml })
        });

        if (ok && data.success) {
            updateSaveStatus('saved');
            showToast(`Đã lưu và cập nhật trực tiếp trang "${currentFilename}" thành công!`, 'success');
        } else {
            updateSaveStatus('unsaved');
            showToast(data.message || 'Lỗi khi lưu trang!', 'error');
        }
    } catch (err) {
        updateSaveStatus('unsaved');
        if (err.message !== 'Unauthorized') {
            showToast('Không thể lưu trang! Hãy chắc chắn server đang hoạt động.', 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-floppy-o"></i> <strong>Lưu Thay Đổi</strong>';
    }
}

function reloadLiveFrame() {
    if (hasUnsavedChanges && isSessionValid) {
        if (!confirm('Bạn có thay đổi chưa lưu. Tải lại sẽ mất các thay đổi chưa lưu này. Bạn có chắc muốn tải lại không?')) {
            return;
        }
    }
    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame) {
        liveFrame.src = `../${currentFilename}?t=${Date.now()}`;
    }
    showToast(`Đã tải lại trang ${currentFilename}`, 'info');
}

function setEditorMode(mode) {
    if (!isSessionValid) return;
    editorMode = mode;

    const btnEdit = document.getElementById('btnModeEdit');
    const btnPreview = document.getElementById('btnModePreview');
    const hintContent = document.getElementById('hintBannerContent');

    if (mode === 'edit') {
        isLiveEditActive = true;
        if (btnEdit) btnEdit.classList.add('active');
        if (btnPreview) btnPreview.classList.remove('active');

        applyEditStateToIframe(true);

        if (hintContent) {
            hintContent.innerHTML = `
                <i class="fa fa-info-circle text-primary"></i>
                <span><strong>Chế độ Sửa:</strong> Nhấp chuột trực tiếp vào bất kỳ dòng chữ nào trên trang để sửa nội dung. Nhấp đúp (Double-click) vào hình ảnh để đổi ảnh. Sau khi chỉnh sửa, nhấn nút <strong class="text-success"><i class="fa fa-floppy-o"></i> Lưu Thay Đổi</strong> ở góc trên bên phải!</span>
            `;
        }
        showToast('Đã BẬT Chế Độ Sửa (Nhấp trực tiếp vào chữ trên trang để sửa)', 'success');
    } else {
        isLiveEditActive = false;
        if (btnPreview) btnPreview.classList.add('active');
        if (btnEdit) btnEdit.classList.remove('active');

        applyEditStateToIframe(false);

        if (hintContent) {
            hintContent.innerHTML = `
                <i class="fa fa-eye text-primary"></i>
                <span><strong>Chế độ Xem:</strong> Bạn đang trải nghiệm giao diện trang web như khách truy cập thực tế. Các liên kết, nút bấm và hiệu ứng hoạt động bình thường.</span>
            `;
        }
        showToast('Đã chuyển sang Chế Độ Xem trước website', 'info');
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
function initImageUpload() {
    const modalImgFileInput = document.getElementById('modalImgFileInput');
    if (modalImgFileInput) {
        modalImgFileInput.addEventListener('change', async (e) => {
            if (!isSessionValid) {
                handleSessionExpired();
                return;
            }
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            showToast('Đang tải ảnh lên máy chủ...', 'info');

            try {
                const { ok, data } = await authFetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (ok && data.success) {
                    document.getElementById('modalImgSrcInput').value = data.url;
                    document.getElementById('modalImgPreview').src = '../' + data.url;
                    showToast('Tải ảnh mới lên thành công!', 'success');
                } else {
                    showToast(data.message || 'Lỗi tải ảnh', 'error');
                }
            } catch (err) {
                if (err.message !== 'Unauthorized') {
                    showToast('Không thể upload ảnh lên server!', 'error');
                }
            }
        });
    }
}

function openImageEditModal(imgEl) {
    if (!isSessionValid) {
        handleSessionExpired();
        return;
    }
    selectedImgElement = imgEl;
    const modal = document.getElementById('imageEditModal');
    const input = document.getElementById('modalImgSrcInput');
    const preview = document.getElementById('modalImgPreview');

    if (modal && input && preview) {
        const currentSrc = imgEl.getAttribute('src');
        input.value = currentSrc;
        preview.src = currentSrc.startsWith('http') || currentSrc.startsWith('/') ? currentSrc : '../' + currentSrc;
        modal.style.display = 'flex';
    }
}

function closeImageEditModal() {
    const modal = document.getElementById('imageEditModal');
    if (modal) modal.style.display = 'none';
    selectedImgElement = null;
}

function applyImageModalChanges() {
    if (!isSessionValid) {
        handleSessionExpired();
        return;
    }
    const input = document.getElementById('modalImgSrcInput');
    if (selectedImgElement && input) {
        const newSrc = input.value.trim();
        if (newSrc) {
            selectedImgElement.setAttribute('src', newSrc);
            selectedImgElement.src = newSrc;
            updateSaveStatus('unsaved');
            showToast('Đã cập nhật hình ảnh trực tiếp!', 'success');
        }
    }
    closeImageEditModal();
}

// ==========================================
// MEDIA PICKER FOR VISUAL EDITOR
// ==========================================
async function openMediaPickerModal() {
    if (!isSessionValid) {
        handleSessionExpired();
        return;
    }
    const modal = document.getElementById('mediaPickerModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const searchInput = document.getElementById('editorMediaSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => renderEditorMediaPickerGrid(e.target.value.trim().toLowerCase());
    }

    try {
        const { ok, data } = await authFetch('/media');
        if (ok && data.success) {
            editorMediaList = data.data || [];
            renderEditorMediaPickerGrid('');
        } else {
            showToast('Không thể nạp danh sách ảnh!', 'error');
        }
    } catch (e) {
        if (e.message !== 'Unauthorized') {
            showToast('Không thể kết nối đến thư viện ảnh!', 'error');
        }
    }
}

function closeMediaPickerModal() {
    const modal = document.getElementById('mediaPickerModal');
    if (modal) modal.style.display = 'none';
}

function renderEditorMediaPickerGrid(query) {
    const grid = document.getElementById('editorMediaPickerGrid');
    if (!grid) return;

    const filtered = editorMediaList.filter(item => {
        return !query || item.filename.toLowerCase().includes(query) || item.relativePath.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">Không tìm thấy ảnh</div>';
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="media-picker-item" data-action="select-media" data-path="${escapeHtml(item.relativePath)}" title="${escapeHtml(item.filename)}">
            <div class="media-picker-thumb">
                <img src="../${escapeHtml(item.relativePath)}" alt="${escapeHtml(item.filename)}">
            </div>
            <div class="media-picker-name">${escapeHtml(item.filename)}</div>
        </div>
    `).join('');

    grid.onclick = (e) => {
        const itemEl = e.target.closest('[data-action="select-media"]');
        if (itemEl) {
            const relPath = itemEl.getAttribute('data-path');
            selectMediaForEditor(relPath);
        }
    };
}

function selectMediaForEditor(relativePath) {
    const input = document.getElementById('modalImgSrcInput');
    const preview = document.getElementById('modalImgPreview');
    if (input) input.value = relativePath;
    if (preview) preview.src = '../' + relativePath;
    closeMediaPickerModal();
    showToast(`Đã chọn ảnh: ${relativePath}`, 'success');
}
