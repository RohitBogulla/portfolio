/* =========================================================
   Ask-Rohit chat widget
   Sends each question to the Django endpoint and shows the answer.
   ========================================================= */


(function () {
  "use strict";

  const API_URL =
    "https://portfolio-rag-api-dusky.vercel.app/api/query/";

  const MAX_CHARS = 3000;
  const TIMEOUT_MS = 60000;
  const STORAGE_KEY = "ask-rohit-history-v1";

  const SUGGESTIONS = [
    "What did Rohit work on at Oracle?",
    "What's his experience with agentic AI?",
    "What projects has Rohit built outside of work?",
    "What is he looking for next?",
  ];

  const root = document.getElementById("chat");
  if (!root) return;

  const launcher = root.querySelector(".chat-launcher");
  const panel = root.querySelector(".chat-panel");
  const log = root.querySelector(".chat-log");
  const form = root.querySelector(".chat-form");
  const input = root.querySelector(".chat-input");
  const sendBtn = root.querySelector(".chat-send");
  const closeBtn = root.querySelector("[data-chat-close]");
  const resetBtn = root.querySelector("[data-chat-reset]");

  if (
    ![launcher, panel, log, form, input, sendBtn, closeBtn, resetBtn]
      .every(Boolean)
  ) {
    return;
  }

  let busy = false;
  let history = loadHistory();

  input.maxLength = MAX_CHARS;

  // Keep complete exchanges within the backend's limits:
  // 10 messages, 6000 characters per message, 20000 total.
  function boundedHistory(messages) {
    if (!Array.isArray(messages)) return [];

    const pairs = [];

    for (let i = 0; i + 1 < messages.length; i += 2) {
      const user = messages[i];
      const assistant = messages[i + 1];

      if (
        !user ||
        !assistant ||
        user.role !== "user" ||
        assistant.role !== "assistant" ||
        typeof user.content !== "string" ||
        typeof assistant.content !== "string" ||
        !user.content.trim() ||
        !assistant.content.trim() ||
        user.content.length > 6000 ||
        assistant.content.length > 6000
      ) {
        continue;
      }

      pairs.push([
        { role: "user", content: user.content },
        { role: "assistant", content: assistant.content },
      ]);
    }

    const retained = [];
    let chars = 0;

    for (let i = pairs.length - 1; i >= 0; i--) {
      const size =
        pairs[i][0].content.length + pairs[i][1].content.length;

      if (retained.length + 2 > 10 || chars + size > 20000) {
        break;
      }

      retained.unshift(...pairs[i]);
      chars += size;
    }

    return retained;
  }

  function loadHistory() {
    try {
      return boundedHistory(
        JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]")
      );
    } catch (_) {
      return [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (_) {
      // In-memory history still works if storage is unavailable.
    }
  }

  function open() {
    root.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");

    if (!log.children.length) renderIntro();

    setTimeout(() => input.focus(), 50);
  }

  function close() {
    root.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    launcher.focus();
  }

  launcher.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("open")) {
      close();
    }
  });

  resetBtn.addEventListener("click", () => {
    if (busy) return;

    history = [];

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}

    log.replaceChildren();
    input.value = "";
    autoGrow();
    renderIntro();
    updateSendState();
    input.focus();
  });

  function renderIntro() {
    const intro = document.createElement("div");
    intro.className = "chat-intro";

    const p = document.createElement("p");
    p.textContent =
      "Ask me anything about Rohit's experience, projects, or skills.";

    intro.appendChild(p);

    const chips = document.createElement("div");
    chips.className = "chat-suggestions";

    SUGGESTIONS.forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-suggestion";
      button.textContent = question;
      button.addEventListener("click", () => ask(question));
      chips.appendChild(button);
    });

    intro.appendChild(chips);
    log.appendChild(intro);
  }

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = "chat-msg " + role;

    if (role === "bot") {
      el.innerHTML = renderMarkdown(text);

      el.querySelectorAll("a").forEach((a) => {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
    } else {
      el.textContent = text;
    }

    log.appendChild(el);
    scrollToBottom();

    return el;
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "chat-msg bot";
    el.setAttribute("aria-label", "Rohit's assistant is typing");
    el.innerHTML =
      '<span class="chat-typing">' +
      "<span></span><span></span><span></span></span>";

    log.appendChild(el);
    scrollToBottom();

    return el;
  }

  function renderMarkdown(text) {
    if (window.marked && window.DOMPurify) {
      return window.DOMPurify.sanitize(window.marked.parse(text), {
        FORBID_TAGS: [
          "img", "style", "form", "input", "button", "iframe",
        ],
      });
    }

    const div = document.createElement("div");
    div.textContent = text;

    return div.innerHTML.replace(/\n/g, "<br>");
  }

  function scrollToBottom() {
    log.scrollTop = log.scrollHeight;
  }

  function updateSendState() {
    sendBtn.disabled = busy || !input.value.trim();
    resetBtn.disabled = busy;
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  input.addEventListener("input", () => {
    autoGrow();
    updateSendState();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });

  async function ask(raw) {
    const question = raw.trim().slice(0, MAX_CHARS);
    if (!question || busy) return;

    busy = true;
    input.value = "";
    autoGrow();
    updateSendState();

    const intro = log.querySelector(".chat-intro");
    if (intro) intro.remove();

    addMessage("user", question);
    const typing = addTyping();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Send prior successful exchanges, excluding this question.
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query_text: question,
          history: boundedHistory(history),
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        addMessage("error", errorMessage(res.status));
        return;
      }

      if (
        !data ||
        typeof data.response_text !== "string" ||
        !data.response_text.trim()
      ) {
        addMessage(
          "error",
          "The assistant returned an empty answer. Please try again."
        );
        return;
      }

      const answer = data.response_text.trim();

      typing.remove();
      addMessage("bot", answer);

      // Save only successful question/answer pairs.
      history = boundedHistory([
        ...history,
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ]);

      saveHistory();
    } catch (err) {
      addMessage(
        "error",
        err.name === "AbortError"
          ? "That took too long. Please try again."
          : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      typing.remove();
      clearTimeout(timer);
      busy = false;
      updateSendState();
      input.focus();
    }
  }

  function errorMessage(status) {
    if (status === 400) {
      return "That question couldn't be sent. Try rephrasing it.";
    }
    if (status === 429) {
      return "Too many questions at once. Please wait a moment.";
    }
    if (status >= 500) {
      return "The assistant is unavailable right now. Please try again shortly.";
    }

    return "Something went wrong (" + status + ").";
  }

  // Restore the recent conversation after a refresh.
  log.replaceChildren();

  if (history.length) {
    history.forEach((message) => {
      addMessage(
        message.role === "assistant" ? "bot" : "user",
        message.content
      );
    });
  } else {
    renderIntro();
  }

  updateSendState();
})();

// (function () {
//   "use strict";

//   // ---- Config ------------------------------------------------
//   // Replace with your deployed API URL. Keep the trailing slash:
//   // the Django route is /api/query/.
//   // const API_URL = "http://localhost:8000/api/query/";
//   const API_URL = "https://portfolio-rag-api-dusky.vercel.app/api/query/";

//   const MAX_CHARS = 4000;         // matches QueryRequestSerializer max_length
//   const TIMEOUT_MS = 60000;       // long context → answers can take a while
//   const SUGGESTIONS = [
//     "What did Rohit work on at Oracle?",
//     "What's his experience with agentic AI?",
//     "Which projects use Kafka or Spark?",
//     "What is he looking for next?",
//   ];

//   // ---- Elements ----------------------------------------------
//   const root     = document.getElementById("chat");
//   if (!root) return;
//   const launcher = root.querySelector(".chat-launcher");
//   const panel    = root.querySelector(".chat-panel");
//   const log      = root.querySelector(".chat-log");
//   const form     = root.querySelector(".chat-form");
//   const input    = root.querySelector(".chat-input");
//   const sendBtn  = root.querySelector(".chat-send");
//   const closeBtn = root.querySelector("[data-chat-close]");
//   const resetBtn = root.querySelector("[data-chat-reset]");

//   let busy = false;

//   // ---- Open / close ------------------------------------------
//   function open() {
//     root.classList.add("open");
//     launcher.setAttribute("aria-expanded", "true");
//     panel.setAttribute("aria-hidden", "false");
//     if (!log.children.length) renderIntro();
//     setTimeout(() => input.focus(), 50);
//   }

//   function close() {
//     root.classList.remove("open");
//     launcher.setAttribute("aria-expanded", "false");
//     panel.setAttribute("aria-hidden", "true");
//     launcher.focus();
//   }

//   launcher.addEventListener("click", open);
//   closeBtn.addEventListener("click", close);
//   document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape" && root.classList.contains("open")) close();
//   });

//   resetBtn.addEventListener("click", () => {
//     if (busy) return;
//     log.innerHTML = "";
//     renderIntro();
//     input.focus();
//   });

//   // ---- Rendering ---------------------------------------------
//   function renderIntro() {
//     const intro = document.createElement("div");
//     intro.className = "chat-intro";
//     intro.innerHTML =
//       "<p>Ask me anything about Rohit's experience, projects, or skills.</p>";

//     const chips = document.createElement("div");
//     chips.className = "chat-suggestions";
//     SUGGESTIONS.forEach((q) => {
//       const b = document.createElement("button");
//       b.type = "button";
//       b.className = "chat-suggestion";
//       b.textContent = q;
//       b.addEventListener("click", () => ask(q));
//       chips.appendChild(b);
//     });

//     intro.appendChild(chips);
//     log.appendChild(intro);
//   }

//   function addMessage(role, text) {
//     const el = document.createElement("div");
//     el.className = "chat-msg " + role;
//     if (role === "bot") {
//       el.innerHTML = renderMarkdown(text);
//       el.querySelectorAll("a").forEach((a) => {
//         a.target = "_blank";
//         a.rel = "noopener noreferrer";
//       });
//     } else {
//       el.textContent = text;
//     }
//     log.appendChild(el);
//     scrollToBottom();
//     return el;
//   }

//   function addTyping() {
//     const el = document.createElement("div");
//     el.className = "chat-msg bot";
//     el.setAttribute("aria-label", "Rohit's assistant is typing");
//     el.innerHTML = '<span class="chat-typing"><span></span><span></span><span></span></span>';
//     log.appendChild(el);
//     scrollToBottom();
//     return el;
//   }

//   // LLM output is untrusted: render Markdown, then strip anything unsafe.
//   function renderMarkdown(text) {
//     if (window.marked && window.DOMPurify) {
//       return window.DOMPurify.sanitize(window.marked.parse(text), {
//         FORBID_TAGS: ["img", "style", "form", "input", "button", "iframe"],
//       });
//     }
//     const div = document.createElement("div");
//     div.textContent = text;
//     return div.innerHTML.replace(/\n/g, "<br>");
//   }

//   function scrollToBottom() {
//     log.scrollTop = log.scrollHeight;
//   }

//   // ---- Input behaviour ---------------------------------------
//   function updateSendState() {
//     sendBtn.disabled = busy || !input.value.trim();
//   }

//   function autoGrow() {
//     input.style.height = "auto";
//     input.style.height = Math.min(input.scrollHeight, 120) + "px";
//   }

//   input.addEventListener("input", () => { autoGrow(); updateSendState(); });
//   input.addEventListener("keydown", (e) => {
//     // Enter sends, Shift+Enter adds a new line
//     if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
//       e.preventDefault();
//       form.requestSubmit();
//     }
//   });

//   form.addEventListener("submit", (e) => {
//     e.preventDefault();
//     ask(input.value);
//   });

//   // ---- API call ----------------------------------------------
//   async function ask(raw) {
//     const question = raw.trim().slice(0, MAX_CHARS);
//     if (!question || busy) return;

//     busy = true;
//     input.value = "";
//     autoGrow();
//     updateSendState();

//     const intro = log.querySelector(".chat-intro");
//     if (intro) intro.remove();

//     addMessage("user", question);
//     const typing = addTyping();

//     const controller = new AbortController();
//     const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

//     try {

//       const result = await fetch(API_URL, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           query_text: currentQuestion,
//           history: previousMessages.slice(-10).map(message => ({
//             role: message.role,
//             content: message.content,
//           })),
//         }),
//       });
//       const res = await fetch(API_URL, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Accept: "application/json" },
//         body: JSON.stringify({ "query_text": question }),
//         signal: controller.signal,
//       });

//       const data = await res.json().catch(() => ({}));
//       typing.remove();

//       console.log("API response:", res.status, data);

//       if (!res.ok) {
//         addMessage("error", errorMessage(res.status, data));
//         return;
//       }

//       addMessage("bot", data.response_text || "I couldn't come up with an answer to that.");
//     } catch (err) {
//       typing.remove();
//       addMessage(
//         "error",
//         err.name === "AbortError"
//           ? "That took too long. Please try again."
//           : "Couldn't reach the server. Check your connection and try again."
//       );
//     } finally {
//       clearTimeout(timer);
//       busy = false;
//       updateSendState();
//       input.focus();
//     }
//   }

//   function errorMessage(status, data) {
//     if (status === 400) return "That question couldn't be sent. Try rephrasing it.";
//     if (status === 429) return "Too many questions at once. Please wait a moment.";
//     if (status >= 500)  return "The assistant is unavailable right now. Please try again shortly.";
//     return (data && (data.error || data.detail)) || "Something went wrong (" + status + ").";
//   }

//   updateSendState();
// })();