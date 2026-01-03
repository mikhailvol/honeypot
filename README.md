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

## 🚀 Installation (Webflow)

1. **Add the CSS** (before `</head>`):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mikhailvol/webfolks-honeypot@latest/wf-anty-spammer.css">
```

2. **Add the JS** (right before `</body>`):

```html
<script defer src="https://cdn.jsdelivr.net/gh/mikhailvol/webfolks-honeypot@latest/wf-anty-spammer.js"></script>
```
> The script automatically protects **all Webflow forms** inside `.w-form`.

---

# Configuration & Customization (Optional)

This customization layer is **optional**.
If you are happy with the defaults, you do **not** need to add anything.

---

## Default Behavior (No Configuration Needed)

If you load the script like this:

```html
<script src="https://cdn.jsdelivr.net/gh/..."></script>
```

Then:

- The script uses its internal defaults
- No global variables are required
- No extra setup is needed
- All Webflow forms are protected automatically

This is the **recommended setup for most projects**.

---

## Optional: Per-Project Configuration Overrides

If you want to **change behavior for a specific project**, you can override selected settings using a small config object.

### How it works

The script internally merges configuration like this:

```js
CFG = { ...DEFAULT_CFG, ...window.WF_ANTISPAM_CFG }
```

This means:
- Only the keys you provide are overridden
- All other values fall back to defaults

---

## How to Add Custom Configuration

### 1) Add this snippet **before** the main script

```html
<script>
  window.WF_ANTISPAM_CFG = {
    minSubmitMs: 1500,
    requireHumanSignal: false
  };
</script>

<script src="https://cdn.jsdelivr.net/gh/..."></script>
```

⚠️ The config block **must be placed before** the script include.

---

## Available Configuration Options

| Option | Type | Description | Default |
|-----|-----|------------|--------|
| `hpName` | string | Honeypot input name | `company_site` |
| `minSubmitMs` | number | Minimum allowed time before submit | `2500` |
| `maxSubmitMs` | number | Maximum allowed form age | `7200000` |
| `requireHumanSignal` | boolean | Require mouse/scroll/key interaction | `true` |
| `throttleMs` | number | Cooldown between submits (ms) | `15000` |
| `debug` | boolean | Enable console logging | `false` |
| `showWebflowFail` | boolean | Show `.w-form-fail` when blocked | `true` |

---

## Common Customization Examples

### Newsletter Forms (fast submits)
```js
window.WF_ANTISPAM_CFG = {
  minSubmitMs: 1500,
  requireHumanSignal: false
};
```

### Accessibility-first Sites
```js
window.WF_ANTISPAM_CFG = {
  requireHumanSignal: false
};
```

### Debugging a Live Site
```js
window.WF_ANTISPAM_CFG = {
  debug: true
};
```

---

## What Happens If Configuration Is Missing

If `window.WF_ANTISPAM_CFG` is not defined:

- No errors occur
- Defaults are used
- Script behaves exactly the same

This makes configuration **safe, optional, and non-breaking**.

---

## What This Customization Does NOT Do

- ❌ Does not change script loading or caching
- ❌ Does not version the script
- ❌ Does not expose public APIs
- ❌ Does not affect other projects

It only adjusts runtime behavior on the current page.

---

## Best Practice Summary

- Use **defaults** whenever possible
- Override config **only when necessary**
- Keep config small and project-specific
- Do not define `window.WF_ANTISPAM_CFG` unless you need it

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

## 📝 License

[MIT](LICENSE.md)
