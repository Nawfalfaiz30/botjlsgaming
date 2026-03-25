// commands/ai.js

const { SlashCommandBuilder } = require('discord.js');
const { modEmbed } = require('../helpers/embed');
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

module.exports = {
  name: 'ai',
  description: 'Tanya apa saja ke AI',

  slashBuilder: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Tanya apa saja ke AI')
    .addStringOption(option =>
      option
        .setName('pertanyaan')
        .setDescription('Pertanyaan atau perintah untuk AI')
        .setRequired(true)
    ),

  async execute(ctx) {
    const isSlash = ctx.isChatInputCommand?.() ?? false;

    let pertanyaan;

    if (isSlash) {
      pertanyaan = ctx.options.getString('pertanyaan')?.trim();
    } else {
      // Support: jls!ai dan .ai
      if (ctx.content.startsWith('jls!ai')) {
        pertanyaan = ctx.content.slice('jls!ai'.length).trim();
      } else if (ctx.content.startsWith('.ai')) {
        pertanyaan = ctx.content.slice('.ai'.length).trim();
      }
    }

    if (!pertanyaan) {
      const errorEmbed = modEmbed({
        title: '❌ Pertanyaan Dibutuhkan',
        color: 0xFF4C4C,
        description:
          '**Cara penggunaan:**\n' +
          '• `jls!ai Apa itu anime isekai?`\n' +
          '• `.ai Rekomendasi anime romance`\n' +
          '• `/ai pertanyaan:Anime terbaik 2025`',
      });

      return isSlash
        ? ctx.reply({ embeds: [errorEmbed], ephemeral: true })
        : ctx.channel.send({ embeds: [errorEmbed] });
    }

    const loadingEmbed = modEmbed({
      title: '🧠 Sedang Berpikir...',
      color: 0x2941F2,
      description: 'AI sedang memproses pertanyaanmu, mohon tunggu sebentar ya~',
    });

    let replyMsg;
    if (isSlash) {
      await ctx.deferReply();
      replyMsg = await ctx.editReply({ embeds: [loadingEmbed] });
    } else {
      replyMsg = await ctx.channel.send({ embeds: [loadingEmbed] });
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-5.4',
          messages: [
            {
              role: 'system',
              content:
                'Kamu adalah bot gaming & anime dari JLS Gaming. Jawab santai, ramah, gunakan emoji secukupnya, dan bahasa Indonesia.'
            },
            {
              role: 'user',
              content: pertanyaan
            }
          ],
          temperature: 0.7,
          max_completion_tokens: 1000
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const jawaban =
        response.data?.choices?.[0]?.message?.content?.trim() ||
        'Maaf, AI tidak memberikan jawaban. Coba lagi ya 🙏';

      const resultEmbed = modEmbed({
        title: '💬 Jawaban AI',
        color: 0x2941F2,
        description: `**Pertanyaan:** ${pertanyaan}\n\n**Jawaban:**\n${jawaban}`,
        timestamp: true
      });

      if (isSlash) {
        await ctx.editReply({ embeds: [resultEmbed] });
      } else {
        await replyMsg.edit({ embeds: [resultEmbed] });

        try {
          await ctx.delete();
        } catch {}
      }
    } catch (error) {
      console.error('Error OpenAI:', error.response?.data || error.message);

      const errorEmbed = modEmbed({
        title: '❌ Gagal Menghubungi AI',
        color: 0xFF4C4C,
        description:
          'Maaf, ada kendala saat menghubungi AI. Coba lagi nanti ya!',
      });

      if (isSlash) {
        await ctx.editReply({ embeds: [errorEmbed] });
      } else {
        await replyMsg.edit({ embeds: [errorEmbed] });
      }
    }
  },

  staffOnly: false,
  category: 'fun',
  cooldown: 10,
  usage_prefix: 'jls!ai / .ai <pertanyaan>',
  usage_slash: '/ai pertanyaan:<teks>'
};