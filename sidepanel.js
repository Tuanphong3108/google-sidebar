/**
 * Sidepanel.js - Android 17 Edition (Full Dialog & Panel Control)
 * Tác giả: AI Assistant (Độ cho bro Phong)
 * Cập nhật: Hỗ trợ Quick Search từ phím tắt Ctrl+Shift+Alt+G
 */

const frame = document.getElementById('googleFrame');
const loader = document.getElementById('md3-loader');

/**
 * Hàm thực hiện tìm kiếm - Linh hồn của Sidebar
 */
function performSearch(query, isAI = false) {
    loader.classList.remove('hidden');
    let url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    // Nếu là AI hoặc udm=50 từ phím tắt nhanh
    if (isAI) url += `&udm=50`;
    
    frame.src = url;
}

// Lắng nghe lệnh từ các nguồn (Background, Content Script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. Lệnh từ Menu chuột phải HOẶC từ Phím tắt nhanh (Quick Search Trigger)
    if (message.type === "SEARCH_QUERY" || message.type === "QUICK_SEARCH_TRIGGER") {
        performSearch(message.query, message.isAI);
        sendResponse({ status: "ok" });
    } 
    // 2. Lệnh mở Dialog viết lại tùy chỉnh (Dành cho Menu chuột phải)
    else if (message.type === "OPEN_CUSTOM_REWRITE_DIALOG") {
        showCustomRewriteDialog(message.selectionText);
        sendResponse({ status: "dialog_opened" });
    }
    return true;
});

/**
 * Hàm tạo Dialog Full Screen chuẩn Material Design 3
 */
function showCustomRewriteDialog(originalText) {
    const oldDialog = document.getElementById('custom-rewrite-dialog');
    if (oldDialog) oldDialog.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-rewrite-dialog';
    overlay.className = 'dialog-overlay';
    
    overlay.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-header">
                <h3 class="dialog-title">Viết lại tùy chỉnh</h3>
                <p class="dialog-body">Bạn muốn biến đổi văn bản theo phong cách nào?</p>
            </div>
            
            <div class="md3-input-container">
                <input type="text" id="custom-tone-input" class="md3-input"
                    placeholder="Ví dụ: hài hước, kiếm hiệp, Gen Z..." autofocus>
            </div>
            
            <div class="actions">
                <button id="btn-confirm-rewrite" class="btn btn-filled">Thực hiện</button>
                <button id="btn-cancel-rewrite" class="btn btn-text">Hủy</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const input = document.getElementById('custom-tone-input');
    const btnCancel = document.getElementById('btn-cancel-rewrite');
    const btnConfirm = document.getElementById('btn-confirm-rewrite');

    // Ripple effect cho các nút bấm trong Dialog
    [btnCancel, btnConfirm].forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            this.appendChild(ripple);
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    const closeDialog = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    // Chỉ đóng Dialog, không đóng Sidebar để giữ trải nghiệm liên tục
    btnCancel.onclick = closeDialog; 
    
    btnConfirm.onclick = () => {
        const tone = input.value.trim() || "mới lạ";
        const query = `Hãy viết lại "${originalText}" một cách ${tone} hơn, lưu ý chỉ viết lại câu, không viết dài dòng, không giải thích!`;
        performSearch(query, true); // Rewrite luôn dùng AI
        setTimeout(closeDialog, 200);
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') btnConfirm.click();
        if (e.key === 'Escape') closeDialog();
    };
}

// Xử lý ẩn loader khi Iframe đã tải xong
frame.onload = () => loader.classList.add('hidden');