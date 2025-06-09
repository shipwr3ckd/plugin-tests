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
        console.error("sidebar.tsx: Failed to load modules.", {
            GuildMemberRow, getBotLabel, GuildStore
        });
        return () => {};
    }

    const unpatch = after("type", GuildMemberRow, ([{ guildId, channel, user }], ret) => {
        const tagComponent = findInReactTree(ret, (c) => c?.type?.Types);
        if (!tagComponent || !BUILT_IN_TAGS.includes(getBotLabel(tagComponent.props?.type))) {
            const guild = GuildStore.getGuild(guildId);
            const tag = getTag(guild, channel, user);

            if (tag) {
                if (tagComponent) {
                    tagComponent.props = {
                        type: 0,
                        ...tag,
                    };
                } else {
                    const row = findInReactTree(ret, (c) => c?.props?.style?.flexDirection === "row");
                    if (!row?.props) {
                        console.warn("sidebar.tsx: Failed to find row container");
                        return;
                    }

                    const children = row.props.children;

                    const tagElement = (
                        <TagModule.default
                            type={0}
                            text={tag.text}
                            textColor={tag.textColor}
                            backgroundColor={tag.backgroundColor}
                            verified={tag.verified}
                        />
                    );

                    // 🛠 Safely insert into children
                    if (Array.isArray(children)) {
                        children.splice(2, 0, tagElement);
                    } else if (children != null) {
                        // Wrap non-array children into array
                        row.props.children = [children, tagElement];
                    } else {
                        // No children at all
                        row.props.children = [tagElement];
                    }
                }
            }
        }
    });

    return () => unpatch();
};