import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { findInReactTree } from "@vendetta/utils";
import getTag, { BUILT_IN_TAGS } from "../lib/getTag";

const GuildMemberRow = findByName("GuildMemberRow", false);
const TagModule = findByProps("getBotLabel");
const getBotLabel = TagModule?.getBotLabel;
const GuildStore = findByStoreName("GuildStore");

export default () => {
    if (!GuildMemberRow || !getBotLabel || !GuildStore) {
        console.error("Missing modules in sidebar.tsx:", { GuildMemberRow, getBotLabel, GuildStore });
        return () => {};
    }

    const unpatch = after("type", GuildMemberRow, ([props], ret) => {
        const { guildId, channel, user } = props;
        console.log("Sidebar Row Props:", props);

        const tagComponent = findInReactTree(ret, (c) => c?.type?.Types);
        if (!tagComponent || !BUILT_IN_TAGS.includes(getBotLabel(tagComponent.props.type))) {
            const guild = GuildStore.getGuild(guildId);
            const tag = getTag(guild, channel, user);

            if (tag) {
                if (tagComponent) {
                    tagComponent.props = {
                        type: 0,
                        ...tag
                    };
                } else {
                    const row = findInReactTree(ret, (c) => c?.props?.style?.flexDirection === "row");
                    if (!row) {
                        console.warn("Sidebar: Could not find row container.");
                        return;
                    }

                    row.props.children.splice(2, 0,
                        <TagModule.default
                            type={0}
                            text={tag.text}
                            textColor={tag.textColor}
                            backgroundColor={tag.backgroundColor}
                            verified={tag.verified}
                        />
                    );
                }
            }
        }
    });

    return () => unpatch();
};