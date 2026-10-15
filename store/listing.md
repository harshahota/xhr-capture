# Chrome Web Store listing — XHR Capture

## Store listing tab

**Name:** XHR Capture

**Summary** (from manifest, max 132 chars):
Adds a DevTools tab that lists XHR and fetch calls with headers, payloads and responses. Export to JSON, CSV or Postman.

**Category:** Developer Tools
**Language:** English

**Description:**

XHR Capture adds a tab to Chrome DevTools that shows only the API calls a page makes: its XHR and fetch requests. Images, scripts and stylesheets stay out of the way.

Click any request to see:
• URL, method, status and how long it took
• Request and response headers
• Request payload and response body, formatted as JSON when possible

Find what you need:
• Filter by URL text
• Filter by one or more domains
• Preserve Log keeps requests across page loads

Take it elsewhere:
• Export to JSON or CSV
• Export to a Postman collection, with one entry per endpoint and an example response for each status code it returned
• Export a single request to Postman

Private by design:
XHR Capture asks for no permissions and adds no code to the pages you visit. It reads the same network log the DevTools Network tab uses, and only while DevTools is open. Captured requests stay in your browser and are cleared when you close DevTools. Nothing is sent anywhere.

How to use:
1. Open DevTools (F12, or Cmd+Option+I on a Mac).
2. Open the XHR Capture tab. It may be under the » menu.
3. Use the page as normal. Requests appear as they finish.

Postman exports include request headers such as cookies and authorization tokens. Treat exported files as sensitive.

**Graphics:**
- Icon: `icons/icon128.png`
- Screenshots (1280×800): `store/assets/screenshot-1-detail.png`, `store/assets/screenshot-2-filter.png`
- Small promo tile (440×280): `store/assets/promo-small-440x280.png`

## Privacy practices tab

**Single purpose:** Show the XHR and fetch requests made by the page being inspected in a DevTools panel, and export them.

**Permission justification:** None. The extension requests no permissions or host permissions.

**Remote code:** No, I am not using remote code.

**Data usage:** Tick none of the data types. Nothing is collected or sent off the device.
Certify all three: not sold to third parties; not used for purposes unrelated to the single purpose;
not used to determine creditworthiness or for lending.

**Privacy policy URL:** https://harshahota.github.io/xhr-capture/store/privacy-policy.html
