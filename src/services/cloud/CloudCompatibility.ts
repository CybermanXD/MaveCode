import { EventEmitter } from "events"
import type { CloudUserInfo, OrganizationAllowList } from "@roo-code/types"

/**
 * Local compatibility surface for UI/state code inherited from the upstream
 * cloud integration. It deliberately has no transport, credentials, timers,
 * telemetry upload, sign-in, sharing, or settings synchronization behavior.
 */
class LocalCloudCompatibility extends EventEmitter {
	public readonly isCloudAgent = false

	public isAuthenticated(): boolean {
		return false
	}

	public hasOrIsAcquiringActiveSession(): boolean {
		return false
	}

	public getOrganizationId(): undefined {
		return undefined
	}

	public getStoredOrganizationId(): null {
		return null
	}

	public getUserInfo(): CloudUserInfo | null {
		return null
	}

	public getOrganizationSettings(): { version: number } | undefined {
		return undefined
	}

	public async getOrganizationMemberships(): Promise<[]> {
		return []
	}

	public async getAllowList(): Promise<OrganizationAllowList> {
		return { allowAll: true, providers: {} }
	}

	public captureEvent(_event?: unknown): void {
		// Intentionally unavailable: compatibility telemetry never leaves the process.
	}

	public async login(_landingPageSlug?: string, _useProviderSignup?: boolean): Promise<never> {
		throw new Error("Cloud sign-in is unavailable in this local build")
	}

	public async logout(): Promise<void> {
		// Preserve idempotent sign-out UI behavior without any network or credential action.
	}

	public async handleAuthCallback(
		_code?: string,
		_state?: string,
		_organizationId?: string | null,
	): Promise<never> {
		throw new Error("Cloud authentication is unavailable in this local build")
	}

	public async switchOrganization(_organizationId?: string | null): Promise<never> {
		throw new Error("Cloud organizations are unavailable in this local build")
	}
}

const localCloudCompatibility = new LocalCloudCompatibility()

export const CloudService = {
	get instance(): LocalCloudCompatibility {
		return localCloudCompatibility
	},
	hasInstance(): boolean {
		return false
	},
	isEnabled(): boolean {
		return false
	},
}

/** Empty by design: no inherited cloud endpoint is exposed to the UI. */
export function getRooCodeApiUrl(): string {
	return ""
}

/** Retained only to select the established production MDM filename locally. */
export const PRODUCTION_CLERK_BASE_URL = "local-disabled"

export function getClerkBaseUrl(): string {
	return PRODUCTION_CLERK_BASE_URL
}
