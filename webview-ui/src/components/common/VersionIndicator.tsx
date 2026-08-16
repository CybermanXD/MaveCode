import React from "react"
import { useTranslation } from "react-i18next"
import { Package } from "@roo/package"

interface VersionIndicatorProps {
	className?: string
}

const VersionIndicator: React.FC<VersionIndicatorProps> = ({ className = "" }) => {
	const { t } = useTranslation()

	return (
		<div
			className={`text-xs text-vscode-descriptionForeground rounded-full px-2 py-1 border ${className}`}
			aria-label={t("chat:versionIndicator.ariaLabel", { version: Package.version })}>
			v{Package.version}
		</div>
	)
}

export default VersionIndicator
