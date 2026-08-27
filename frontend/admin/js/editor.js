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
let changeset = new Map(); // key: `${eid}::${type}` -> { eid, type, value }

/**
 * Sanitize HTML input from contenteditable to prevent paste garbage/unsafe scripts
 * Fail-closed: Throws error if DOMPurify is not available
 */
function sanitizeEditableHtml(html) {
    if (typeof DOMPurify === 'undefined') {
        throw new Error('DOMPurify chưa sẵn sàng, không thể làm sạch nội dung.');
    }
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'b', 'strong', 'i', 'em', 'span', 'br', 'a', 
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
            'ul', 'ol', 'li', 'small', 'u', 'sub', 'sup'
        ],
        ALLOWED_ATTR: ['href', 'class', 'target', 'title', 'rel']
    });
}

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
            changeset.clear();
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

    changeset.clear();

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

    // Track initial HTML when focusing on an editable element
    if (!doc._hasFocusinListenerAttached && isSessionValid) {
        doc.addEventListener('focusin', (e) => {
            if (!isSessionValid) return;
            const target = e.target;
            if (!target) return;
            const editableHost = target.getAttribute && target.getAttribute('contenteditable') === 'true'
                ? target
                : (target.closest ? target.closest('[contenteditable="true"]') : null);
            if (editableHost && editableHost._initialHtml === undefined) {
                editableHost._initialHtml = editableHost.innerHTML;
            }
        }, true);
        doc._hasFocusinListenerAttached = true;
    }

    // Paste event interceptor: sanitize clipboard contents immediately before inserting into DOM
    if (!doc._hasPasteInterceptorAttached && isSessionValid) {
        doc.addEventListener('paste', (e) => {
            if (!isLiveEditActive) return;
            const target = e.target;
            const editableHost = target.getAttribute && target.getAttribute('contenteditable') === 'true'
                ? target
                : (target.closest ? target.closest('[contenteditable="true"]') : null);
            if (!editableHost) return;

            e.preventDefault();
            const clipboardHtml = (e.clipboardData || window.clipboardData).getData('text/html');
            const clipboardText = (e.clipboardData || window.clipboardData).getData('text/plain');
            
            let pasteContent = '';
            try {
                pasteContent = clipboardHtml
                    ? sanitizeEditableHtml(clipboardHtml)
                    : (clipboardText ? clipboardText.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) : '');
            } catch (err) {
                console.error(err);
                showToast('Không thể dán nội dung: ' + (err.message || 'Thư viện làm sạch chưa sẵn sàng!'), 'error');
                return;
            }

            if (pasteContent) {
                const sel = doc.getSelection();
                if (sel && sel.rangeCount > 0) {
                    sel.deleteFromDocument();
                    const range = sel.getRangeAt(0);
                    const frag = range.createContextualFragment(pasteContent);
                    range.insertNode(frag);
                    sel.collapseToEnd();
                }
                
                if (editableHost._initialHtml === undefined) {
                    editableHost._initialHtml = editableHost.innerHTML;
                }
                const currentHtml = editableHost.innerHTML;
                const initialHtml = editableHost._initialHtml;
                const eid = editableHost.getAttribute('data-eid');
                if (currentHtml !== initialHtml) {
                    if (eid) {
                        try {
                            const cleanHtml = sanitizeEditableHtml(currentHtml);
                            changeset.set(`${eid}::innerHTML`, { eid, type: 'innerHTML', value: cleanHtml });
                        } catch (err) {
                            console.error(err);
                        }
                    }
                    updateSaveStatus('unsaved');
                }
            }
        }, true);
        doc._hasPasteInterceptorAttached = true;
    }

    // Listen to input changes inside iframe to mark unsaved status only when content actually changes
    if (!doc._hasInputListenerAttached && isSessionValid) {
        const markUnsavedIfChanged = (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            const target = e.target;
            const editableHost = target.getAttribute && target.getAttribute('contenteditable') === 'true'
                ? target
                : (target.closest ? target.closest('[contenteditable="true"]') : null);
            
            if (editableHost) {
                if (editableHost._initialHtml === undefined) {
                    editableHost._initialHtml = editableHost.innerHTML;
                }
                const currentHtml = editableHost.innerHTML;
                const initialHtml = editableHost._initialHtml;
                const eid = editableHost.getAttribute('data-eid');

                if (currentHtml !== initialHtml) {
                    if (eid) {
                        try {
                            const cleanHtml = sanitizeEditableHtml(currentHtml);
                            changeset.set(`${eid}::innerHTML`, { eid, type: 'innerHTML', value: cleanHtml });
                        } catch (err) {
                            console.error(err);
                            showToast('Lỗi làm sạch nội dung: ' + (err.message || 'DOMPurify lỗi'), 'error');
                            return;
                        }
                    }
                    updateSaveStatus('unsaved');
                } else {
                    if (eid) {
                        changeset.delete(`${eid}::innerHTML`);
                    }
                    if (changeset.size === 0) {
                        updateSaveStatus('saved');
                    }
                }
            }
        };

        doc.addEventListener('input', markUnsavedIfChanged);
        doc.addEventListener('keyup', (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            if (['Backspace', 'Delete', 'Enter', ' '].includes(e.key) || e.key.length === 1) {
                markUnsavedIfChanged(e);
            }
        });
        doc._hasInputListenerAttached = true;
    }

    // Capture blur events from contenteditable elements to finalize changeset only when content changed
    if (!doc._hasBlurListenerAttached && isSessionValid) {
        doc.addEventListener('blur', (e) => {
            if (!isSessionValid) return;
            const target = e.target;
            if (!target) return;
            const editableHost = target.getAttribute && target.getAttribute('contenteditable') === 'true'
                ? target
                : (target.closest ? target.closest('[contenteditable="true"]') : null);
            
            if (editableHost) {
                const currentHtml = editableHost.innerHTML;
                const initialHtml = editableHost._initialHtml;
                const eid = editableHost.getAttribute('data-eid');

                if (initialHtml !== undefined && currentHtml !== initialHtml) {
                    if (!eid) {
                        console.warn('Phần tử contenteditable không có data-eid:', editableHost);
                        showToast('Cảnh báo: Phần tử này chưa có mã định danh data-eid để lưu!', 'warning');
                        return;
                    }
                    try {
                        const cleanHtml = sanitizeEditableHtml(currentHtml);
                        changeset.set(`${eid}::innerHTML`, { eid, type: 'innerHTML', value: cleanHtml });
                    } catch (err) {
                        console.error(err);
                        showToast('Lỗi làm sạch nội dung: ' + (err.message || 'DOMPurify lỗi'), 'error');
                        return;
                    }
                    updateSaveStatus('unsaved');
                } else if (initialHtml !== undefined && currentHtml === initialHtml) {
                    if (eid) {
                        changeset.delete(`${eid}::innerHTML`);
                    }
                    if (changeset.size === 0) {
                        updateSaveStatus('saved');
                    }
                }
            }
        }, true);
        doc._hasBlurListenerAttached = true;
    }

    // Capture-phase event interceptor to prevent Owl Carousel from dragging when clicking text
    if (!doc._hasCarouselInterceptor) {
        const stopCarouselDrag = (e) => {
            if (isLiveEditActive) {
                const target = e.target;
                if (target && (target.isContentEditable || (target.closest && (target.closest('[contenteditable="true"]') || target.closest('.banner-item-content'))))) {
                    e.stopPropagation();
                }
            }
        };
        doc.addEventListener('mousedown', stopCarouselDrag, true);
        doc.addEventListener('pointerdown', stopCarouselDrag, true);
        doc.addEventListener('touchstart', stopCarouselDrag, true);
        doc._hasCarouselInterceptor = true;
    }

    // Injected Visual Editor Style
    let injectedStyle = doc.getElementById('live-editor-injected-style');
    if (isActive) {
        if (!injectedStyle) {
            injectedStyle = doc.createElement('style');
            injectedStyle.id = 'live-editor-injected-style';
            injectedStyle.innerHTML = `
                /* Strictly keep hidden elements hidden */
                [style*="display: none"], [style*="display:none"],
                h1[style*="display: none"], h1[style*="display:none"] {
                    display: none !important;
                }

                /* Disable blocking pseudo overlays */
                *:before, *:after,
                .bg--overlay:before, .bg--overlay:after,
                .banner-item:before, .banner-item:after,
                .vc-parent:before, .vc-parent:after,
                .pt-plan:before, .pricing--item:before, .caption:before,
                .panel-title:before, .panel-title:after,
                .features-tab--nav:before, .features-tab--nav:after {
                    pointer-events: none !important;
                }

                /* Enable text selection inside carousels */
                .owl-carousel, .owl-wrapper, .owl-item, .banner-slider, .banner-item {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }

                /* Banner text container high z-index and cancel continuous animation */
                .banner-slider, .banner-item, .banner-item .container, .vc-parent, .vc-child, .banner-item-content {
                    position: relative !important;
                    z-index: 20 !important;
                    pointer-events: auto !important;
                }

                .banner-item-content h1, .banner-item-content h2, .banner-item-content h2 span,
                .banner-item-content p, .banner-item-content a, .banner-item-content .btn, .banner-item-content span {
                    position: relative !important;
                    z-index: 30 !important;
                    pointer-events: auto !important;
                    cursor: text !important;
                    -webkit-animation: none !important;
                    animation: none !important;
                }

                [contenteditable="true"] {
                    outline: none !important;
                    transition: outline 0.15s ease, background 0.15s ease !important;
                    cursor: text !important;
                    user-select: text !important;
                    -webkit-user-select: text !important;
                    position: relative !important;
                    z-index: 10 !important;
                    pointer-events: auto !important;
                    min-width: 12px !important;
                }

                [contenteditable="true"]:hover {
                    outline: 2px dashed #0284c7 !important;
                    outline-offset: 3px !important;
                    background-color: rgba(2, 132, 199, 0.12) !important;
                    border-radius: 4px !important;
                }

                [contenteditable="true"]:focus {
                    outline: 2.5px solid #10b981 !important;
                    outline-offset: 3px !important;
                    background-color: rgba(16, 185, 129, 0.14) !important;
                    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4) !important;
                    border-radius: 4px !important;
                }

                [contenteditable="true"]:empty:not(:focus)::before {
                    content: "Nhập chữ...";
                    color: #94a3b8;
                    font-style: italic;
                    opacity: 0.6;
                }

                img {
                    cursor: pointer !important;
                    transition: transform 0.2s, outline 0.2s !important;
                    position: relative !important;
                    z-index: 9 !important;
                }
                img:hover {
                    outline: 2.5px solid #0284c7 !important;
                    outline-offset: 2px !important;
                }

                input[type="submit"], input[type="button"] {
                    cursor: pointer !important;
                    position: relative !important;
                    z-index: 9 !important;
                }
                input[type="submit"]:hover, input[type="button"]:hover {
                    outline: 2.5px dashed #10b981 !important;
                    outline-offset: 2px !important;
                }
            `;
            doc.head.appendChild(injectedStyle);
        }
    } else {
        if (injectedStyle) injectedStyle.remove();
    }

    // Control Carousel AutoPlay (Pause when editing, Resume when previewing)
    try {
        const win = liveFrame.contentWindow;
        if (win && win.$ && win.$.fn.owlCarousel) {
            const carousels = win.$('.owl-carousel, .banner-slider');
            if (carousels.length) {
                if (isActive) {
                    carousels.trigger('owl.stop');
                } else {
                    carousels.trigger('owl.play', 6000);
                }
            }
        }
    } catch (e) {}

    if (isActive) {
        // Reset old contenteditable
        doc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

        // Comprehensive blacklist: never make these tags editable
        const nonEditableTags = new Set([
            'SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'IFRAME', 
            'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 
            'FORM', 'BODY', 'HTML', 'HEAD', 'META', 'TITLE',
            'SVG', 'PATH', 'G', 'CIRCLE', 'POLYGON', 'RECT', 'LINE', 'USE',
            'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'TRACK', 'CANVAS', 'OBJECT', 'EMBED'
        ]);

        // Helper: Check if element is explicitly hidden
        const isHiddenElement = (el) => {
            const inlineStyle = el.getAttribute('style') || '';
            return inlineStyle.includes('display: none') || inlineStyle.includes('display:none');
        };

        // 1. Primary Text Container Elements (Block & Headings)
        const primaryTextTags = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, dt, dd, th, td, caption, address';
        doc.querySelectorAll(primaryTextTags).forEach(el => {
            if (nonEditableTags.has(el.tagName) || isHiddenElement(el)) return;
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');
        });

        // 2. Banner Specific Text Elements
        doc.querySelectorAll('.banner-item-content h1, .banner-item-content h2, .banner-item-content h2 span, .banner-item-content p, .banner-item-content a, .banner-item-content .btn, .banner-item-content span').forEach(el => {
            if (nonEditableTags.has(el.tagName) || isHiddenElement(el)) return;
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');
        });

        // 3. Buttons, Badges, Links, and Inline Labels (if not already inside an editable container)
        const interactiveTextTags = 'button, a, label, .btn, .btn-custom, .btn-custom-reverse, .pt-price-tag, .note_module, .caption, .pt-plan';
        doc.querySelectorAll(interactiveTextTags).forEach(el => {
            if (nonEditableTags.has(el.tagName) || isHiddenElement(el)) return;
            if (!el.parentElement || !el.parentElement.closest('[contenteditable="true"]')) {
                el.setAttribute('contenteditable', 'true');
                el.setAttribute('spellcheck', 'false');
            }
        });

        // 4. Any element that contains direct non-whitespace text
        if (doc.body) {
            doc.body.querySelectorAll('*').forEach(el => {
                if (nonEditableTags.has(el.tagName) || isHiddenElement(el)) return;
                if (el.tagName === 'BODY' || el.tagName === 'HTML') return;
                if (el.getAttribute('contenteditable') === 'true') return;
                if (el.closest && el.closest('[contenteditable="true"]')) return;

                let hasDirectText = false;
                for (let i = 0; i < el.childNodes.length; i++) {
                    const node = el.childNodes[i];
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        hasDirectText = true;
                        break;
                    }
                }

                const isTextWrapper = el.classList.contains('caption') ||
                                      el.classList.contains('pt-price-tag') ||
                                      el.classList.contains('pt-plan') ||
                                      el.classList.contains('note_module') ||
                                      el.classList.contains('title') ||
                                      ['SPAN', 'B', 'STRONG', 'EM', 'I', 'U', 'LABEL', 'SMALL', 'A', 'BUTTON'].includes(el.tagName);

                if (hasDirectText || (isTextWrapper && el.textContent.trim().length > 0)) {
                    el.setAttribute('contenteditable', 'true');
                    el.setAttribute('spellcheck', 'false');
                }
            });
        }

        // 5. Intercept clicks on links and buttons in edit mode so user can edit text without navigating
        doc.querySelectorAll('a, button, [role="button"], [data-toggle]').forEach(el => {
            el.onclick = (e) => {
                if (isLiveEditActive) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (el.isContentEditable) {
                        el.focus();
                    } else {
                        const child = el.querySelector('[contenteditable="true"]');
                        if (child) child.focus();
                    }
                }
            };
        });

        // 6. Support Double-Clicking links <a> to edit the destination URL (href)
        doc.querySelectorAll('a').forEach(a => {
            a.setAttribute('data-editor-enhanced', 'true');
            a.title = 'Nhấp chuột để sửa chữ. Nhấp đúp chuột để sửa đường dẫn liên kết (href)';
            a.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentHref = (a.getAttribute('href') || '').trim();
                const newHref = prompt('Nhập đường dẫn liên kết (href) mới cho nút / liên kết này:', currentHref);
                if (newHref !== null) {
                    const trimmed = newHref.trim();
                    if (trimmed !== currentHref) {
                        a.setAttribute('href', trimmed);
                        const eid = a.getAttribute('data-eid');
                        if (eid) {
                            changeset.set(`${eid}::attr:href`, { eid, type: 'attr:href', value: trimmed });
                        } else {
                            console.warn('Thẻ liên kết không có data-eid:', a);
                            showToast('Cảnh báo: Liên kết này chưa có mã định danh data-eid để lưu!', 'warning');
                        }
                        updateSaveStatus('unsaved');
                        showToast('Đã cập nhật đường dẫn liên kết!', 'success');
                    }
                }
            };
        });

        // 7. Support Double-Clicking <input type="submit"> / <input type="button"> to edit button label
        doc.querySelectorAll('input[type="submit"], input[type="button"]').forEach(input => {
            input.setAttribute('data-editor-enhanced', 'true');
            input.title = 'Nhấp đúp để đổi chữ trên nút bấm này';
            input.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentVal = (input.value || input.getAttribute('value') || '').trim();
                const newVal = prompt('Nhập nội dung mới cho nút bấm:', currentVal);
                if (newVal !== null) {
                    const trimmed = newVal.trim();
                    if (trimmed !== '' && trimmed !== currentVal) {
                        input.setAttribute('value', trimmed);
                        input.value = trimmed;
                        const eid = input.getAttribute('data-eid');
                        if (eid) {
                            changeset.set(`${eid}::attr:value`, { eid, type: 'attr:value', value: trimmed });
                        } else {
                            console.warn('Nút bấm không có data-eid:', input);
                            showToast('Cảnh báo: Nút bấm này chưa có mã định danh data-eid để lưu!', 'warning');
                        }
                        updateSaveStatus('unsaved');
                        showToast('Đã đổi chữ nút bấm thành công!', 'success');
                    }
                }
            };
        });

        // 8. Image Double Click Handler (and Tooltip)
        doc.querySelectorAll('img').forEach(img => {
            img.setAttribute('data-editor-enhanced', 'true');
            img.title = 'Nhấp đúp (Double-click) để thay đổi hình ảnh này';
            img.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openImageEditModal(img);
            };
        });

    } else {
        // Mode Preview: Remove all editor attributes and event blockers
        doc.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('spellcheck');
        });

        doc.querySelectorAll('a, button, [role="button"], [data-toggle]').forEach(el => {
            el.onclick = null;
        });

        doc.querySelectorAll('[data-editor-enhanced]').forEach(el => {
            el.ondblclick = null;
            el.removeAttribute('title');
            el.removeAttribute('data-editor-enhanced');
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

    // 1. Flush any currently focused contenteditable element in the iframe into the changeset
    const liveFrame = document.getElementById('liveFrame');
    if (liveFrame && liveFrame.contentDocument && liveFrame.contentDocument.activeElement) {
        const activeEl = liveFrame.contentDocument.activeElement;
        if (activeEl && (activeEl.isContentEditable || (activeEl.getAttribute && activeEl.getAttribute('contenteditable') === 'true'))) {
            const editableHost = activeEl.getAttribute('contenteditable') === 'true'
                ? activeEl
                : (activeEl.closest ? activeEl.closest('[contenteditable="true"]') : activeEl);
            if (editableHost) {
                const currentHtml = editableHost.innerHTML;
                const initialHtml = editableHost._initialHtml;
                const eid = editableHost.getAttribute('data-eid');
                if (initialHtml !== undefined && currentHtml !== initialHtml) {
                    if (eid) {
                        try {
                            const cleanHtml = sanitizeEditableHtml(currentHtml);
                            changeset.set(`${eid}::innerHTML`, { eid, type: 'innerHTML', value: cleanHtml });
                        } catch (err) {
                            showToast('Không thể lưu: ' + (err.message || 'Thư viện làm sạch chưa sẵn sàng! Vui lòng tải lại trang.'), 'error');
                            updateSaveStatus('unsaved');
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fa fa-floppy-o"></i> <strong>Lưu Thay Đổi</strong>';
                            return;
                        }
                    }
                } else if (initialHtml !== undefined && currentHtml === initialHtml) {
                    if (eid) {
                        changeset.delete(`${eid}::innerHTML`);
                    }
                }
            }
        }
    }

    if (changeset.size === 0) {
        showToast('Không có thay đổi nào mới cần lưu trên trang!', 'info');
        updateSaveStatus('saved');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-floppy-o"></i> <strong>Lưu Thay Đổi</strong>';
        return;
    }

    try {
        // 2. Fetch pristine raw HTML from server
        const { ok: okGet, data: dataGet } = await authFetch(`/html-pages/${encodeURIComponent(currentFilename)}`);
        if (!okGet || !dataGet || !dataGet.success) {
            throw new Error(dataGet?.message || 'Không thể tải HTML gốc từ máy chủ!');
        }

        // 3. Parse as pristine DOM without executing scripts
        const parser = new DOMParser();
        const pristineDoc = parser.parseFromString(dataGet.content, 'text/html');

        // 4. Apply recorded changeset to pristine doc
        let appliedCount = 0;
        changeset.forEach(({ eid, type, value }) => {
            const target = pristineDoc.querySelector(`[data-eid="${eid}"]`);
            if (!target) {
                console.warn(`Không tìm thấy phần tử data-eid="${eid}" trên bản HTML gốc.`);
                return;
            }
            if (type === 'innerHTML') {
                target.innerHTML = value;
                appliedCount++;
            } else if (type.startsWith('attr:')) {
                const attrName = type.slice(5);
                target.setAttribute(attrName, value);
                appliedCount++;
            }
        });

        // 5. Serialize and send to server
        const finalHtml = '<!DOCTYPE html>\n' + pristineDoc.documentElement.outerHTML;
        const { ok, data } = await authFetch(`/html-pages/${encodeURIComponent(currentFilename)}`, {
            method: 'PUT',
            body: JSON.stringify({ content: finalHtml })
        });

        if (ok && data && data.success) {
            updateSaveStatus('saved');
            changeset.clear();
            showToast(`Đã lưu ${appliedCount} thay đổi vào trang "${currentFilename}" thành công!`, 'success');
        } else {
            updateSaveStatus('unsaved');
            showToast(data?.message || 'Lỗi khi lưu trang!', 'error');
        }
    } catch (err) {
        updateSaveStatus('unsaved');
        if (err.message !== 'Unauthorized') {
            showToast(err.message || 'Không thể lưu trang! Hãy chắc chắn máy chủ đang hoạt động.', 'error');
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
    changeset.clear();
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
                <span><strong>Chế độ Sửa:</strong> Nhấp vào chữ để sửa • Nhấp đúp để đổi ảnh & link liên kết • Bấm <strong class="text-success"><i class="fa fa-floppy-o"></i> Lưu Thay Đổi</strong> khi hoàn tất.</span>
            `;
        }
        showToast('Đã BẬT Chế Độ Sửa (Nhấp trực tiếp vào chữ để sửa)', 'success');
    } else {
        isLiveEditActive = false;
        if (btnPreview) btnPreview.classList.add('active');
        if (btnEdit) btnEdit.classList.remove('active');

        applyEditStateToIframe(false);

        if (hintContent) {
            hintContent.innerHTML = `
                <i class="fa fa-eye text-primary"></i>
                <span><strong>Chế độ Xem:</strong> Xem trước website thực tế • Bấm chuột để kiểm tra liên kết & hiệu ứng.</span>
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
        const currentSrc = (selectedImgElement.getAttribute('src') || '').trim();
        if (newSrc && newSrc !== currentSrc) {
            selectedImgElement.setAttribute('src', newSrc);
            selectedImgElement.src = newSrc.startsWith('http') || newSrc.startsWith('/') ? newSrc : '../' + newSrc;
            const eid = selectedImgElement.getAttribute('data-eid');
            if (eid) {
                changeset.set(`${eid}::attr:src`, { eid, type: 'attr:src', value: newSrc });
            } else {
                console.warn('Ảnh không có data-eid:', selectedImgElement);
                showToast('Cảnh báo: Hình ảnh này chưa có mã định danh data-eid để lưu!', 'warning');
            }
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
