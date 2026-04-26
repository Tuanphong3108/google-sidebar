/**
 * Background.js - Hệ thống điều phối Android 17 (AI Sidebar Edition)
 * Cập nhật: Thêm handler cho nút "Tóm tắt trang" từ Quick Search
 */

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Khởi tạo Menu chuột phải
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ 
    id: "searchInSidePanel", 
    title: "Tìm kiếm '%s' với Google", 
    contexts: ["selection"] 
  });
  
  chrome.contextMenus.create({
    id: "explainContent",
    title: "Giải thích nội dung này",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "summarizePage",
    title: "Tóm tắt trang này",
    contexts: ["all"] 
  });

  chrome.contextMenus.create({ 
    id: "rewriteParent", 
    title: "Viết lại với Google AI", 
    contexts: ["selection"] 
  });

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

let activeSidebarTabId = null;

function sendMessageWithRetry(message, attempts = 0) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError || !response) {
      if (attempts < 15) {
        setTimeout(() => sendMessageWithRetry(message, attempts + 1), 200);
      }
    }
  });
}

// Hàm tóm tắt trang dùng chung
function handleSummarizePage(tab) {
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText.slice(0, 4000)
  }, (results) => {
    const content = results?.[0]?.result;
    const pageTitle = tab.title || "Trang web này";
    const pageUrl = tab.url || "không xác định";

    let query = "";
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
    
    sendMessageWithRetry({ type: "SEARCH_QUERY", query: query, isAI: true });
  });
}

// Xử lý Click Menu chuột phải
chrome.contextMenus.onClicked.addListener((info, tab) => {
  activeSidebarTabId = tab.id;

  if (info.menuItemId === "rewrite_Tùy chỉnh...") {
    chrome.sidePanel.open({ tabId: tab.id });
    sendMessageWithRetry({ 
      type: "OPEN_CUSTOM_REWRITE_DIALOG", 
      selectionText: info.selectionText 
    });
    return;
  }

  if (info.menuItemId === "summarizePage") {
    handleSummarizePage(tab);
    return;
  }

  // Các trường hợp khác... (rút gọn để tập trung logic mới)
  let query = "";
  let isAI = false;
  if (info.menuItemId === "explainContent") {
    isAI = true;
    query = `Hãy giải thích nội dung "${info.selectionText}" một cách ngắn gọn, dễ hiểu và chuyên sâu.`;
  } else if (info.menuItemId.startsWith("rewrite_")) {
    isAI = true;
    const style = info.menuItemId.replace("rewrite_", "");
    query = `Hãy viết lại "${info.selectionText}" một cách ${style} hơn.`;
  } else if (info.menuItemId === "searchInSidePanel") {
    query = info.selectionText;
  }

  if (query) {
    chrome.sidePanel.open({ tabId: tab.id });
    sendMessageWithRetry({ type: "SEARCH_QUERY", query: query, isAI: isAI });
  }
});

// Lắng nghe từ Quick Search
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL") {
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => sendResponse({ status: "opened" }));
    return true;
  }

  if (message.type === "TRIGGER_SUMMARY_FROM_QS") {
    handleSummarizePage(sender.tab);
    sendResponse({ status: "summarizing" });
  }

  if (message.type === "QUICK_SEARCH_TRIGGER") {
    sendMessageWithRetry({ type: "SEARCH_QUERY", query: message.query, isAI: message.isAI });
    sendResponse({ status: "query_sent" });
  }
});