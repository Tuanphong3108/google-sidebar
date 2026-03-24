/**
 * Background.js - Hệ thống điều phối Android 17 (Ultra Tab-Out Fix + AI Summarizer Hybrid)
 * Đảm bảo link ngoài chỉ mở trong tab mới KHI Ở TRONG SIDEBAR
 * Cập nhật: Nâng cấp "Tóm tắt trang này" với khả năng đọc nội dung trực tiếp (chrome.scripting)
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

// Biến lưu trữ Tab ID đang sử dụng Sidebar để tránh làm phiền các tab khác
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

    // Sử dụng scripting để lấy nội dung text thực tế của trang
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Lấy khoảng 4000 ký tự đầu tiên để tránh quá tải
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

  // Ghi nhớ Tab ID này là tab đang dùng Sidebar
  activeSidebarTabId = tab.id;
  chrome.sidePanel.open({ tabId: tab.id });
  sendMessageWithRetry(query, isAI);
});

/**
 * TUYỆT KỸ VĂNG TAB: Đã được "xích" lại để chỉ ảnh hưởng Iframe bên trong Sidebar của đúng tab đang dùng
 */
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // KIỂM TRA ĐIỀU KIỆN CHẶT CHẼ:
  // 1. details.tabId === activeSidebarTabId: Chỉ tab đang tương tác với Sidebar mới bị xử lý
  // 2. details.frameId > 0: Chỉ bắt link trong Iframe (Sidebar)
  // 3. details.parentFrameId === 0: Đảm bảo đây là Iframe chính của Sidebar, không phải quảng cáo lồng nhau
  if (activeSidebarTabId && details.tabId === activeSidebarTabId && details.frameId > 0) {
    const url = details.url;
    
    // Vùng an toàn của Google
    const isGoogleSearch = url.includes("google.com/search");
    const isGoogleAccount = url.includes("accounts.google.com");
    const isBlank = url === "about:blank";

    // Nếu link định "vượt rào" ra khỏi trang tìm kiếm Google
    if (!isGoogleSearch && !isGoogleAccount && !isBlank) {
      // Mở ngay tab mới trên máy bro
      chrome.tabs.create({ url: url });
      
      // Chặn đứng việc chuyển trang ngay trong Iframe Sidebar
      chrome.tabs.update(details.tabId, {}); 
    }
  }
});

// Giải phóng bộ nhớ khi Tab bị đóng
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeSidebarTabId) {
    activeSidebarTabId = null;
  }
});