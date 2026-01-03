# Webflow Front-End Anti-Spam (No Backend)

A **universal, front-end-only anti-spam layer** for **Webflow native forms**.

Designed to block the most common low-effort spam **without**:
- captchas
- backend logic
- Make / Cloudflare
- UX friction

Works by injecting protection automatically into **all Webflow forms**.

---

## Features

- 🕳️ Honeypot field (text input, off-screen)
- ⏱️ Time-to-submit validation
- 🧠 Optional human-interaction requirement
- 🔁 Per-device throttling (localStorage)
- ⚙️ Auto-attaches to all Webflow forms
- 🧩 Handles dynamically loaded forms (tabs, modals, CMS)
- 🚫 Blocks spam **before** Webflow AJAX fires

---

## Important Limitations (Read This)

This solution is **front-end only**.

It will **not** stop:
- advanced bots using Playwright / Puppeteer
- real browser automation with delays and interactions

It **will** stop:
- blind POST spam
- “fill every field” bots
- ultra-fast submissions
- low-effort automation
- most SEO / form spam tools

For near-bulletproof protection, add **server-side verification later** (Make, Cloudflare Turnstile).

---

## How It Works

### High-level flow

1. Page loads
2. Script scans for all Webflow forms
3. Injects:
   - honeypot field
   - hidden timestamp fields
4. Attaches a submit listener (capture phase)
5. On submit, checks:
   - native browser validation
   - honeypot
   - submit timing
   - human interaction
   - per-device throttle
6. If any check fails → submission is blocked  
7. If all checks pass → Webflow submits normally

---

## What Gets Injected

### Honeypot (off-screen text input)

- Field name: `company_site` (configurable)
- `type="text"` (not hidden)
- Visually hidden using CSS positioning
- Humans never see it
- Bots often fill it

### Timestamp fields (hidden)

- `wf_ts_load` – page load time
- `wf_ts_submit` – submit attempt time

Used for timing checks and debugging.

---

## Installation

### 1) Add CSS (Project Settings → Custom Code → Head)

```html
<style>
  .wf-antispam-hp-wrap{
    position:absolute!important;
    left:-10000px!important;
    top:auto!important;
    width:1px!important;
    height:1px!important;
    overflow:hidden!important;
  }
</style>
```

---

### 2) Add JavaScript (Project Settings → Custom Code → Footer)

Paste the anti-spam script before `</body>`.

> The script automatically protects **all Webflow forms** inside `.w-form`.

---

## Configuration

At the top of the script you can tune:

```js
const CFG = {
  hpName: "company_site",

  minSubmitMs: 2500,
  maxSubmitMs: 2 * 60 * 60 * 1000,

  requireHumanSignal: true,

  throttleMs: 15000,

  debug: false,
  showWebflowFail: true
};
```

### Recommended values

| Form type | minSubmitMs | requireHumanSignal |
|---------|-------------|--------------------|
| Contact / Demo | 2500 | true |
| Newsletter | 1500 | false |
| Accessibility-first | 2000 | false |

---

## UX Behavior

| Situation | Result |
|--------|--------|
| Missing required field | Browser native tooltip |
| Honeypot filled | Submission blocked |
| Submitted too fast | Submission blocked |
| No human interaction | Submission blocked |
| Legit submit | Webflow success |

All spam blocks show the **same generic failure state** (`.w-form-fail`).

---

## Testing

### Manual tests

#### Normal submit
1. Fill form
2. Wait 3 seconds
3. Submit  
✅ Should succeed

#### Honeypot test
1. Open DevTools → Elements
2. Find `input[name="company_site"]`
3. Enter any value
4. Submit  
❌ Should be blocked

#### Too-fast test
1. Reload page
2. Submit within 1–2 seconds  
❌ Should be blocked

---

## Debug Mode

Enable:
```js
debug: true
```

Console messages:
- `blocked: honeypot filled`
- `blocked: too fast`
- `blocked: throttled`
- `allowed: passed all checks`

---

## Automated Console Test (Optional)

Use this snippet in DevTools to auto-fill inputs and submit.

```js
(function () {
  console.log("=== WEBFLOW FORM AUTO TEST START ===");

  const TEST_EMAIL = "test@test.com";
  const TEST_NAME = "Test User";

  function isHoneypot(input) {
    return (
      input.name &&
      (input.name.includes("company") || input.id.startsWith("wf-hp-"))
    );
  }

  const inputs = Array.from(document.querySelectorAll("input")).filter(input => {
    if (input.disabled) return false;
    if (input.type === "hidden") return false;
    if (input.type === "submit") return false;
    if (isHoneypot(input)) return false;
    return true;
  });

  inputs.forEach(input => {
    input.value = input.type === "email" ? TEST_EMAIL : TEST_NAME;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const submit = document.querySelector(
    'input[type="submit"], button[type="submit"]'
  );

  if (submit) submit.click();

  console.log("=== WEBFLOW FORM AUTO TEST END ===");
})();
```

> Note: This submits very fast and may be blocked by timing rules.

---

## Why No JS-Enabled Check?

Webflow forms **do not submit without JavaScript**.

Therefore:
- JS is already guaranteed
- “JS enabled” checks are unnecessary
- Protection focuses on **timing + behavior**

---

## Future Upgrade Path (Make / Backend)

When adding Make or a backend, you can:
- validate honeypot server-side
- re-check timing
- add deduplication
- add IP / rate limiting
- add one-time tokens
- add Cloudflare Turnstile

UI does **not** need to change for most upgrades.

---

## License

MIT – use freely in client and commercial projects.
