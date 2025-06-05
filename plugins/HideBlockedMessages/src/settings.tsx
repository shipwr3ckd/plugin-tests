import { ReactNative as RN } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { FormSwitchRow } = Forms;

export default () => {
    useProxy(storage);

    return (
        <RN.ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <FormSwitchRow
                label="Remove blocked messages"
                value={storage["blocked"]}
                onValueChange={(v: boolean) => storage["blocked"] = v}
            />
            <FormSwitchRow
                label="Remove ignored messages"
                value={storage["ignored"]}
                onValueChange={(v: boolean) => storage["ignored"] = v}
            />
        </RN.ScrollView>
    );
};