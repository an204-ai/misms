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
        const markUnsaved = (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            if (e.target.isContentEditable || (e.target.closest && e.target.closest('[contenteditable="true"]'))) {
                updateSaveStatus('unsaved');
            }
        };
        doc.addEventListener('input', markUnsaved);
        doc.addEventListener('keyup', (e) => {
            if (!isSessionValid) return;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
            if ((e.target.isContentEditable || (e.target.closest && e.target.closest('[contenteditable="true"]'))) && 
                (['Backspace', 'Delete', 'Enter', ' '].includes(e.key) || e.key.length === 1)) {
                updateSaveStatus('unsaved');
            }
        });
        doc.addEventListener('paste', markUnsaved);
        doc._hasInputListenerAttached = true;
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
        const interactiveTextTags = 'button, a, label, .btn, .btn-custom, .btn-custom-reverse, .pt-price-tag, .note_module, .caption, .pricing-plan-title, .item-title, .sub-title, .desc, span.span, .pt-plan';
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
                                      el.classList.contains('desc') ||
                                      el.classList.contains('sub-title') ||
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
            a.title = 'Nhấp chuột để sửa chữ. Nhấp đúp chuột (Double-click) để sửa đường dẫn liên kết (href)';
            a.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentHref = a.getAttribute('href') || '';
                const newHref = prompt('Nhập đường dẫn liên kết (href) mới cho nút / link này:', currentHref);
                if (newHref !== null) {
                    a.setAttribute('href', newHref.trim());
                    updateSaveStatus('unsaved');
                    showToast('Đã cập nhật đường dẫn liên kết!', 'success');
                }
            };
        });

        // 7. Support Double-Clicking <input type="submit"> / <input type="button"> to edit button label
        doc.querySelectorAll('input[type="submit"], input[type="button"]').forEach(input => {
            input.setAttribute('data-editor-enhanced', 'true');
            input.title = 'Nhấp đúp (Double-click) để đổi chữ trên nút bấm này';
            input.ondblclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentVal = input.value || input.getAttribute('value') || '';
                const newVal = prompt('Nhập nội dung mới cho nút bấm:', currentVal);
                if (newVal !== null && newVal.trim() !== '') {
                    input.setAttribute('value', newVal.trim());
                    input.value = newVal.trim();
                    updateSaveStatus('unsaved');
                    showToast('Đã đổi chữ nút bấm thành công!', 'success');
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
    docClone.querySelectorAll('[data-editor-enhanced]').forEach(el => {
        el.removeAttribute('data-editor-enhanced');
        el.removeAttribute('title');
    });

    // Clean scrollspy fixed class and body scrolling state so tab & backToTop don't get stuck on initial load
    const bodyClone = docClone.querySelector('body');
    if (bodyClone) bodyClone.classList.remove('scrolling');
    docClone.querySelectorAll('#spy_scroll, .navbar_scroll_tss').forEach(el => {
        el.classList.remove('spy_scroll-fixed');
    });

    // Clean dynamic Owl Carousel wrappers
    docClone.querySelectorAll('.owl-carousel, [id="partner-slide"], .partner-slide, .banner-slider, .testimonial-slider').forEach(carousel => {
        const items = [];
        carousel.querySelectorAll('.item, .banner-item').forEach(item => {
            items.push(item.cloneNode(true));
        });
        if (items.length > 0) {
            carousel.innerHTML = '';
            items.forEach(item => carousel.appendChild(item));
        }
        carousel.classList.remove('owl-carousel', 'owl-theme');
        carousel.removeAttribute('style');
    });

    // Strip dynamically injected tracking scripts, iframe artifacts & browser extension tags
    docClone.querySelectorAll('script[src*="googleads"], script[src*="facebook.net/signals"], script[src*="google-analytics.com/analytics.js"], script[src*="googletagmanager.com/gtag/js?id="]').forEach(el => el.remove());
    docClone.querySelectorAll('[id*="PING_"], [id*="ping_"], [class*="PING_"]').forEach(el => el.remove());

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
