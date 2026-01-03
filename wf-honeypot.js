(function () {
  const CFG = {
    // Honeypot name (weird = less autofill)
    hpName: "company_site",

    // Timing hidden fields (optional but useful for debugging)
    loadTsName: "wf_ts_load",
    submitTsName: "wf_ts_submit",

    // Spam gates
    minSubmitMs: 2500,                 // too fast = likely bot
    maxSubmitMs: 2 * 60 * 60 * 1000,   // too old tab = block (2h)
    requireHumanSignal: true,

    // Local throttle (front-end only)
    throttleMs: 15000,
    throttleKey: "wf_antispam_last_submit",

    // Debug + UI behavior
    debug: false,           // set true to see console logs
    showWebflowFail: true   // show .w-form-fail when blocked
  };

  function log(...args) {
    if (CFG.debug) console.log("[wf-antispam]", ...args);
  }

  function isWebflowForm(form) {
    return !!form.closest(".w-form");
  }

  function ensureHidden(form, name) {
    let el = form.querySelector('input[name="' + name + '"]');
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      form.appendChild(el);
    } else {
      el.type = "hidden";
    }
    return el;
  }

  function ensureHoneypot(form) {
    let hp = form.querySelector('input[name="' + CFG.hpName + '"]');
    if (hp) return hp;

    const wrap = document.createElement("div");
    wrap.className = "wf-antispam-hp-wrap";

    const label = document.createElement("label");
    const id = "wf-hp-" + Math.random().toString(16).slice(2);
    label.setAttribute("for", id);
    label.textContent = "Leave this field empty";

    hp = document.createElement("input");
    hp.type = "text";
    hp.name = CFG.hpName;
    hp.id = id;
    hp.tabIndex = -1;
    hp.autocomplete = "off";
    hp.inputMode = "text";

    wrap.appendChild(label);
    wrap.appendChild(hp);
    form.insertBefore(wrap, form.firstChild);

    return hp;
  }

  function showWFFail(form) {
    const wrap = form.closest(".w-form") || form.parentElement;
    if (!wrap) return;
    const done = wrap.querySelector(".w-form-done");
    const fail = wrap.querySelector(".w-form-fail");
    if (done) done.style.display = "none";
    if (fail) fail.style.display = "block";
  }

  function attach(form) {
    if (!isWebflowForm(form)) return;
    if (form.dataset.wfAntispamAttached === "1") return;
    form.dataset.wfAntispamAttached = "1";

    const hp = ensureHoneypot(form);
    const tsLoad = ensureHidden(form, CFG.loadTsName);
    const tsSubmit = ensureHidden(form, CFG.submitTsName);

    const loadedAt = Date.now();
    tsLoad.value = String(loadedAt);

    // Track "human" interaction
    let hadHumanSignal = false;
    const humanEvents = ["mousemove", "touchstart", "keydown", "scroll", "pointerdown"];
    const onHuman = () => { hadHumanSignal = true; cleanupHuman(); };
    function cleanupHuman() {
      humanEvents.forEach(e => window.removeEventListener(e, onHuman, { passive: true }));
    }
    humanEvents.forEach(e => window.addEventListener(e, onHuman, { passive: true }));

    form.addEventListener("submit", function (e) {
      const now = Date.now();
      tsSubmit.value = String(now);

      // Let browser native validation do its job
      if (!form.checkValidity()) {
        log("invalid form validity()");
        return;
      }

      // 1) Honeypot must be empty
      if (hp && hp.value && hp.value.trim() !== "") {
        log("blocked: honeypot filled", hp.value);
        e.preventDefault();
        e.stopPropagation();
        if (CFG.showWebflowFail) showWFFail(form);
        return;
      }

      // 2) Time-to-submit gate
      const delta = now - loadedAt;
      if (delta < CFG.minSubmitMs) {
        log("blocked: too fast", delta + "ms");
        e.preventDefault();
        e.stopPropagation();
        if (CFG.showWebflowFail) showWFFail(form);
        return;
      }
      if (delta > CFG.maxSubmitMs) {
        log("blocked: too old", delta + "ms");
        e.preventDefault();
        e.stopPropagation();
        if (CFG.showWebflowFail) showWFFail(form);
        return;
      }

      // 3) Must have at least one human signal
      if (CFG.requireHumanSignal && !hadHumanSignal) {
        log("blocked: no human signal");
        e.preventDefault();
        e.stopPropagation();
        if (CFG.showWebflowFail) showWFFail(form);
        return;
      }

      // 4) Per-device throttle
      try {
        const last = Number(localStorage.getItem(CFG.throttleKey) || "0");
        if (now - last < CFG.throttleMs) {
          log("blocked: throttled", (now - last) + "ms since last submit");
          e.preventDefault();
          e.stopPropagation();
          if (CFG.showWebflowFail) showWFFail(form);
          return;
        }
        localStorage.setItem(CFG.throttleKey, String(now));
      } catch (err) {
        log("localStorage error (ignored)", err);
      }

      // Allowed: Webflow will submit normally
      log("allowed: passed all checks");
    }, true); // capture phase to run before Webflow
  }

  function init() {
    document.querySelectorAll("form").forEach(attach);

    // Forms that appear later (tabs, modals, CMS loads)
    const obs = new MutationObserver(() => {
      document.querySelectorAll("form").forEach(attach);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

    log("initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();