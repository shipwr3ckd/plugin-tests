import { FluxDispatcher } from '@vendetta/metro/common';
import { before } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";
import { logger } from "@vendetta";
import Settings from "./settings";

const RowManager = findByName("RowManager");
const RelationshipStore = findByProps("getRelationships", "isBlocked", "isIgnored");

const pluginName = "HideBlockedAndIgnoredMessages";

function constructMessage(message, channel) {
    let msg = {
        id: '',
        type: 0,
        content: '',
        channel_id: channel.id,
        author: {
            id: '',
            username: '',
            avatar: '',
            discriminator: '',
            publicFlags: 0,
            avatarDecoration: null,
        },
        attachments: [],
        embeds: [],
        mentions: [],
        mention_roles: [],
        pinned: false,
        mention_everyone: false,
        tts: false,
        timestamp: '',
        edited_timestamp: null,
        flags: 0,
        components: [],
    };

    if (typeof message === 'string') msg.content = message;
    else msg = { ...msg, ...message };

    return msg;
}

// Check
const isFilteredUser = (id) => {
    if (!id) return false;
    if (storage.blocked && RelationshipStore.isBlocked(id)) return true;
    if (storage.ignored && RelationshipStore.isIgnored(id)) return true;
    return false;
};

let patches = [];

const startPlugin = () => {
    try {
        // Patch dispatcher
        const patch1 = before("dispatch", FluxDispatcher, ([event]) => {
            if (event.type === "LOAD_MESSAGES_SUCCESS") {
                event.messages = event.messages.filter(
                    (message) => !isFilteredUser(message?.author?.id)
                );
            }

            if (event.type === "MESSAGE_CREATE" || event.type === "MESSAGE_UPDATE") {
                let message = event.message;
                if (isFilteredUser(message?.author?.id)) {
                    event.channelId = "0"; // Drop the event
                }
            }
        });
        patches.push(patch1);

        // Patch message rendering
        const patch2 = before("generate", RowManager.prototype, ([data]) => {
            if (isFilteredUser(data.message?.author?.id)) {
                data.renderContentOnly = true;
                data.message.content = null;
                data.message.reactions = [];
                data.message.canShowComponents = false;
                if (data.rowType === 2) {
                    data.roleStyle = "";
                    data.text = "[Filtered message. Check plugin settings.]";
                    data.revealed = false;
                    data.content = [];
                }
            }
        });
        patches.push(patch2);

        logger.log(`${pluginName} loaded.`);
    } catch (err) {
        logger.error(`[${pluginName} Error]`, err);
    }
};

export default {
    onLoad: () => {
        logger.log(`Loading ${pluginName}...`);

        // User settings
        storage.blocked ??= true;
        storage.ignored ??= true;

        // Trigger handlers
        for (let type of ["MESSAGE_CREATE", "MESSAGE_UPDATE", "LOAD_MESSAGES", "LOAD_MESSAGES_SUCCESS"]) {
            logger.log(`Dispatching ${type} to enable handler.`);
            FluxDispatcher.dispatch({
                type: type,
                message: constructMessage('PLACEHOLDER', { id: '0' }),
                messages: [],
            });
        }

        startPlugin();
    },

    onUnload: () => {
        logger.log(`Unloading ${pluginName}...`);
        for (let unpatch of patches) {
            unpatch();
        }
        logger.log(`${pluginName} unloaded.`);
    },

        settings: Settings
    }
};