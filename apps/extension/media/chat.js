// @ts-nocheck
// Router 402 Chat Webview Client Script

(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  const messagesContainer = document.getElementById("messagesContainer");
  const emptyState = document.getElementById("emptyState");
  const messageInput = document.getElementById("messageInput");
  const btnSend = document.getElementById("btnSend");
  const btnNewChat = document.getElementById("btnNewChat");
  const walletBadge = document.getElementById("walletBadge");

  let isGenerating = false;
  let currentAssistantEl = null;
  let currentStreamText = "";

  // Auto-resize textarea
  messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  // Send on Enter (Shift+Enter for newline)
  messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  btnSend.addEventListener("click", sendMessage);

  btnNewChat.addEventListener("click", function () {
    // Abort any in-flight request before clearing
    if (isGenerating) {
      vscode.postMessage({ type: "stopGeneration" });
    }
    vscode.postMessage({ type: "clearChat" });
    // Clear all messages from the UI
    var messages = messagesContainer.querySelectorAll(".message, .loading-indicator");
    messages.forEach(function (el) { el.remove(); });
    // Show empty state again
    if (emptyState) {
      emptyState.style.display = "";
    }
    isGenerating = false;
    currentAssistantEl = null;
    currentStreamText = "";
    btnSend.disabled = false;
  });

  // Quick action buttons
  document.querySelectorAll(".quick-action-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var action = this.getAttribute("data-action");
      if (action === "review") {
        vscode.postMessage({ type: "reviewFile" });
      }
    });
  });

  /** Sends the current input as a message. */
  function sendMessage() {
    var text = messageInput.value.trim();
    if (!text || isGenerating) return;
    sendUserMessage(text);
  }

  /** Sends a user message and updates the UI. */
  function sendUserMessage(fullText, displayText) {
    if (!displayText) displayText = fullText;

    hideEmptyState();
    addMessage("user", displayText);

    messageInput.value = "";
    messageInput.style.height = "auto";

    vscode.postMessage({ type: "sendMessage", text: fullText });
  }

  /** Hides the empty state. */
  function hideEmptyState() {
    if (emptyState) {
      emptyState.style.display = "none";
    }
  }

  /** Adds a message bubble to the chat. */
  function addMessage(role, content) {
    const messageEl = document.createElement("div");
    messageEl.className = "message " + role;

    const roleEl = document.createElement("div");
    roleEl.className = "message-role";
    roleEl.textContent = role === "user" ? "You" : "Router 402";

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";
    contentEl.innerHTML = renderMarkdown(content);

    messageEl.appendChild(roleEl);
    messageEl.appendChild(contentEl);
    messagesContainer.appendChild(messageEl);

    attachCodeBlockActions(contentEl);
    scrollToBottom();

    return contentEl;
  }

  /** Shows a loading indicator. */
  function showLoading() {
    const loadingEl = document.createElement("div");
    loadingEl.className = "loading-indicator";
    loadingEl.id = "loadingIndicator";
    loadingEl.innerHTML =
      '<div class="loading-dots"><span></span><span></span><span></span></div>' +
      "<span>Thinking...</span>";
    messagesContainer.appendChild(loadingEl);
    scrollToBottom();
  }

  /** Removes the loading indicator. */
  function hideLoading() {
    const el = document.getElementById("loadingIndicator");
    if (el) el.remove();
  }

  /** Scrolls the messages container to the bottom. */
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /** Renders basic markdown to HTML. */
  function renderMarkdown(text) {
    if (!text) return "";

    let html = text
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      const id = "code-" + Math.random().toString(36).substr(2, 9);
      return (
        '<pre data-code-id="' + id + '">' +
        '<div class="code-block-actions">' +
        '<button class="code-action-btn" data-action="copy" data-code-id="' + id + '">Copy</button>' +
        '<button class="code-action-btn" data-action="insert" data-code-id="' + id + '">Insert</button>' +
        "</div>" +
        "<code>" + code + "</code></pre>"
      );
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Lists
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
    html = html.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, "<ul>$1</ul>");

    // Paragraphs (double newline)
    html = html.replace(/\n\n/g, "</p><p>");

    // Single newlines to <br>
    html = html.replace(/\n/g, "<br>");

    return "<p>" + html + "</p>";
  }

  /** Attaches copy/insert actions to code blocks. */
  function attachCodeBlockActions(container) {
    container.querySelectorAll(".code-action-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = this.getAttribute("data-action");
        const codeId = this.getAttribute("data-code-id");
        const preEl = container.querySelector('[data-code-id="' + codeId + '"]');
        if (!preEl) return;

        const codeEl = preEl.querySelector("code");
        if (!codeEl) return;

        const code = codeEl.textContent || "";

        if (action === "copy") {
          navigator.clipboard.writeText(code).then(function () {
            btn.textContent = "Copied!";
            setTimeout(function () { btn.textContent = "Copy"; }, 1500);
          });
        } else if (action === "insert") {
          vscode.postMessage({ type: "insertCode", code: code });
          btn.textContent = "Inserted!";
          setTimeout(function () { btn.textContent = "Insert"; }, 1500);
        }
      });
    });
  }

  // Handle messages from the extension
  window.addEventListener("message", function (event) {
    const message = event.data;

    switch (message.type) {
      case "config":
        if (walletBadge) {
          walletBadge.textContent = message.walletAddress || "No wallet";
        }
        break;

      case "startResponse":
        isGenerating = true;
        btnSend.disabled = true;
        showLoading();
        currentStreamText = "";
        currentAssistantEl = null;
        break;

      case "streamChunk":
        if (!currentAssistantEl) {
          hideLoading();
          currentAssistantEl = addMessage("assistant", "");
        }
        currentStreamText += message.text;
        currentAssistantEl.innerHTML = renderMarkdown(currentStreamText);
        attachCodeBlockActions(currentAssistantEl);
        scrollToBottom();
        break;

      case "endResponse":
        isGenerating = false;
        btnSend.disabled = false;
        hideLoading();
        if (!currentAssistantEl && currentStreamText) {
          currentAssistantEl = addMessage("assistant", currentStreamText);
        }
        currentAssistantEl = null;
        currentStreamText = "";
        break;

      case "addUserMessage":
        hideEmptyState();
        addMessage("user", message.text);
        break;
    }
  });
})();
