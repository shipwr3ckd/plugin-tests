import { BetterTableRowGroup } from "$/components/BetterTableRow";
import { ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { lang, vstorage } from "..";

const { ScrollView } = ReactNative;
const { FormRow, FormSwitchRow } = Forms;

export function Settings() {
	useProxy(vstorage);

	// Always keep dangerZone enabled
	vstorage.dangerZone = true;

	return (
		<ScrollView style={{ flex: 1 }}>
			<BetterTableRowGroup title="Settings" icon={getAssetIDByName("CogIcon")}>
				<FormSwitchRow
					label="placeholder"
					subLabel={lang.format("settings.danger_zone.description", {})}
					leading={<FormRow.Icon source={getAssetIDByName("WarningIcon")} />}
					onValueChange={() => {}} // disable toggle
					value={true} // always on
				/>
			</BetterTableRowGroup>
		</ScrollView>
	);
}