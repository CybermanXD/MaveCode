import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const configuredGoogleClientId = "675028173582-mihpcs5bbsk7395jiq9nctaegj9uh7ae.apps.googleusercontent.com"

test("static sign-in page uses Google Identity Services and never embeds secrets", async () => {
	const [html, source] = await Promise.all([readFile(new URL("../index.html", import.meta.url), "utf8"), readFile(new URL("../auth.js", import.meta.url), "utf8")])
	assert.match(html, /accounts\.google\.com\/gsi\/client/)
	assert.match(source, /auth-google-complete/)
	assert.match(source, /codeChallenge/)
	assert.doesNotMatch(`${html}\n${source}`, /client_secret|MAVECODE_INTAKE_SECRET/i)
})

test("Blogger template is standalone, validates the extension transaction, and contains public configuration only", async () => {
	const html = await readFile(new URL("../blogger-standalone.html", import.meta.url), "utf8")
	assert.match(html, /accounts\.google\.com\/gsi\/client/)
	assert.match(html, /auth-google-complete/)
	assert.match(html, /code_challenge/)
	assert.match(html, /callback\.protocol === "vscode:"/)
	assert.match(html, /callback\.hostname\.toLowerCase\(\) === "mavecode\.mave-code"/)
	assert.match(html, /callback\.username === ""/)
	assert.match(html, /callback\.password === ""/)
	assert.match(html, /callback\.port === ""/)
	assert.match(html, /result\.state !== transaction\.state/)
	assert.match(html, /appsScriptUrl:\s*"https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec"/)
	assert.match(html, /googleClientId:\s*"[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com"/)
	assert.doesNotMatch(html, /<script[^>]+src=["']\.\//)
	assert.doesNotMatch(html, /<link[^>]+href=["']\.\//)
	assert.doesNotMatch(html, /client_secret|MAVECODE_INTAKE_SECRET|sessionToken/i)
})

test("Blogger Theme template is XML from byte zero and contains required Blogger structure", async () => {
	const bytes = await readFile(new URL("../blogger-theme.xml", import.meta.url))
	const xml = bytes.toString("utf8")
	assert.equal(bytes.subarray(0, 5).toString("ascii"), "<?xml")
	assert.equal(bytes[0], 0x3c, "the XML declaration must start at byte zero without a BOM")
	assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/)
	assert.match(xml, /xmlns:b="http:\/\/www\.google\.com\/2005\/gml\/b"/)
	assert.match(xml, /xmlns:data="http:\/\/www\.google\.com\/2005\/gml\/data"/)
	assert.match(xml, /xmlns:expr="http:\/\/www\.google\.com\/2005\/gml\/expr"/)
	assert.match(xml, /<b:skin><!\[CDATA\[[\s\S]*\]\]><\/b:skin>/)
	assert.match(xml, /<b:section\b[^>]*\bid="mavecode-required-section"[^>]*\/>/)
	assert.match(xml, /<script src="https:\/\/accounts\.google\.com\/gsi\/client" async="async" defer="defer"><\/script>/)
	assert.match(xml, /<script type="text\/javascript">\/\/<!\[CDATA\[[\s\S]*\/\/\]\]><\/script>/)
	const xmlOutsideCdata = xml.replaceAll(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
	assert.doesNotMatch(xmlOutsideCdata, /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\dA-Fa-f]+;)/, "XML outside CDATA must not contain a bare ampersand")
})

test("Blogger Theme template is standalone and preserves public auth transaction security", async () => {
	const xml = await readFile(new URL("../blogger-theme.xml", import.meta.url), "utf8")
	assert.match(xml, new RegExp(configuredGoogleClientId.replaceAll(".", "\\.")))
	assert.match(xml, /appsScriptUrl:\s*"https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec"/)
	assert.match(xml, /auth-google-complete/)
	assert.match(xml, /params\.get\("state"\)/)
	assert.match(xml, /params\.get\("code_challenge"\)/)
	assert.match(xml, /EXACT_CALLBACK_URI = "vscode:\/\/MaveCode\.mave-code\/auth-callback"/)
	assert.match(xml, /value === EXACT_CALLBACK_URI/)
	assert.match(xml, /result\.state !== transaction\.state/)
	assert.match(xml, /result\.callbackUri !== transaction\.callbackUri/)
	assert.match(xml, /authorizationCode/)
	assert.doesNotMatch(xml, /<(?:script|link)[^>]+(?:src|href)="\.\//)
	assert.doesNotMatch(xml, /client_secret|MAVECODE_INTAKE_SECRET|sessionToken/i)
})
