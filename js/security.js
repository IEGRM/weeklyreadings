(() => {
  "use strict";

  const CONFIG = {
    blockContextMenu: true,
    blockSelection: true,
    blockCopy: true,
    blockCut: true,
    blockPaste: true,
    blockDrag: true,
    blockPrint: true,
    blockCommonShortcuts: true,
    protectOnBlur: true,
    watermark: true
  };

  const ALLOW_SELECTOR = [
    "#institutionField",
    "#courseField",
    "#idField",
    "#nameField",
    "#evidenceTitleField",
    "input",
    "textarea",
    "select",
    "[contenteditable='true']"
  ].join(",");

  function isEditableTarget(target) {
    return !!(target && target.closest && target.closest(ALLOW_SELECTOR));
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      html, body {
        -webkit-touch-callout: none;
      }

      body.security-lock,
      body.security-lock *:not(input):not(textarea):not(select):not(option) {
        -webkit-user-select: none !important;
        user-select: none !important;
      }

      input, textarea, select, option {
        -webkit-user-select: text !important;
        user-select: text !important;
      }

      .security-screen-shield {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #f4f7ff;
        color: #1f2a44;
        text-align: center;
        font-family: "Segoe UI", Arial, sans-serif;
      }

      .security-screen-shield.active {
        display: flex;
      }

      .security-screen-shield__card {
        width: min(520px, 92vw);
        padding: 28px;
        border-radius: 22px;
        background: #fff;
        box-shadow: 0 18px 50px rgba(34, 49, 95, .18);
      }

      .security-screen-shield__card strong {
        display: block;
        margin-bottom: 8px;
        font-size: 1.2rem;
      }

      .security-watermark {
        position: fixed;
        right: 14px;
        bottom: max(14px, env(safe-area-inset-bottom));
        z-index: 2147483000;
        pointer-events: none;
        opacity: .16;
        font: 700 12px/1.35 "Segoe UI", Arial, sans-serif;
        color: #20315e;
        text-align: right;
        max-width: 52vw;
        white-space: pre-line;
      }

      @media print {
        body * {
          visibility: hidden !important;
        }
        body::before {
          content: "Printing is disabled for this activity.";
          visibility: visible !important;
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 32px;
          font: 700 20px/1.5 "Segoe UI", Arial, sans-serif;
          color: #1f2a44;
          background: #fff;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createShield() {
    const shield = document.createElement("div");
    shield.className = "security-screen-shield";
    shield.setAttribute("aria-hidden", "true");
    shield.innerHTML = `
      <div class="security-screen-shield__card">
        <strong>Reading activity protected</strong>
        <span>Return to this tab to continue.</span>
      </div>
    `;
    document.body.appendChild(shield);
    return shield;
  }

  function createWatermark() {
    const mark = document.createElement("div");
    mark.className = "security-watermark";
    document.body.appendChild(mark);

    const update = () => {
      const name = document.getElementById("nameField")?.value?.trim();
      const id = document.getElementById("idField")?.value?.trim();
      const title = document.getElementById("evidenceTitleField")?.value?.trim();

      const parts = [];
      if (name) parts.push(name);
      if (id) parts.push(`ID: ${id}`);
      if (title) parts.push(title);
      if (!parts.length) parts.push("English Reading Project");

      mark.textContent = parts.join("\n");
    };

    ["nameField", "idField", "evidenceTitleField"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", update);
      document.getElementById(id)?.addEventListener("change", update);
    });

    update();
    setInterval(update, 1500);
  }

  function blockClipboardEvents() {
    ["copy", "cut", "paste"].forEach(type => {
      document.addEventListener(type, event => {
        if (isEditableTarget(event.target)) {
          if (type === "paste" && CONFIG.blockPaste && !event.target.matches("#institutionField,#courseField,#idField,#nameField")) {
            event.preventDefault();
          }
          return;
        }

        if (
          (type === "copy" && CONFIG.blockCopy) ||
          (type === "cut" && CONFIG.blockCut) ||
          (type === "paste" && CONFIG.blockPaste)
        ) {
          event.preventDefault();
        }
      }, true);
    });
  }

  function blockSelection() {
    if (!CONFIG.blockSelection) return;

    document.body.classList.add("security-lock");

    document.addEventListener("selectstart", event => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    }, true);
  }

  function blockContextMenu() {
    if (!CONFIG.blockContextMenu) return;

    document.addEventListener("contextmenu", event => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    }, true);
  }

  function blockDrag() {
    if (!CONFIG.blockDrag) return;

    document.addEventListener("dragstart", event => {
      const target = event.target;

      // Keep the internal vocabulary/practice drag-and-drop working.
      if (target?.closest?.(".word-chip")) return;

      if (!isEditableTarget(target)) {
        event.preventDefault();
      }
    }, true);
  }

  function blockKeyboardShortcuts() {
    if (!CONFIG.blockCommonShortcuts) return;

    document.addEventListener("keydown", event => {
      const key = String(event.key || "").toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      if (isEditableTarget(event.target)) {
        // Allow normal typing/selecting inside student information fields.
        return;
      }

      const blockedCtrl = ["a", "c", "x", "v", "u", "p", "s"];
      if (ctrlOrMeta && blockedCtrl.includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Common DevTools shortcuts.
      if (
        key === "f12" ||
        (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Best-effort Print Screen interception.
      // Browsers/OSes do not guarantee delivery of this key event.
      if (event.key === "PrintScreen") {
        event.preventDefault();
        document.body.classList.add("security-printscreen-flash");
        setTimeout(() => document.body.classList.remove("security-printscreen-flash"), 600);
      }
    }, true);
  }

  function blockPrint() {
    if (!CONFIG.blockPrint) return;

    window.addEventListener("beforeprint", () => {
      document.documentElement.dataset.printBlocked = "true";
    });

    window.addEventListener("afterprint", () => {
      delete document.documentElement.dataset.printBlocked;
    });
  }

  function protectWhenHidden(shield) {
    if (!CONFIG.protectOnBlur) return;

    const syncShield = () => {
      const hidden = document.hidden || !document.hasFocus();
      shield.classList.toggle("active", hidden);
      shield.setAttribute("aria-hidden", hidden ? "false" : "true");
    };

    document.addEventListener("visibilitychange", syncShield);
    window.addEventListener("blur", syncShield);
    window.addEventListener("focus", () => {
      setTimeout(syncShield, 80);
    });
  }

  function discourageTranslation() {
    document.documentElement.setAttribute("translate", "no");
    document.documentElement.classList.add("notranslate");

    let meta = document.querySelector('meta[name="google"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "google";
      document.head.appendChild(meta);
    }
    meta.content = "notranslate";

    document.body.setAttribute("translate", "no");
    document.body.classList.add("notranslate");
  }

  function init() {
    addStyles();
    discourageTranslation();

    const shield = createShield();

    blockSelection();
    blockContextMenu();
    blockClipboardEvents();
    blockDrag();
    blockKeyboardShortcuts();
    blockPrint();
    protectWhenHidden(shield);

    if (CONFIG.watermark) {
      createWatermark();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
