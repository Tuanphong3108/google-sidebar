/**
 * Background.js - Hệ thống điều phối Android 17 (AI Sidebar Edition)
 * Đã lược bỏ logic điều hướng Iframe (để Google tự xử lý theo cài đặt người dùng)
 * Cập nhật: Tóm tắt trang với chrome.scripting và Menu AI Rewrite
 * Chủ sở hữu: Phong (Pixel 10 Pro / Dell Latitude)
 */

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Khởi tạo Menu chuột phải
chrome.runtime.onInstalled.addListener(() => {
  // 1. Tìm kiếm thường
  chrome.contextMenus.create({ 
    id: "searchInSidePanel", 
    title: "Tìm kiếm '%s' với Google", 
    contexts: ["selection"] 
  });
  
  // 2. Tóm tắt trang (Xuất hiện ở mọi ngữ cảnh)
  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Tóm tắt trang này",
    contexts: ["all"] 
  });

  // 3. Viết lại với AI (Cha)
  chrome.contextMenus.create({ 
    id: "rewriteParent", 
    title: "Viết lại với Google AI", 
    contexts: ["selection"] 
  });

  // Sub-menu Viết lại (Dùng đúng ID có dấu từ bản cũ của bro)
  const menuItems = ["Chuyên nghiệp", "Thân thiện", "Dài hơn", "Ngắn hơn"];
  menuItems.forEach(id => {
    chrome.contextMenus.create({ 
      id: `rewrite_${id}`, 
      parentId: "rewriteParent", 
      title: id, 
      contexts: ["selection"] 
    });
  });
});

// Biến lưu trữ Tab ID hiện tại để Sidebar biết mình đang ở đâu (nếu cần)
let activeSidebarTabId = null;

/**
 * Hàm gửi tin nhắn sang sidepanel.js với cơ chế Retry
 */
function sendMessageWithRetry(query, isAI, attempts = 0) {
  chrome.runtime.sendMessage({ type: "SEARCH_QUERY", query: query, isAI: isAI }, (response) => {
    if (chrome.runtime.lastError || !response) {
      if (attempts < 15) {
        setTimeout(() => sendMessageWithRetry(query, isAI, attempts + 1), 200);
      }
    }
  });
}

// Xử lý Click Menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let query = "";
  let isAI = false;

  // TRƯỜNG HỢP 1: Tóm tắt trang (Nâng cấp Hybrid với Scripting)
  if (info.menuItemId === "summarizePage") {
    isAI = true;
    activeSidebarTabId = tab.id;
    chrome.sidePanel.open({ tabId: tab.id });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return document.body.innerText.slice(0, 4000);
      }
    }, (results) => {
      const content = results?.[0]?.result;
      const pageTitle = tab.title || "Trang web này";
      const pageUrl = tab.url || "không xác định";

      if (content && content.trim().length > 100) {
        query = `Hãy tóm tắt nội dung sau đây của trang "${pageTitle}":

${content}

Yêu cầu:
- Dòng đầu: 1 câu tóm tắt tổng quan
- Tiếp theo: 3-5 gạch đầu dòng nội dung quan trọng nhất
- Chỉ viết tóm tắt, không giải thích, không hỏi thêm!`;
      } else {
        query = `Hãy tóm tắt trang ${pageTitle}, đường dẫn là ${pageUrl} theo cách chuyên nghiệp nhất. Lưu ý chỉ viết bản tóm tắt, không giải thích, không hỏi thêm!`;
      }
      
      sendMessageWithRetry(query, isAI);
    });
    return;
  } 

  // TRƯỜNG HỢP 2: Viết lại văn bản bôi đen
  else if (info.menuItemId.startsWith("rewrite_")) {
    isAI = true;
    const selection = info.selectionText;
    const styleMap = { 
      "rewrite_Chuyên nghiệp": "chuyên nghiệp", 
      "rewrite_Thân thiện": "thân thiện", 
      "rewrite_Dài hơn": "dài hơn", 
      "rewrite_Ngắn hơn": "ngắn hơn" 
    };
    const style = styleMap[info.menuItemId] || "hay";
    query = `Hãy viết lại "${selection}" một cách ${style} hơn, lưu ý chỉ viết lại câu, không viết dài dòng, không giải thích, không hỏi thêm!`;
  }
  
  // TRƯỜNG HỢP 3: Tìm kiếm thông thường
  else if (info.menuItemId === "searchInSidePanel") {
    query = info.selectionText;
  }

  if (!query) return;

  activeSidebarTabId = tab.id;
  chrome.sidePanel.open({ tabId: tab.id });
  sendMessageWithRetry(query, isAI);
});

// Lắng nghe sự kiện đóng tab để reset state (giữ code sạch)
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeSidebarTabId) activeSidebarTabId = null;
});