/* ==========================================
 * 🎭 BotPuppet v1.0.0
 * Built by: SkullVension (https://github.com/skullvension)
 * ========================================== */

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));
app.use(express.json({ limit: '15mb' }));

const knownDmChannels = new Map();

function serializeGuild(guild) {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 64 }) || null,
    memberCount: guild.memberCount
  };
}

function serializeChannel(channel) {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId,
    position: channel.position
  };
}

function serializeMember(member) {
  const presence = member.presence;
  const status = presence ? presence.status : 'offline';
  return {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    avatar: member.user.displayAvatarURL({ size: 64 }),
    status,
    isBot: member.user.bot,
    roleColor: member.displayHexColor !== '#000000' ? member.displayHexColor : null
  };
}

function serializeAttachment(attachment) {
  return {
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    contentType: attachment.contentType,
    size: attachment.size
  };
}

function serializeReactions(message) {
  return message.reactions.cache.map((reaction) => ({
    emoji: reaction.emoji.id
      ? { id: reaction.emoji.id, name: reaction.emoji.name, animated: reaction.emoji.animated }
      : { name: reaction.emoji.name },
    count: reaction.count,
    me: reaction.me
  }));
}

function serializeMessage(message) {
  return {
    id: message.id,
    channelId: message.channelId,
    guildId: message.guildId,
    content: message.content,
    author: {
      id: message.author.id,
      username: message.author.username,
      displayName: message.member ? message.member.displayName : message.author.username,
      avatar: message.author.displayAvatarURL({ size: 64 }),
      isBot: message.author.bot
    },
    isOwnedByBot: message.author.id === client.user?.id,
    timestamp: message.createdTimestamp,
    editedTimestamp: message.editedTimestamp,
    attachments: Array.from(message.attachments.values()).map(serializeAttachment),
    embeds: message.embeds.map((embed) => embed.toJSON ? embed.toJSON() : embed),
    reactions: serializeReactions(message)
  };
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  io.emit('bot-ready', {
    id: client.user.id,
    username: client.user.username,
    avatar: client.user.displayAvatarURL({ size: 128 }),
    tag: client.user.tag
  });
});

client.on('messageCreate', (message) => {
  if (message.guild) {
    io.emit('message-new', serializeMessage(message));
  } else {
    knownDmChannels.set(message.channel.id, {
      id: message.channel.id,
      recipientId: message.author.id !== client.user.id ? message.author.id : message.channel.recipientId,
      recipientUsername: message.author.id !== client.user.id ? message.author.username : null,
      recipientAvatar: message.author.id !== client.user.id ? message.author.displayAvatarURL({ size: 64 }) : null,
      lastMessageTimestamp: message.createdTimestamp
    });
    io.emit('dm-new', serializeMessage(message));
    io.emit('dm-channel-update', Array.from(knownDmChannels.values()));
  }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  if (!newMessage.author) return;
  io.emit('message-edit', serializeMessage(newMessage));
});

client.on('messageDelete', (message) => {
  io.emit('message-delete', { id: message.id, channelId: message.channelId });
});

client.on('messageReactionAdd', (reaction, user) => {
  io.emit('reaction-update', {
    messageId: reaction.message.id,
    channelId: reaction.message.channelId,
    reactions: serializeReactions(reaction.message)
  });
});

client.on('messageReactionRemove', (reaction, user) => {
  io.emit('reaction-update', {
    messageId: reaction.message.id,
    channelId: reaction.message.channelId,
    reactions: serializeReactions(reaction.message)
  });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  io.emit('member-update', {
    guildId: newMember.guild.id,
    member: serializeMember(newMember)
  });
});

client.on('presenceUpdate', (oldPresence, newPresence) => {
  if (!newPresence || !newPresence.member) return;
  io.emit('member-update', {
    guildId: newPresence.guild.id,
    member: serializeMember(newPresence.member)
  });
});

io.on('connection', (socket) => {
  socket.emit('bot-status', client.isReady() ? {
    ready: true,
    id: client.user.id,
    username: client.user.username,
    avatar: client.user.displayAvatarURL({ size: 128 }),
    tag: client.user.tag
  } : { ready: false });

  socket.on('guilds-fetch', async () => {
    try {
      const guilds = Array.from(client.guilds.cache.values()).map(serializeGuild);
      socket.emit('guilds-list', guilds);
    } catch (error) {
      socket.emit('error-toast', { message: 'Could not load your servers right now.' });
    }
  });

  socket.on('channels-fetch', async ({ guildId }) => {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return socket.emit('error-toast', { message: 'That server is no longer available.' });
      const channels = Array.from(guild.channels.cache.values())
        .filter((channel) => channel.type === 0 || channel.type === 4 || channel.type === 2)
        .map(serializeChannel)
        .sort((a, b) => a.position - b.position);
      socket.emit('channels-list', { guildId, channels });
    } catch (error) {
      socket.emit('error-toast', { message: 'Could not load channels for that server.' });
    }
  });

  socket.on('members-fetch', async ({ guildId }) => {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return socket.emit('error-toast', { message: 'That server is no longer available.' });
      const members = await guild.members.fetch();
      const serialized = Array.from(members.values()).map(serializeMember);
      socket.emit('members-list', { guildId, members: serialized });
    } catch (error) {
      socket.emit('error-toast', { message: 'Could not load the member list.' });
    }
  });

  socket.on('messages-fetch', async ({ channelId }) => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return socket.emit('error-toast', { message: 'That channel could not be opened.' });
      }
      const fetched = await channel.messages.fetch({ limit: 50 });
      const serialized = Array.from(fetched.values())
        .map(serializeMessage)
        .sort((a, b) => a.timestamp - b.timestamp);
      socket.emit('messages-list', { channelId, messages: serialized });
    } catch (error) {
      socket.emit('error-toast', { message: 'Could not load message history for this channel.' });
    }
  });

  socket.on('message-send', async ({ channelId, content, attachment, embed }) => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return socket.emit('error-toast', { message: 'That channel could not be reached.' });
      }
      const payload = {};
      if (content && content.trim().length > 0) payload.content = content;

      if (attachment && attachment.base64 && attachment.filename) {
        const buffer = Buffer.from(attachment.base64, 'base64');
        payload.files = [new AttachmentBuilder(buffer, { name: attachment.filename })];
      }

      if (embed) {
        const builder = new EmbedBuilder();
        if (embed.title) builder.setTitle(embed.title);
        if (embed.description) builder.setDescription(embed.description);
        if (embed.color) builder.setColor(embed.color);
        if (embed.authorName) builder.setAuthor({ name: embed.authorName, iconURL: embed.authorIcon || undefined });
        if (embed.thumbnailUrl) builder.setThumbnail(embed.thumbnailUrl);
        if (embed.imageUrl) builder.setImage(embed.imageUrl);
        if (embed.footerText) builder.setFooter({ text: embed.footerText, iconURL: embed.footerIcon || undefined });
        payload.embeds = [builder];
      }

      if (!payload.content && !payload.files && !payload.embeds) {
        return socket.emit('error-toast', { message: 'Write something before sending.' });
      }

      const sent = await channel.send(payload);
      if (!channel.guild) {
        knownDmChannels.set(channel.id, {
          id: channel.id,
          recipientId: channel.recipientId || null,
          recipientUsername: sent.channel.recipient ? sent.channel.recipient.username : null,
          recipientAvatar: sent.channel.recipient ? sent.channel.recipient.displayAvatarURL({ size: 64 }) : null,
          lastMessageTimestamp: sent.createdTimestamp
        });
        io.emit('dm-channel-update', Array.from(knownDmChannels.values()));
      }
    } catch (error) {
      socket.emit('error-toast', { message: 'That message could not be sent. The bot may be missing permission to post here.' });
    }
  });

  socket.on('message-delete-request', async ({ channelId, messageId }) => {
    try {
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      if (message.author.id !== client.user.id) {
        return socket.emit('error-toast', { message: 'Only messages sent by the bot can be removed here.' });
      }
      await message.delete();
    } catch (error) {
      socket.emit('error-toast', { message: 'That message could not be deleted.' });
    }
  });

  socket.on('message-edit-request', async ({ channelId, messageId, content }) => {
    try {
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      if (message.author.id !== client.user.id) {
        return socket.emit('error-toast', { message: 'Only messages sent by the bot can be edited here.' });
      }
      if (!content || content.trim().length === 0) {
        return socket.emit('error-toast', { message: 'An edited message cannot be empty.' });
      }
      await message.edit({ content });
    } catch (error) {
      socket.emit('error-toast', { message: 'That message could not be edited.' });
    }
  });

  socket.on('reaction-add-request', async ({ channelId, messageId, emoji }) => {
    try {
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.react(emoji);
    } catch (error) {
      socket.emit('error-toast', { message: 'That reaction could not be added.' });
    }
  });

  socket.on('reaction-toggle', async ({ channelId, messageId, emoji }) => {
    try {
      const channel = await client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      const existing = message.reactions.cache.find((reaction) =>
        emoji.id ? reaction.emoji.id === emoji.id : reaction.emoji.name === emoji.name
      );
      let botAlreadyReacted = false;
      if (existing) {
        const reactedUsers = await existing.users.fetch();
        botAlreadyReacted = reactedUsers.has(client.user.id);
      }
      if (botAlreadyReacted) {
        await existing.users.remove(client.user.id);
      } else {
        await message.react(emoji.id || emoji.name);
      }
      const refreshed = await channel.messages.fetch({ message: messageId, force: true });
      io.emit('reaction-update', {
        messageId,
        channelId,
        reactions: serializeReactions(refreshed)
      });
    } catch (error) {
      socket.emit('error-toast', { message: 'That reaction could not be updated.' });
    }
  });

  socket.on('dm-channels-fetch', () => {
    socket.emit('dm-channel-update', Array.from(knownDmChannels.values()));
  });

  socket.on('dm-open-request', async ({ userId }) => {
    try {
      const user = await client.users.fetch(userId);
      if (user.bot) {
        return socket.emit('error-toast', { message: 'That account is a bot. Bots cannot receive direct messages from other bots.' });
      }
      const dmChannel = await user.createDM();
      knownDmChannels.set(dmChannel.id, {
        id: dmChannel.id,
        recipientId: user.id,
        recipientUsername: user.username,
        recipientAvatar: user.displayAvatarURL({ size: 64 }),
        lastMessageTimestamp: Date.now()
      });
      socket.emit('dm-channel-update', Array.from(knownDmChannels.values()));
      socket.emit('dm-opened', { channelId: dmChannel.id, recipientUsername: user.username });
    } catch (error) {
      console.log('[DM ERROR] code:', error.code, '| message:', error.message);
      if (error.code === 10013) {
        socket.emit('error-toast', { message: 'No user was found with that ID. Double check the number and try again.' });
      } else if (error.code === 50007) {
        socket.emit('error-toast', { message: 'This user has their DMs closed to this bot, or has no shared server and has never messaged it first.' });
      } else {
        socket.emit('error-toast', { message: 'This conversation could not be opened. Discord rejected the request.' });
      }
    }
  });

  socket.on('bot-identity-update', async ({ username, avatarBase64 }) => {
    try {
      if (username && username.trim().length > 0) {
        await client.user.setUsername(username.trim());
      }
      if (avatarBase64) {
        const buffer = Buffer.from(avatarBase64, 'base64');
        await client.user.setAvatar(buffer);
      }
      socket.emit('bot-identity-updated', {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.displayAvatarURL({ size: 128 }),
        tag: client.user.tag
      });
      io.emit('bot-ready', {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.displayAvatarURL({ size: 128 }),
        tag: client.user.tag
      });
    } catch (error) {
      socket.emit('error-toast', { message: 'The bot profile could not be updated. Discord limits how often this can change.' });
    }
  });
});

client.login(BOT_TOKEN).catch((error) => {
  console.error('Failed to log in with the provided bot token.', error.message);
});

server.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});