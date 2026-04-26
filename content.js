/**
 * Content.js - Hệ thống bắt phím tắt Quick Search (Android 17 Style)
 * Tác giả: AI Assistant (Độ cho bro Phong)
 * Cập nhật: Thêm nút "Tóm tắt trang này" dưới Search Box
 */

let qsRoot = null;

// Tự động chèn Material Symbols vào trang web
const injectMaterialSymbols = () => {
    if (document.getElementById('phong-ms-link')) return;
    const link = document.createElement('link');
    link.id = 'phong-ms-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
    document.head.appendChild(link);
};

injectMaterialSymbols();

/**
 * Hàm tạo giao diện Quick Search Bar + Nút Tóm tắt
 */
function createQuickSearchUI() {
    if (qsRoot) return;

    qsRoot = document.createElement('div');
    qsRoot.id = 'phong-qs-root';
    
    const iconUrl = chrome.runtime.getURL('icon.png');

    qsRoot.innerHTML = `
        <div class="qs-container">
            <div class="qs-bar">
                <img src="${iconUrl}" class="qs-icon" alt="App Icon">
                <input type="text" class="qs-input" placeholder="Hỏi bất kỳ điều gì" autofocus>
                <div class="qs-actions">
                    <button class="qs-action-btn qs-search-submit" title="Tìm kiếm">
                        <span class="material-symbols-outlined">search</span>
                    </button>
                    <button class="qs-action-btn qs-close" title="Đóng">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
            <!-- Nút Tóm tắt trang dưới text box -->
            <div class="qs-quick-actions">
                <button class="qs-summary-btn">
                    <span class="material-symbols-outlined">summarize</span>
                    Tóm tắt trang này
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(qsRoot);

    const input = qsRoot.querySelector('.qs-input');
    const searchBtn = qsRoot.querySelector('.qs-search-submit');
    const closeBtn = qsRoot.querySelector('.qs-close');
    const summaryBtn = qsRoot.querySelector('.qs-summary-btn');

    const triggerSearch = async () => {
        const query = input.value.trim();
        if (query) {
            chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }, () => {
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        type: "QUICK_SEARCH_TRIGGER",
                        query: query,
                        isAI: true
                    });
                }, 100);
            });
            hideQuickSearch();
        }
    };

    // Kích hoạt logic tóm tắt trang từ background
    const triggerSummary = () => {
        chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }, () => {
            // Gửi tin nhắn giả lập click vào menu context "summarizePage"
            chrome.runtime.sendMessage({ type: "TRIGGER_SUMMARY_FROM_QS" });
        });
        hideQuickSearch();
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') triggerSearch();
        if (e.key === 'Escape') hideQuickSearch();
    });

    searchBtn.onclick = triggerSearch;
    closeBtn.onclick = hideQuickSearch;
    summaryBtn.onclick = triggerSummary;
    
    qsRoot.onclick = (e) => {
        if (e.target === qsRoot) hideQuickSearch();
    };

    setTimeout(() => input.focus(), 50);
}

function hideQuickSearch() {
    if (qsRoot) {
        qsRoot.remove();
        qsRoot = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyG') {
        e.preventDefault();
        createQuickSearchUI();
    }
});