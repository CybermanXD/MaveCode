# MaveCode static Google sign-in page

This dependency-free HTTPS page obtains a Google ID token and submits it to the MaveCode Apps Script backend. The backend—not this page—verifies identity and enforces email/domain allowlists.

## Deploy

1. Copy `config.example.js` to `config.js`.
2. Set the public Apps Script deployment URL and Google Web OAuth client ID.
3. Register the final HTTPS page origin under **Authorized JavaScript origins** in Google Cloud Console.
4. Host this directory on Firebase Hosting, Cloudflare Pages, GitHub Pages, or another static HTTPS host.
5. Build the extension with `MAVE_CODE_AUTH_PAGE_URL` set to this page URL.

Do not add secrets to `config.js`; both values are public identifiers.

## Blogger deployment

Use [`blogger-theme.xml`](./blogger-theme.xml) when Blogger must host the authentication page. It is a complete Blogger Theme XML document with the required namespaces, `b:skin`, Blogger section, XML-safe styles/scripts, the configured public Google Web OAuth client ID, and one public Apps Script deployment placeholder.

[`blogger-standalone.html`](./blogger-standalone.html) remains useful on ordinary static HTTPS hosting, but **do not paste it into Blogger → Theme → Edit HTML**. It begins with an HTML doctype rather than an XML declaration and lacks Blogger's required XML namespaces and theme elements. Blogger parses the theme editor as XML, which is why pasting that HTML can produce `SAXParseException: The markup in the document preceding the root element must be well-formed`.

### Important security tradeoff

Blogger controls the surrounding document and may inject scripts, widgets, analytics, theme code, or future platform changes. A page served there cannot enforce the original standalone page's strict Content Security Policy. An injected script could read the short-lived Google ID token while it exists in the page. PKCE still prevents an observer without the extension's verifier from exchanging the one-time authorization code, and Apps Script still verifies Google identity and allowlists, but Blogger hosting has a larger browser-side trust boundary. Use a dedicated Blogger property with no third-party widgets, custom analytics, ads, or unrelated theme scripts. Firebase Hosting or Cloudflare Pages remains the recommended production option.

### Blogger tasks

1. Create a dedicated HTTPS Blogger property used only for MaveCode authentication.
2. Disable comments, widgets, ads, analytics, third-party themes, and unnecessary integrations.
3. Download or open [`blogger-theme.xml`](./blogger-theme.xml) in a byte-preserving text editor. Replace `REPLACE_WITH_DEPLOYMENT_ID` only after Apps Script is deployed. Leave it unchanged until then; never paste secrets or tokens into the theme.
4. In Blogger, open **Theme → Edit HTML**, select all existing theme text, and replace it with the complete contents of `blogger-theme.xml`, starting with `<?xml version="1.0" encoding="UTF-8"?>`. Do not add blank lines, comments, or a byte-order mark before that declaration. Click **Save**. Do not use a post/page editor, and do not paste `blogger-standalone.html` here.
5. Open the published blog and inspect its page source. Verify it still contains `auth-google-complete`, the Google Identity Services URL, and the configured client ID. Blogger may transform the template while publishing, but must retain this logic.
6. Record the final canonical HTTPS page URL. Preserve extension query parameters; do not configure redirects that strip `state`, `code_challenge`, or `callback_uri`.
7. Register only the URL origin, such as `https://your-blog.blogspot.com`, under the Google OAuth Web client's **Authorized JavaScript origins**. Do not include the page path or query string.
8. Build the extension with `MAVE_CODE_AUTH_PAGE_URL` equal to the final canonical page URL and `MAVE_CODE_BACKEND_URL` equal to the Apps Script `/exec` URL.
9. Test with one allowed account and one denied account before wider installation.
