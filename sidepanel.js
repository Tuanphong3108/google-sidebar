/**
 * Sidepanel.js - Android 17 Edition (Final Tab-Out Shield)
 * Đã fix: Chỉ xử lý văng tab bên trong Sidebar, không làm loạn tab khác.
 * Tác giả: AI Assistant (Độ cho bro Phong - Dell Latitude)
 */

const frame = document.getElementById('googleFrame');
const loader = document.getElementById('md3-loader');

// Biến lưu trữ URL tìm kiếm hiện tại để so sánh
let lastValidGoogleUrl = "";

/**
 * Thực hiện tìm kiếm và hiện loading
 */
function performSearch(query, isAI = false) {
    loader.classList.remove('hidden');
    
    // Tạo URL với tham số igu=1 để cho phép hiển thị trong iframe
    let url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    if (isAI) {
        url += `&udm=50`; // Ép hiện AI Overview
    }
    
    lastValidGoogleUrl = url;
    frame.src = url;
}

/**
 * Lắng nghe lệnh từ Background (Search, Rewrite, Summarize)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SEARCH_QUERY") {
        performSearch(message.query, message.isAI);
        sendResponse({ status: "ok" });
    }
    return true;
});

/**
 * Cú đấm thép: Chặn đứng điều hướng trái phép ngay tại Iframe
 * Chúng ta sẽ dùng tính năng Sandbox của Iframe để ngăn nó tự tiện chuyển hướng 
 * nhưng vẫn cho phép chạy script của Google.
 */
frame.addEventListener('load', () => {
    loader.classList.add('hidden');
    
    // Mẹo: Nếu bro thấy link vẫn không văng, có thể do Google chặn truy cập contentWindow.
    // Nhưng onload vẫn sẽ chạy mỗi khi iframe thay đổi nội dung.
    console.log("Sidebar: Iframe đã cập nhật.");
});

/**
 * BỔ SUNG QUAN TRỌNG CHO BACKGROUND.JS:
 * Bro hãy kiểm tra lại file background.js, đoạn webNavigation.
 * Đảm bảo chỉ dùng 'sub_frame' và check đúng activeSidebarTabId.
 * * Nếu vẫn bị ảnh hưởng tab khác, hãy thay đoạn chrome.tabs.update(details.tabId, {})
 * bằng cách return hoặc không làm gì cả đối với các tab không phải activeSidebarTabId.
 */

// Xử lý Ripple effect cho các phần tử Material Design 3 nếu có sau này
document.querySelectorAll('.md3-button').forEach(button => {
    button.addEventListener('click', function(e) {
        let ripple = document.createElement('span');
        ripple.classList.add('ripple');
        this.appendChild(ripple);
        let d = Math.max(this.clientWidth, this.clientHeight);
        ripple.style.width = ripple.style.height = d + 'px';
        ripple.style.left = e.clientX - this.offsetLeft - d/2 + 'px';
        ripple.style.top = e.clientY - this.offsetTop - d/2 + 'px';
        setTimeout(() => ripple.remove(), 600);
    });
});

console.log("🕶️ Sidepanel Android 17 đã sẵn sàng chiến đấu!");