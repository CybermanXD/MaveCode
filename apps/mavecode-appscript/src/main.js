/* global ContentService */

function createProductionDependencies_() {
	return {
		properties: PropertiesService.getScriptProperties(),
		cache: CacheService.getScriptCache(),
		lock: LockService.getScriptLock(),
		identity: { getEmail: function () { return Session.getActiveUser().getEmail() } },
		fetch: function (url, options) { return UrlFetchApp.fetch(url, options) },
		crypto: Utilities,
		now: function () { return Date.now() },
		log: function (event, details) { console.warn(JSON.stringify({ component: "mavecode-appscript", event: event, details: details })) }
	}
}

function doGet(event) {
	return respond_(MaveCodeBackend.handle("GET", event || {}, createProductionDependencies_()))
}

function doPost(event) {
	return respond_(MaveCodeBackend.handle("POST", event || {}, createProductionDependencies_()))
}

function respond_(response) {
	return ContentService.createTextOutput(JSON.stringify(response.body)).setMimeType(ContentService.MimeType.JSON)
}

if (typeof module !== "undefined") module.exports = { doGet: doGet, doPost: doPost, respond_: respond_ }
