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
        console.error("sidebar.tsx: Missing modules");
        return () => {};
    }

    const unpatch = after("type", GuildMemberRow, ([{ guildId, channel, user }], ret) => {
        if (!ret?.props) return;

        const tagComponent = findInReactTree(ret, (c) => c?.type?.Types);
        if (tagComponent && BUILT_IN_TAGS.includes(getBotLabel(tagComponent.props?.type))) return;

        const guild = GuildStore.getGuild(guildId);
        const tag = getTag(guild, channel, user);
        if (!tag) return;

        if (tagComponent) {
            tagComponent.props = {
                type: 0,
                ...tag,
            };
            return;
        }

        // Find the row container with flexDirection: row
        const row = findInReactTree(ret, (c) => c?.props?.style?.flexDirection === "row");
        if (!row?.props) {
            console.warn("sidebar.tsx: Could not find row with flexDirection=row");
            return;
        }

        const tagElement = (
            <TagModule.default
                type={0}
                text={tag.text}
                textColor={tag.textColor}
                backgroundColor={tag.backgroundColor}
                verified={tag.verified}
            />
        );

        const children = row.props.children;

        if (Array.isArray(children)) {
            // Safely insert into array
            children.splice(2, 0, tagElement);
        } else if (children != null) {
            // Convert existing element into array
            row.props.children = [children, tagElement];
        } else {
            // If children is missing entirely
            row.props.children = [tagElement];
        }
    });

    return () => unpatch();
};