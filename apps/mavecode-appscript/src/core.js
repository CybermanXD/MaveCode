/* MaveCode Apps Script MVP. ES5-style syntax keeps the deployed artifact and Node tests identical. */
var MaveCodeBackend = (function () {
	"use strict"

	var PROTOCOL = "mavecode.v1"
	var PROVIDER_KEY = "provider.codex"
	var CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"
	var CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"
	var DEFAULT_CODEX_MODELS = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.3-codex", "gpt-5.3-codex-spark", "gpt-5.2-codex", "gpt-5.1-codex-max", "gpt-5.1-codex", "gpt-5.1-codex-mini", "gpt-5.1", "gpt-5", "gpt-5-codex", "gpt-5-codex-mini", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2"]
	var SESSION_PREFIX = "session."
	var AUTH_CODE_PREFIX = "auth-code."
	var DEFAULTS = {
		maxSkewMs: 300000,
		nonceTtlSeconds: 600,
		sessionTtlMs: 900000,
		refreshTtlMs: 3600000,
		maxRequestBytes: 10485760,
		maxResponseBytes: 524288,
		quotaPerMinute: 20,
		lockWaitMs: 5000,
		maxMessageBytes: 1048576,
		maxImageBytes: 5242880,
		maxToolArgumentBytes: 32768,
		maxTools: 64,
		maxToolSchemaBytes: 65536,
		authCodeTtlMs: 120000
	}

	function ApiError(code, message, status, retryable) {
		this.name = "ApiError"
		this.code = code
		this.message = message
		this.status = status || 400
		this.retryable = Boolean(retryable)
	}
	ApiError.prototype = Object.create(Error.prototype)

	function handle(method, event, deps) {
		try {
			var request = parseRequest(method, event)
			var config = readConfig(deps.properties)
			var actions = {
				health: function () { return health(deps, config) },
				"auth-config": function () { return authConfig(config) },
				"auth-google-complete": function () { return authGoogleComplete(request, deps, config) },
				"auth-code-exchange": function () { return authCodeExchange(request, deps, config) },
				"provider-token-intake": function () { return providerIntake(request, event, deps, config) },
				"provider-status": function () { requireAdminOrSession(request, deps, config); return providerStatus(deps) },
				"provider-probe": function () { requireAdmin(request, deps, config); return providerProbe(deps, config) },
				"provider-revoke": function () { requireAdmin(request, deps, config); return providerRevoke(deps, config) },
				"session-issue": function () { return legacySessionIssue(deps, config) },
				"session-verify": function () { return sessionVerify(request, deps, config) },
				"session-refresh": function () { return sessionRefresh(request, deps, config) },
				"session-revoke": function () { return sessionRevoke(request, deps, config) },
				models: function () { var claims = requireSession(request, deps, config); return models(config, claims) },
				"rate-limits": function () { requireSession(request, deps, config); return rateLimits(deps, config) },
				chat: function () { var claims = requireSession(request, deps, config); return chat(request, deps, config, claims) }
			}
			if (!Object.prototype.hasOwnProperty.call(actions, request.action)) throw new ApiError("NOT_FOUND", "Unknown action", 404)
			return success(actions[request.action]())
		} catch (error) {
			return failure(normalizeError(error))
		}
	}

	function parseRequest(method, event) {
		var text = event.postData && typeof event.postData.contents === "string" ? event.postData.contents : ""
		var body = {}
		if (text) {
			try { body = JSON.parse(text) } catch (_) { throw new ApiError("INVALID_REQUEST", "Invalid JSON body", 400) }
			if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("INVALID_REQUEST", "JSON body must be an object", 400)
		}
		var action = body.action || (event.parameter && event.parameter.action) || (method === "GET" ? "health" : "")
		return { method: method, action: action, body: body, rawBody: text, parameters: event.parameter || {} }
	}

	function readConfig(properties) {
		return {
			intakeSecret: properties.getProperty("MAVECODE_INTAKE_SECRET") || "",
			allowedUsers: csv(properties.getProperty("MAVECODE_ALLOWED_USERS")),
			allowedDomains: csv(properties.getProperty("MAVECODE_ALLOWED_DOMAINS")),
			adminUsers: csv(properties.getProperty("MAVECODE_ADMIN_USERS")),
			googleClientId: properties.getProperty("MAVECODE_GOOGLE_CLIENT_ID") || "",
			extensionCallbackUri: properties.getProperty("MAVECODE_EXTENSION_CALLBACK_URI") || "",
			enableLegacySessionIssue: properties.getProperty("MAVECODE_ENABLE_LEGACY_SESSION_ISSUE") === "true",
			modelAllowlist: unique(DEFAULT_CODEX_MODELS.concat(csv(properties.getProperty("MAVECODE_MODEL_ALLOWLIST")))),
			maxSkewMs: positiveNumber(properties.getProperty("MAVECODE_MAX_SKEW_MS"), DEFAULTS.maxSkewMs),
			nonceTtlSeconds: positiveNumber(properties.getProperty("MAVECODE_NONCE_TTL_SECONDS"), DEFAULTS.nonceTtlSeconds),
			sessionTtlMs: positiveNumber(properties.getProperty("MAVECODE_SESSION_TTL_MS"), DEFAULTS.sessionTtlMs),
			refreshTtlMs: positiveNumber(properties.getProperty("MAVECODE_REFRESH_TTL_MS"), DEFAULTS.refreshTtlMs),
			maxRequestBytes: positiveNumber(properties.getProperty("MAVECODE_MAX_REQUEST_BYTES"), DEFAULTS.maxRequestBytes),
			maxMessageBytes: positiveNumber(properties.getProperty("MAVECODE_MAX_MESSAGE_BYTES"), DEFAULTS.maxMessageBytes),
			maxResponseBytes: positiveNumber(properties.getProperty("MAVECODE_MAX_RESPONSE_BYTES"), DEFAULTS.maxResponseBytes),
			quotaPerMinute: positiveNumber(properties.getProperty("MAVECODE_QUOTA_PER_MINUTE"), DEFAULTS.quotaPerMinute),
			authCodeTtlMs: positiveNumber(properties.getProperty("MAVECODE_AUTH_CODE_TTL_MS"), DEFAULTS.authCodeTtlMs),
			lockWaitMs: DEFAULTS.lockWaitMs
		}
	}

	function health(deps, config) {
		var status = providerStatus(deps)
		return { service: "mavecode-appscript", protocolVersion: PROTOCOL, ready: Boolean(config.modelAllowlist.length && status.connected), provider: status }
	}

	function providerIntake(request, event, deps, config) {
		if (!config.intakeSecret) throw new ApiError("NOT_CONFIGURED", "Token intake is not configured", 503)
		if (utf8Length(request.rawBody) > config.maxRequestBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Request exceeds size limit", 413)
		var timestamp = String(request.parameters.timestamp || header(event, "x-mavecode-timestamp") || "")
		var nonce = String(request.parameters.nonce || header(event, "x-mavecode-nonce") || "")
		var signature = String(request.parameters.signature || header(event, "x-mavecode-signature") || "")
		verifyIntake(config.intakeSecret, timestamp, nonce, request.rawBody, signature, deps, config)
		var credentials = request.body.credentials
		if (request.body.provider !== "codex" || !credentials || typeof credentials.accessToken !== "string" || !credentials.accessToken) {
			throw new ApiError("INVALID_REQUEST", "Invalid Codex credential payload", 400)
		}
		var expiresAt = Number(credentials.expiresAt)
		if (!isFinite(expiresAt) || expiresAt <= deps.now()) throw new ApiError("PROVIDER_EXPIRED", "Provider authorization is expired", 401)
		var record = {
			accessToken: credentials.accessToken,
			refreshToken: stringValue(credentials.refreshToken),
			idToken: stringValue(credentials.idToken),
			expiresAt: expiresAt,
			accountId: stringValue(credentials.accountId),
			email: stringValue(credentials.email),
			updatedAt: deps.now()
		}
		withLock(deps.lock, config.lockWaitMs, function () { deps.properties.setProperty(PROVIDER_KEY, JSON.stringify(record)) })
		return { provider: "codex", connected: true, expiresAt: expiresAt }
	}

	function verifyIntake(secret, timestamp, nonce, rawBody, signature, deps, config) {
		var time = Number(timestamp)
		if (!timestamp || !isFinite(time) || Math.abs(deps.now() - time) > config.maxSkewMs) throw new ApiError("STALE_SIGNATURE", "Request timestamp is outside the allowed window", 401)
		if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) throw new ApiError("INVALID_SIGNATURE", "Invalid request signature", 401)
		var digest = hex(deps.crypto.computeDigest(deps.crypto.DigestAlgorithm.SHA_256, rawBody, deps.crypto.Charset.UTF_8))
		var signed = timestamp + "." + nonce + "." + digest
		var expected = webSafeBase64(deps.crypto.base64EncodeWebSafe(deps.crypto.computeHmacSha256Signature(signed, secret, deps.crypto.Charset.UTF_8)))
		if (!constantTimeEqual(expected, signature)) throw new ApiError("INVALID_SIGNATURE", "Invalid request signature", 401)
		var nonceKey = "intake-nonce:" + nonce
		withLock(deps.lock, config.lockWaitMs, function () {
			if (deps.cache.get(nonceKey)) throw new ApiError("REPLAY_DETECTED", "Request nonce was already used", 409)
			deps.cache.put(nonceKey, "1", config.nonceTtlSeconds)
		})
	}

	function providerStatus(deps) {
		var record = readJsonProperty(deps.properties, PROVIDER_KEY)
		if (!record) return { provider: "codex", connected: false, credentialState: "missing" }
		var current = Number(record.expiresAt) > deps.now()
		return { provider: "codex", connected: current, credentialState: current ? "stored" : "expired", expiresAt: Number(record.expiresAt), updatedAt: Number(record.updatedAt) }
	}

	function providerProbe(deps, config) {
		var provider = readJsonProperty(deps.properties, PROVIDER_KEY)
		var checkedAt = deps.now()
		if (!provider) return { provider: "codex", credentialState: "missing", accepted: false, checkedAt: checkedAt }
		if (Number(provider.expiresAt) <= checkedAt) return { provider: "codex", credentialState: "expired", accepted: false, checkedAt: checkedAt }
		var response
		try {
			response = deps.fetch(CODEX_USAGE_URL, { method: "get", headers: buildCodexHeaders(provider, deps), muteHttpExceptions: true, followRedirects: false })
		} catch (_) { return { provider: "codex", credentialState: "stored", accepted: false, reachable: false, checkedAt: checkedAt } }
		var status = Number(response.getResponseCode())
		var text = String(response.getContentText() || "")
		if (utf8Length(text) > config.maxResponseBytes) text = ""
		var result = { provider: "codex", credentialState: "stored", accepted: status >= 200 && status < 300, reachable: true, checkedAt: checkedAt, upstreamStatus: status }
		if (!result.accepted) {
			var safeError = safeProviderError(text)
			if (safeError) result.upstreamError = safeError
			logDiagnostic(deps, "provider_probe_failed", { status: status, providerCode: safeError ? safeError.code : "unknown" })
		}
		return result
	}

	function providerRevoke(deps, config) {
		withLock(deps.lock, config.lockWaitMs, function () { deps.properties.deleteProperty(PROVIDER_KEY) })
		return { provider: "codex", connected: false, revoked: true }
	}

	function authConfig(config) {
		if (!config.googleClientId || !config.extensionCallbackUri) throw new ApiError("NOT_CONFIGURED", "Google sign-in is not configured", 503)
		return { googleClientId: config.googleClientId, extensionCallbackUri: config.extensionCallbackUri }
	}

	function legacySessionIssue(deps, config) {
		if (!config.enableLegacySessionIssue) throw new ApiError("NOT_FOUND", "Unknown action", 404)
		var identity = currentIdentity(deps)
		var role = roleFor(identity, config)
		if (!role) throw new ApiError("FORBIDDEN", "User is not allowlisted", 403)
		return createSession(identity, role, deps, config)
	}

	function authGoogleComplete(request, deps, config) {
		if (!config.googleClientId || !config.extensionCallbackUri) throw new ApiError("NOT_CONFIGURED", "Google sign-in is not configured", 503)
		var idToken = request.body.idToken
		var state = request.body.state
		var challenge = request.body.codeChallenge
		var callbackUri = request.body.callbackUri
		if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 8192) throw new ApiError("INVALID_REQUEST", "A valid Google ID token is required", 400)
		if (!validOpaque(state) || !validOpaque(challenge)) throw new ApiError("INVALID_REQUEST", "Invalid authorization transaction", 400)
		if (callbackUri !== config.extensionCallbackUri) throw new ApiError("INVALID_REQUEST", "Callback URI is not allowed", 400)
		var profile = verifyGoogleIdToken(idToken, deps, config)
		var email = String(profile.email || "").trim().toLowerCase()
		if (String(profile.email_verified) !== "true") throw new ApiError("UNAUTHENTICATED", "Google email is not verified", 401)
		var role = roleFor(email, config)
		if (!role) throw new ApiError("FORBIDDEN", "Google account is not allowed", 403)
		var code = "mave_code_" + randomToken(deps)
		var record = { subject: email, role: role, state: state, codeChallenge: challenge, callbackUri: callbackUri, expiresAt: deps.now() + config.authCodeTtlMs }
		withLock(deps.lock, config.lockWaitMs, function () { deps.properties.setProperty(AUTH_CODE_PREFIX + sha256(code, deps), JSON.stringify(record)) })
		return { authorizationCode: code, state: state, callbackUri: callbackUri, expiresAt: record.expiresAt }
	}

	function verifyGoogleIdToken(idToken, deps, config) {
		var response = deps.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), { method: "get", muteHttpExceptions: true })
		var profile
		try { profile = JSON.parse(response.getContentText()) } catch (_) { profile = null }
		if (Number(response.getResponseCode()) !== 200 || !profile || profile.aud !== config.googleClientId) throw new ApiError("UNAUTHENTICATED", "Google identity could not be verified", 401)
		if (["accounts.google.com", "https://accounts.google.com"].indexOf(String(profile.iss)) < 0) throw new ApiError("UNAUTHENTICATED", "Google token issuer is invalid", 401)
		if (Number(profile.exp) * 1000 <= deps.now()) throw new ApiError("UNAUTHENTICATED", "Google identity token is expired", 401)
		return profile
	}

	function authCodeExchange(request, deps, config) {
		var code = request.body.authorizationCode
		var state = request.body.state
		var verifier = request.body.codeVerifier
		var callbackUri = request.body.callbackUri
		if (typeof code !== "string" || code.indexOf("mave_code_") !== 0 || !validOpaque(state) || !validOpaque(verifier)) throw new ApiError("INVALID_REQUEST", "Invalid authorization exchange", 400)
		var key = AUTH_CODE_PREFIX + sha256(code, deps)
		var record
		withLock(deps.lock, config.lockWaitMs, function () { record = readJsonProperty(deps.properties, key); deps.properties.deleteProperty(key) })
		if (!record || Number(record.expiresAt) <= deps.now()) throw new ApiError("AUTH_CODE_EXPIRED", "Authorization code is invalid or expired", 401)
		if (!constantTimeEqual(String(record.state), state) || record.callbackUri !== callbackUri || callbackUri !== config.extensionCallbackUri) throw new ApiError("INVALID_REQUEST", "Authorization transaction does not match", 400)
		if (!constantTimeEqual(String(record.codeChallenge), pkceChallenge(verifier, deps))) throw new ApiError("INVALID_GRANT", "PKCE verification failed", 401)
		var role = roleFor(String(record.subject), config)
		if (!role) throw new ApiError("FORBIDDEN", "Google account is no longer allowed", 403)
		return createSession(String(record.subject), role, deps, config)
	}

	function createSession(email, role, deps, config) {
		var token = "mave_ext_" + randomToken(deps)
		var now = deps.now()
		var record = { subject: email, role: role, issuedAt: now, expiresAt: now + config.sessionTtlMs, refreshUntil: now + config.refreshTtlMs }
		withLock(deps.lock, config.lockWaitMs, function () { deps.properties.setProperty(SESSION_PREFIX + sha256(token, deps), JSON.stringify(record)) })
		return { sessionToken: token, tokenType: "MaveCode", expiresAt: record.expiresAt, claims: publicClaims(record) }
	}

	function sessionVerify(request, deps, config) {
		var claims = requireSession(request, deps, config)
		return { valid: true, claims: claims }
	}

	function sessionRefresh(request, deps, config) {
		var token = readSessionToken(request)
		var key = SESSION_PREFIX + sha256(token, deps)
		var record = readJsonProperty(deps.properties, key)
		if (!record || record.revokedAt || Number(record.refreshUntil) <= deps.now()) throw new ApiError("SESSION_EXPIRED", "Session cannot be refreshed", 401)
		var role = roleFor(String(record.subject), config)
		if (!role) throw new ApiError("FORBIDDEN", "User is not allowlisted", 403)
		withLock(deps.lock, config.lockWaitMs, function () { deps.properties.deleteProperty(key) })
		return createSession(String(record.subject), role, deps, config)
	}

	function sessionRevoke(request, deps, config) {
		var token = readSessionToken(request)
		var key = SESSION_PREFIX + sha256(token, deps)
		var record = readJsonProperty(deps.properties, key)
		if (!record) return { revoked: true }
		withLock(deps.lock, config.lockWaitMs, function () { deps.properties.deleteProperty(key) })
		return { revoked: true }
	}

	function requireSession(request, deps, config) {
		var token = readSessionToken(request)
		var record = readJsonProperty(deps.properties, SESSION_PREFIX + sha256(token, deps))
		if (!record || record.revokedAt || Number(record.expiresAt) <= deps.now()) throw new ApiError("SESSION_EXPIRED", "Session is invalid or expired", 401)
		var role = roleFor(String(record.subject), config)
		if (!role) throw new ApiError("FORBIDDEN", "User is no longer allowlisted", 403)
		record.role = role
		return publicClaims(record)
	}

	function models(config, claims) {
		return {
			protocolVersion: PROTOCOL,
			catalogVersion: "1.0.0",
			models: config.modelAllowlist.map(function (id) {
				return { id: id, provider: "codex", displayName: id, capabilities: { input: ["text", "image"], output: ["text"], multiTurn: true, streaming: false, tools: true }, roles: [claims.role] }
			})
		}
	}

	function rateLimits(deps, config) {
		var provider = readJsonProperty(deps.properties, PROVIDER_KEY)
		if (!provider || Number(provider.expiresAt) <= deps.now()) throw new ApiError("PROVIDER_EXPIRED", "Provider authorization is unavailable or expired", 503)
		var response
		try {
			response = deps.fetch(CODEX_USAGE_URL, { method: "get", headers: buildCodexHeaders(provider, deps), muteHttpExceptions: true, followRedirects: false })
		} catch (_) { throw new ApiError("PROVIDER_UNAVAILABLE", "Provider usage request failed", 502, true) }
		var status = Number(response.getResponseCode())
		var text = String(response.getContentText() || "")
		if (utf8Length(text) > config.maxResponseBytes) throw new ApiError("PROVIDER_RESPONSE_TOO_LARGE", "Provider usage response exceeds size limit", 502)
		if (status < 200 || status >= 300) throw new ApiError("PROVIDER_ERROR", "Provider usage request returned an error", status === 429 ? 429 : 502, status === 429 || status >= 500)
		var payload
		try { payload = JSON.parse(text) } catch (_) { throw new ApiError("INVALID_PROVIDER_RESPONSE", "Provider usage response was invalid", 502) }
		return parseRateLimits(payload, deps.now())
	}

	function parseRateLimits(payload, fetchedAt) {
		var root = payload && typeof payload === "object" ? payload : {}
		var limit = root.rate_limit && typeof root.rate_limit === "object" ? root.rate_limit : {}
		var primary = parseRateLimitWindow(limit.primary_window)
		var secondary = parseRateLimitWindow(limit.secondary_window)
		if (!primary && !secondary) throw new ApiError("INVALID_PROVIDER_RESPONSE", "Provider usage response did not include rate limit windows", 502)
		var result = { fetchedAt: fetchedAt }
		if (primary) result.primary = primary
		if (secondary) result.secondary = secondary
		if (typeof root.plan_type === "string") result.planType = root.plan_type
		return result
	}

	function parseRateLimitWindow(value) {
		if (!value || typeof value !== "object" || typeof value.used_percent !== "number" || !isFinite(value.used_percent)) return undefined
		var result = { usedPercent: Math.max(0, Math.min(100, value.used_percent)) }
		if (typeof value.limit_window_seconds === "number" && isFinite(value.limit_window_seconds)) result.windowMinutes = Math.round(value.limit_window_seconds / 60)
		if (typeof value.reset_at === "number" && isFinite(value.reset_at)) result.resetsAt = Math.round(value.reset_at * 1000)
		return result
	}

	function chat(request, deps, config, claims) {
		if (utf8Length(request.rawBody) > config.maxRequestBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Request exceeds size limit", 413)
		var model = request.body.model
		if (typeof model !== "string" || config.modelAllowlist.indexOf(model) < 0) throw new ApiError("MODEL_NOT_ALLOWED", "Requested model is not allowed", 403)
		if (request.body.protocolVersion !== PROTOCOL) throw new ApiError("PROTOCOL_MISMATCH", "Chat protocol is not supported", 400)
		var messages = validateMessages(request.body.messages, config.maxMessageBytes)
		var tools = validateTools(request.body.tools)
		var toolChoice = validateToolChoice(request.body.toolChoice, tools)
		var parallelToolCalls = request.body.parallelToolCalls === undefined ? true : request.body.parallelToolCalls
		if (typeof parallelToolCalls !== "boolean") throw new ApiError("INVALID_REQUEST", "Parallel tool call preference must be boolean", 400)
		var promptCacheKey = validatePromptCacheKey(request.body.promptCacheKey)
		consumeQuota(claims.subject, deps, config)
		var provider = readJsonProperty(deps.properties, PROVIDER_KEY)
		if (!provider || Number(provider.expiresAt) <= deps.now()) throw new ApiError("PROVIDER_EXPIRED", "Provider authorization is unavailable or expired", 503)
		var runtimePayload = JSON.stringify(buildRuntimeRequest(model, messages, tools, toolChoice, parallelToolCalls, promptCacheKey))
		if (utf8Length(runtimePayload) > config.maxRequestBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Provider request exceeds size limit", 413)
		var response
		try {
			response = deps.fetch(CODEX_RESPONSES_URL, { method: "post", contentType: "application/json", headers: buildCodexHeaders(provider, deps, promptCacheKey), payload: runtimePayload, muteHttpExceptions: true, followRedirects: false })
		} catch (_) { throw new ApiError("PROVIDER_UNAVAILABLE", "Provider request failed", 502, true) }
		var status = Number(response.getResponseCode())
		var text = String(response.getContentText() || "")
		if (utf8Length(text) > config.maxResponseBytes) throw new ApiError("PROVIDER_RESPONSE_TOO_LARGE", "Provider response exceeds size limit", 502)
		if (status < 200 || status >= 300) throw providerHttpError(status, text, "chat", deps)
		var normalized = normalizeProviderResponse(text)
		if (!normalized.events.length) throw new ApiError("INVALID_PROVIDER_RESPONSE", "Provider response did not contain output", 502)
		return { protocolVersion: PROTOCOL, id: normalized.id || randomToken(deps), model: model, events: normalized.events }
	}

	function buildCodexHeaders(provider, deps, sessionId) {
		var headers = {
			Authorization: "Bearer " + provider.accessToken,
			originator: "mave-code",
			session_id: sessionId || ("mavecode-appscript-" + randomToken(deps)),
			"User-Agent": "mavecode-appscript/1.0 GoogleAppsScript"
		}
		if (provider.accountId) headers["ChatGPT-Account-Id"] = provider.accountId
		return headers
	}

	function providerHttpError(status, text, operation, deps) {
		var providerCode = safeProviderErrorCode(text)
		logDiagnostic(deps, "provider_http_error", { operation: operation, status: status, providerCode: providerCode || "unknown" })
		if (status === 401 || status === 403) return new ApiError("PROVIDER_ERROR", "Provider authorization was rejected. Ask an administrator to reconnect Codex credentials.", 502, false)
		if (status === 400 || status === 404 || status === 405 || status === 422) return new ApiError("PROVIDER_ERROR", "Provider rejected the backend request (HTTP " + status + "). Deploy the latest MaveCode Apps Script backend and try again.", 502, false)
		if (status === 429) return new ApiError("PROVIDER_ERROR", "Provider rate limit reached. Wait and retry.", 429, true)
		if (status >= 500) return new ApiError("PROVIDER_ERROR", "Provider is temporarily unavailable (HTTP " + status + "). Retry shortly.", 502, true)
		return new ApiError("PROVIDER_ERROR", "Provider request failed (HTTP " + status + "). Check the Apps Script deployment and provider connection.", 502, false)
	}

	function safeProviderError(text) {
		try {
			var payload = JSON.parse(text)
			var error = payload && payload.error
			var value = error && typeof error === "object" ? (error.code || error.type) : ""
			var messages = {
				token_expired: "Provider token is expired.",
				invalid_api_key: "Provider rejected the credential.",
				invalid_authentication: "Provider rejected the credential.",
				insufficient_permissions: "Provider credential lacks permission.",
				account_deactivated: "Provider account is unavailable."
			}
			return typeof value === "string" && Object.prototype.hasOwnProperty.call(messages, value) ? { code: value, message: messages[value] } : undefined
		} catch (_) { return undefined }
	}

	function safeProviderErrorCode(text) {
		var error = safeProviderError(text)
		return error ? error.code : ""
	}

	function logDiagnostic(deps, event, details) {
		if (!deps || typeof deps.log !== "function") return
		try { deps.log(event, details) } catch (_) { /* Diagnostics must never break a request. */ }
	}

	function validateMessages(messages, maxMessageBytes) {
		if (!Array.isArray(messages) || !messages.length || messages.length > 200) throw new ApiError("INVALID_REQUEST", "Messages must be a non-empty array", 400)
		var pending = {}
		var seenNonSystem = false
		var previousRole = ""
		return messages.map(function (message) {
			if (!message || ["system", "user", "assistant", "tool"].indexOf(message.role) < 0) throw new ApiError("INVALID_REQUEST", "Message role is not supported", 400)
			if (message.role === "system") {
				if (seenNonSystem || typeof message.content !== "string" || !message.content) throw new ApiError("INVALID_MESSAGE_ORDER", "System messages must be non-empty and precede the conversation", 400)
				checkSizedString(message.content, maxMessageBytes, "Message content")
				return { role: "system", content: message.content }
			}
			seenNonSystem = true
			if (message.role === "tool") {
				validateToolCallId(message.toolCallId)
				if (!pending[message.toolCallId]) throw new ApiError("INVALID_MESSAGE_ORDER", "Tool result does not match a pending tool call", 400)
				if (typeof message.content !== "string") throw new ApiError("INVALID_REQUEST", "Tool result must contain text", 400)
				checkSizedString(message.content, maxMessageBytes, "Tool result")
				delete pending[message.toolCallId]
				previousRole = "tool"
				return { role: "tool", toolCallId: message.toolCallId, content: message.content }
			}
			if (Object.keys(pending).length) throw new ApiError("INVALID_MESSAGE_ORDER", "All tool calls must have results before the next message", 400)
			if (!previousRole && message.role !== "user") throw new ApiError("INVALID_MESSAGE_ORDER", "Conversation must begin with a user message", 400)
			var result = { role: message.role, content: message.role === "user" ? validateUserContent(message.content, maxMessageBytes) : (typeof message.content === "string" ? message.content : "") }
			if (typeof result.content === "string" && result.content) checkSizedString(result.content, maxMessageBytes, "Message content")
			if (message.role === "assistant" && message.toolCalls !== undefined) {
				if (!Array.isArray(message.toolCalls) || !message.toolCalls.length || message.toolCalls.length > DEFAULTS.maxTools) throw new ApiError("INVALID_REQUEST", "Assistant tool calls are invalid", 400)
				result.toolCalls = message.toolCalls.map(function (call) {
					if (!call || pending[call.id]) throw new ApiError("INVALID_REQUEST", "Tool call ID must be unique", 400)
					validateToolCallId(call.id); validateToolName(call.name); validateArguments(call.arguments)
					pending[call.id] = call.name
					return { id: call.id, name: call.name, arguments: call.arguments }
				})
			}
			if (!result.content && !result.toolCalls) throw new ApiError("INVALID_REQUEST", "Message must contain text or tool calls", 400)
			previousRole = message.role
			return result
		})
	}

	function validateUserContent(content, maxMessageBytes) {
		if (typeof content === "string") { checkSizedString(content, maxMessageBytes, "Message content"); return content }
		if (!Array.isArray(content) || !content.length || content.length > 32) throw new ApiError("INVALID_REQUEST", "User content must contain text or images", 400)
		var hasContent = false
		var result = content.map(function (part) {
			if (!part || typeof part !== "object") throw new ApiError("INVALID_REQUEST", "User content part is invalid", 400)
			if (part.type === "text") {
				if (typeof part.text !== "string") throw new ApiError("INVALID_REQUEST", "Text content is invalid", 400)
				checkSizedString(part.text, maxMessageBytes, "Message content")
				if (part.text) hasContent = true
				return { type: "text", text: part.text }
			}
			if (part.type === "image_url") {
				validateImageUrl(part.imageUrl)
				hasContent = true
				return { type: "image_url", imageUrl: part.imageUrl }
			}
			throw new ApiError("INVALID_REQUEST", "User content type is not supported", 400)
		})
		if (!hasContent) throw new ApiError("INVALID_REQUEST", "User content must not be empty", 400)
		return result
	}

	function validateImageUrl(value) {
		if (typeof value !== "string") throw new ApiError("INVALID_IMAGE", "Image URL is invalid", 400)
		if (/^https:\/\//i.test(value)) {
			if (value.length > 8192) throw new ApiError("INVALID_IMAGE", "Image URL is too long", 400)
			return
		}
		var match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value)
		if (!match) throw new ApiError("INVALID_IMAGE", "Image must be HTTPS or a supported base64 image", 400)
		var estimatedBytes = Math.floor(match[2].length * 3 / 4) - (match[2].slice(-2) === "==" ? 2 : (match[2].slice(-1) === "=" ? 1 : 0))
		if (estimatedBytes > DEFAULTS.maxImageBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Image exceeds size limit", 413)
	}

	function validateTools(tools) {
		if (tools === undefined) return []
		if (!Array.isArray(tools) || tools.length > DEFAULTS.maxTools) throw new ApiError("INVALID_REQUEST", "Tool definitions are invalid", 400)
		var names = {}
		return tools.map(function (tool) {
			if (!tool || tool.type !== "function" || !tool.function || typeof tool.function !== "object") throw new ApiError("INVALID_REQUEST", "Only function tools are supported", 400)
			validateToolName(tool.function.name)
			if (names[tool.function.name]) throw new ApiError("INVALID_REQUEST", "Tool names must be unique", 400)
			names[tool.function.name] = true
			if (tool.function.description !== undefined) checkSizedString(tool.function.description, 8192, "Tool description")
			var parameters = tool.function.parameters || { type: "object", properties: {} }
			if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) throw new ApiError("INVALID_REQUEST", "Tool parameters must be a JSON schema object", 400)
			if (utf8Length(JSON.stringify(parameters)) > DEFAULTS.maxToolSchemaBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Tool schema exceeds size limit", 413)
			return { type: "function", function: { name: tool.function.name, description: stringValue(tool.function.description), parameters: parameters } }
		})
	}

	function validateToolChoice(choice, tools) {
		if (choice === undefined) return tools.length ? "auto" : undefined
		if (["auto", "none", "required"].indexOf(choice) >= 0) return choice
		if (choice && choice.type === "function" && choice.function) {
			validateToolName(choice.function.name)
			if (!tools.some(function (tool) { return tool.function.name === choice.function.name })) throw new ApiError("INVALID_REQUEST", "Selected tool is not defined", 400)
			return { type: "function", name: choice.function.name }
		}
		throw new ApiError("INVALID_REQUEST", "Tool choice is invalid", 400)
	}

	function buildRuntimeRequest(model, messages, tools, toolChoice, parallelToolCalls, promptCacheKey) {
		var input = []
		var instructions = []
		messages.forEach(function (message) {
			if (message.role === "system") { instructions.push(message.content); return }
			if (message.role === "tool") { input.push({ type: "function_call_output", call_id: message.toolCallId, output: message.content }); return }
			if (message.role === "assistant" && message.content) input.push({ role: "assistant", content: [{ type: "output_text", text: message.content }] })
			if (message.role === "user") input.push({ role: "user", content: buildUserInputContent(message.content) })
			if (message.role === "assistant" && message.toolCalls) message.toolCalls.forEach(function (call) { input.push({ type: "function_call", call_id: call.id, name: call.name, arguments: call.arguments }) })
		})
		// Codex's inherited working request contract requires streaming responses.
		// UrlFetchApp still buffers the complete SSE body; normalizeProviderResponse
		// parses that buffered stream after the upstream request completes.
		var payload = { model: model, input: input, stream: true, store: false, parallel_tool_calls: parallelToolCalls }
		if (promptCacheKey) payload.prompt_cache_key = promptCacheKey
		if (instructions.length) payload.instructions = instructions.join("\n\n")
		if (tools.length) payload.tools = tools.map(function (tool) { return { type: "function", name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters, strict: false } })
		if (toolChoice !== undefined) payload.tool_choice = toolChoice
		return payload
	}

	function validatePromptCacheKey(value) {
		if (value === undefined) return undefined
		if (typeof value !== "string" || !value || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) throw new ApiError("INVALID_REQUEST", "Prompt cache key is invalid", 400)
		return value
	}

	function buildUserInputContent(content) {
		if (typeof content === "string") return [{ type: "input_text", text: content }]
		return content.map(function (part) {
			return part.type === "image_url" ? { type: "input_image", image_url: part.imageUrl } : { type: "input_text", text: part.text }
		})
	}

	function normalizeProviderResponse(text) {
		var records = []
		try { records = [JSON.parse(text)] } catch (_) {
			text.split(/\r?\n/).forEach(function (line) {
				if (line.indexOf("data:") !== 0) return
				var data = line.slice(5).trim()
				if (!data || data === "[DONE]") return
				try { records.push(JSON.parse(data)) } catch (_) { throw new ApiError("INVALID_PROVIDER_RESPONSE", "Provider returned an invalid event stream", 502) }
			})
		}
		if (!records.length) throw new ApiError("INVALID_PROVIDER_RESPONSE", "Provider returned an invalid response", 502)
		var id = "", textParts = [], calls = {}, usage
		function addCall(index, callId, name, args) {
			var key = String(index === undefined ? Object.keys(calls).length : index)
			if (!calls[key]) calls[key] = { id: "", name: "", arguments: "" }
			if (callId) calls[key].id = callId
			if (name) calls[key].name = name
			if (args) calls[key].arguments += args
		}
		records.forEach(function (value) {
			if (value.error) throw new ApiError("PROVIDER_ERROR", "Provider returned an error", 502, true)
			id = id || stringValue(value.id) || stringValue(value.response && value.response.id) || ""
			if (typeof value.output_text === "string") textParts.push(value.output_text)
			var choice = value.choices && value.choices[0]
			if (choice && choice.message && typeof choice.message.content === "string") textParts.push(choice.message.content)
			if (choice && choice.delta && typeof choice.delta.content === "string") textParts.push(choice.delta.content)
			var choiceCalls = choice && ((choice.message && choice.message.tool_calls) || (choice.delta && choice.delta.tool_calls))
			if (choiceCalls) choiceCalls.forEach(function (call) { addCall(call.index, call.id, call.function && call.function.name, call.function && call.function.arguments) })
			var output = value.output || (value.response && value.response.output)
			if (Array.isArray(output)) output.forEach(function (item, index) {
				if (item.type === "message" && Array.isArray(item.content)) item.content.forEach(function (part) { if ((part.type === "output_text" || part.type === "text") && typeof part.text === "string") textParts.push(part.text) })
				if (item.type === "function_call") addCall(index, item.call_id || item.id, item.name, item.arguments)
			})
			if (value.type === "response.output_text.delta" && typeof value.delta === "string") textParts.push(value.delta)
			if (value.type === "response.function_call_arguments.delta") addCall(value.output_index, value.call_id || value.item_id, value.name, value.delta)
			if (value.type === "response.output_item.added" && value.item && value.item.type === "function_call") addCall(value.output_index, value.item.call_id || value.item.id, value.item.name, value.item.arguments)
			usage = safeUsage(value.usage || (value.response && value.response.usage)) || usage
		})
		var events = []
		if (textParts.join("")) events.push({ type: "text", text: textParts.join("") })
		Object.keys(calls).forEach(function (key) {
			var call = calls[key]; validateToolCallId(call.id); validateToolName(call.name); validateArguments(call.arguments)
			events.push({ type: "tool_call", id: call.id, name: call.name, arguments: call.arguments })
		})
		if (usage) events.push({ type: "usage", inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, totalTokens: usage.totalTokens })
		events.push({ type: "completed" })
		return { id: id, events: events }
	}

	function safeUsage(value) {
		if (!value || typeof value !== "object") return undefined
		return { inputTokens: Number(value.prompt_tokens || value.input_tokens || 0), outputTokens: Number(value.completion_tokens || value.output_tokens || 0), totalTokens: Number(value.total_tokens || 0) }
	}
	function unique(values) { var seen = {}; return values.filter(function (value) { if (!value || seen[value]) return false; seen[value] = true; return true }) }
	function checkSizedString(value, limit, label) { if (typeof value !== "string" || utf8Length(value) > limit) throw new ApiError("PAYLOAD_TOO_LARGE", label + " exceeds size limit", 413) }
	function validateToolCallId(value) { if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new ApiError("INVALID_TOOL_CALL", "Tool call ID is invalid", 400) }
	function validateToolName(value) { if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new ApiError("INVALID_TOOL_CALL", "Tool name is invalid", 400) }
	function validateArguments(value) {
		checkSizedString(value, DEFAULTS.maxToolArgumentBytes, "Tool arguments")
		var parsed
		try { parsed = JSON.parse(value) } catch (_) { throw new ApiError("INVALID_TOOL_ARGUMENTS", "Tool arguments must be valid JSON", 400) }
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ApiError("INVALID_TOOL_ARGUMENTS", "Tool arguments must be a JSON object", 400)
	}

	function consumeQuota(subject, deps, config) {
		var bucket = Math.floor(deps.now() / 60000)
		var key = "quota:" + sha256(subject, deps) + ":" + bucket
		withLock(deps.lock, config.lockWaitMs, function () {
			var count = Number(deps.cache.get(key) || 0)
			if (count >= config.quotaPerMinute) throw new ApiError("QUOTA_EXCEEDED", "Request quota exceeded", 429, true)
			deps.cache.put(key, String(count + 1), 120)
		})
	}

	function requireAdminOrSession(request, deps, config) {
		try { requireAdmin(request, deps, config) } catch (_) { requireSession(request, deps, config) }
	}
	function requireAdmin(request, deps, config) {
		var email = currentIdentity(deps)
		if (roleFor(email, config) !== "admin") throw new ApiError("FORBIDDEN", "Administrator access required", 403)
		return email
	}
	function currentIdentity(deps) {
		var email = String(deps.identity.getEmail() || "").trim().toLowerCase()
		if (!email) throw new ApiError("UNAUTHENTICATED", "A signed-in user identity is required", 401)
		return email
	}
	function roleFor(email, config) {
		if (config.adminUsers.indexOf(email) >= 0) return "admin"
		if (config.allowedUsers.indexOf(email) >= 0) return "user"
		var separator = email.lastIndexOf("@")
		var domain = separator >= 0 ? email.slice(separator + 1) : ""
		if (domain && config.allowedDomains.indexOf(domain) >= 0) return "user"
		return ""
	}
	function readSessionToken(request) {
		var token = request.body.sessionToken || request.parameters.sessionToken
		if (typeof token !== "string" || !/^mave_ext_[A-Za-z0-9_-]{20,}$/.test(token)) throw new ApiError("UNAUTHENTICATED", "A valid extension session is required", 401)
		return token
	}
	function publicClaims(record) { return { subject: String(record.subject), role: String(record.role), issuedAt: Number(record.issuedAt), expiresAt: Number(record.expiresAt) } }

	function normalizeError(error) {
		if (error instanceof ApiError) return { code: error.code, message: error.message, status: error.status, retryable: error.retryable }
		return { code: "INTERNAL_ERROR", message: "Internal server error", status: 500, retryable: false }
	}
	function success(data) { return { status: 200, body: { ok: true, protocolVersion: PROTOCOL, data: data } } }
	function failure(error) { return { status: error.status, body: { ok: false, protocolVersion: PROTOCOL, error: { code: error.code, message: redact(error.message), retryable: error.retryable } } } }
	function redact(text) { return String(text).replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]").replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]") }

	function withLock(lock, waitMs, operation) {
		if (!lock.tryLock(waitMs)) throw new ApiError("BUSY", "Backend is busy; retry later", 503, true)
		try { return operation() } finally { lock.releaseLock() }
	}
	function readJsonProperty(properties, key) {
		var value = properties.getProperty(key)
		if (!value) return null
		try { return JSON.parse(value) } catch (_) { return null }
	}
	function header(event, name) { return event.headers && (event.headers[name] || event.headers[name.toLowerCase()]) }
	function csv(value) { return String(value || "").split(",").map(function (item) { return item.trim().toLowerCase() }).filter(Boolean) }
	function positiveNumber(value, fallback) { var number = Number(value); return isFinite(number) && number > 0 ? number : fallback }
	function stringValue(value) { return typeof value === "string" && value ? value : undefined }
	function utf8Length(value) { return unescape(encodeURIComponent(value)).length }
	function randomToken(deps) { return webSafeBase64(deps.crypto.base64EncodeWebSafe(deps.crypto.getUuid() + deps.crypto.getUuid())).replace(/-/g, "A").replace(/_/g, "B") }
	function validOpaque(value) { return typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value) }
	function pkceChallenge(verifier, deps) { return webSafeBase64(deps.crypto.base64EncodeWebSafe(deps.crypto.computeDigest(deps.crypto.DigestAlgorithm.SHA_256, verifier, deps.crypto.Charset.UTF_8))) }
	function sha256(value, deps) { return hex(deps.crypto.computeDigest(deps.crypto.DigestAlgorithm.SHA_256, value, deps.crypto.Charset.UTF_8)) }
	function hex(bytes) { return bytes.map(function (byte) { var value = byte < 0 ? byte + 256 : byte; return ("0" + value.toString(16)).slice(-2) }).join("") }
	function webSafeBase64(value) { return String(value).replace(/=+$/g, "") }
	function constantTimeEqual(left, right) {
		left = String(left); right = String(right)
		var mismatch = left.length ^ right.length
		var length = Math.max(left.length, right.length)
		for (var index = 0; index < length; index += 1) mismatch |= (left.charCodeAt(index % (left.length || 1)) || 0) ^ (right.charCodeAt(index % (right.length || 1)) || 0)
		return mismatch === 0
	}

	return { handle: handle, _test: { constantTimeEqual: constantTimeEqual, readConfig: readConfig, verifyIntake: verifyIntake } }
})()

if (typeof module !== "undefined") module.exports = MaveCodeBackend
