/**
 * Background.js - Hệ thống điều phối Android 17 (AI Sidebar Edition)
 * Cập nhật: Khôi phục Prompt gốc chuẩn Phong - Thêm logic Dialog "Tùy chỉnh..."
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
  
  // 2. Giải thích nội dung
  chrome.contextMenus.create({
    id: "explainContent",
    title: "Giải thích nội dung này",
    contexts: ["selection"]
  });

  // 3. Tóm tắt trang
  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Tóm tắt trang này",
    contexts: ["all"] 
  });

  // 4. Viết lại với AI (Cha)
  chrome.contextMenus.create({ 
    id: "rewriteParent", 
    title: "Viết lại với Google AI", 
    contexts: ["selection"] 
  });

  // Sub-menu Viết lại (Hợp nhất Prompt gốc + Tùy chỉnh)
  const menuItems = ["Chuyên nghiệp", "Thân thiện", "Dài hơn", "Ngắn hơn", "Tùy chỉnh..."];
  menuItems.forEach(id => {
    chrome.contextMenus.create({ 
      id: `rewrite_${id}`, 
      parentId: "rewriteParent", 
      title: id, 
      contexts: ["selection"] 
    });
  });
});

// Biến lưu trữ Tab ID hiện tại
let activeSidebarTabId = null;

/**
 * Hàm gửi tin nhắn sang sidepanel.js với cơ chế Retry
 */
function sendMessageWithRetry(message, attempts = 0) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError || !response) {
      if (attempts < 15) {
        setTimeout(() => sendMessageWithRetry(message, attempts + 1), 200);
      }
    }
  });
}

// Xử lý Click Menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  activeSidebarTabId = tab.id;

  // TRƯỜNG HỢP: Viết lại "Tùy chỉnh..." -> Kích hoạt Dialog Full Screen
  if (info.menuItemId === "rewrite_Tùy chỉnh...") {
    chrome.sidePanel.open({ tabId: tab.id });
    sendMessageWithRetry({ 
      type: "OPEN_CUSTOM_REWRITE_DIALOG", 
      selectionText: info.selectionText 
    });
    return;
  }

  let query = "";
  let isAI = false;

  // TRƯỜNG HỢP: Giải thích nội dung (PROMPT GỐC CỦA BRO PHONG)
  if (info.menuItemId === "explainContent") {
    isAI = true;
    const content = info.selectionText;
    query = `Hãy giải thích nội dung "${content}" một cách ngắn gọn, dễ hiểu và chuyên sâu. 
    Yêu cầu:
    - Giải thích bản chất là gì.
    - Tại sao nó quan trọng hoặc ngữ cảnh sử dụng.
    - Không giải thích dài dòng, không hỏi thêm!`;
  }
  // TRƯỜNG HỢP: Tóm tắt trang (PROMPT GỐC CỦA BRO PHONG)
  else if (info.menuItemId === "summarizePage") {
    isAI = true;
    chrome.sidePanel.open({ tabId: tab.id });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText.slice(0, 4000)
    }, (results) => {
      const content = results?.[0]?.result;
      const pageTitle = tab.title || "Trang web này";
      const pageUrl = tab.url || "không xác định";

      if (content && content.trim().length > 100) {
        query = `Hãy tóm tắt nội dung sau đây của trang "${pageTitle}" từ URL ${pageUrl}:

${content}

Yêu cầu:
- Dòng đầu: 1 câu tóm tắt tổng quan.
- Tiếp theo: 3-5 gạch đầu dòng nội dung quan trọng nhất.
- Chỉ viết tóm tắt, không giải thích, không hỏi thêm!`;
      } else {
        query = `Hãy tóm tắt trang ${pageTitle}, đường dẫn là ${pageUrl} theo cách chuyên nghiệp nhất.`;
      }
      
      sendMessageWithRetry({ type: "SEARCH_QUERY", query: query, isAI: isAI });
    });
    return;
  } 
  // TRƯỜNG HỢP: Viết lại văn bản (PROMPT GỐC CỦA BRO PHONG)
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
  // TRƯỜNG HỢP: Tìm kiếm thông thường
  else if (info.menuItemId === "searchInSidePanel") {
    query = info.selectionText;
  }

  if (!query) return;

  chrome.sidePanel.open({ tabId: tab.id });
  sendMessageWithRetry({ type: "SEARCH_QUERY", query: query, isAI: isAI });
});

// Reset state
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeSidebarTabId) activeSidebarTabId = null;
});
