import { Package } from "../../shared/package"

export const DEFAULT_HEADERS = {
	"HTTP-Referer": "https://github.com/MaveCode-Org/MaveCode",
	"X-Title": "MaveCode",
	"User-Agent": `MaveCode/${Package.version}`,
}
