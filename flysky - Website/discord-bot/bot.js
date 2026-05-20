require('dotenv').config({ path: '../.env.local' })

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_GUILD_ID
const CLIENT_ID = process.env.DISCORD_CLIENT_ID

if (!TOKEN || !GUILD_ID || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, or DISCORD_CLIENT_ID in .env.local')
  process.exit(1)
}

// ─── Slash Commands ────────────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('pilot')
    .setDescription('Look up a FlySky pilot')
    .addStringOption((o) => o.setName('callsign').setDescription('Pilot callsign (e.g. FSK001)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 5 FlySky pilots by points'),
  new SlashCommandBuilder()
    .setName('live')
    .setDescription('Show currently active flights'),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show overall FlySky airline stats'),
]

// Register commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands.map((c) => c.toJSON()),
  })
  console.log('✅ Slash commands registered')
}

// ─── Bot Client ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
})

client.once('ready', () => {
  console.log(`✅ FlySky Bot online as ${client.user.tag}`)
  client.user.setActivity('FlySky Virtual Airlines System ✈', { type: 3 })
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  try {
    if (interaction.commandName === 'pilot') {
      const callsign = interaction.options.getString('callsign').toUpperCase()
      const pilot = await prisma.pilot.findUnique({
        where: { callsign },
        include: { rank: true },
      })
      if (!pilot) {
        return interaction.reply({ content: `No pilot found with callsign **${callsign}**`, ephemeral: true })
      }
      const embed = new EmbedBuilder()
        .setColor(0x0ea5e9)
        .setTitle(`✈ ${pilot.firstName} ${pilot.lastName}`)
        .setDescription(`Callsign: \`${pilot.callsign}\` · Hub: ${pilot.hub}`)
        .addFields(
          { name: '🏆 Rank', value: pilot.rank?.name ?? 'Unranked', inline: true },
          { name: '🕐 Hours', value: `${pilot.totalHours.toFixed(1)}h`, inline: true },
          { name: '✈ Flights', value: String(pilot.totalFlights), inline: true },
          { name: '⭐ Points', value: pilot.totalPoints.toLocaleString(), inline: true },
          { name: '🛬 Avg Landing', value: pilot.avgLandingRate ? `${Math.round(pilot.avgLandingRate)} fpm` : 'N/A', inline: true },
        )
        .setFooter({ text: 'FlySky Virtual Airlines System' })
        .setTimestamp()
      return interaction.reply({ embeds: [embed] })
    }

    if (interaction.commandName === 'leaderboard') {
      const top = await prisma.pilot.findMany({
        where: { totalFlights: { gt: 0 } },
        orderBy: { totalPoints: 'desc' },
        take: 5,
        include: { rank: true },
      })
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('🏆 FlySky Leaderboard')
        .setDescription(
          top.length === 0
            ? 'No flights yet!'
            : top.map((p, i) => `**${i + 1}.** \`${p.callsign}\` ${p.firstName} ${p.lastName} — **${p.totalPoints.toLocaleString()} pts** · ${p.totalHours.toFixed(1)}h`).join('\n')
        )
        .setFooter({ text: 'FlySky Virtual Airlines System' })
        .setTimestamp()
      return interaction.reply({ embeds: [embed] })
    }

    if (interaction.commandName === 'live') {
      const flights = await prisma.liveFlight.findMany({
        include: { pilot: { select: { callsign: true, firstName: true, lastName: true } } },
      })
      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle(`✈ Live Flights (${flights.length})`)
        .setDescription(
          flights.length === 0
            ? 'No active flights right now.'
            : flights.map((f) => `\`${f.callsign}\` ${f.pilot.firstName} — ${f.depIcao}→${f.arrIcao} · ${f.altitude.toLocaleString()}ft · ${f.groundSpeed}kts`).join('\n')
        )
        .setFooter({ text: 'FlySky Virtual Airlines System' })
        .setTimestamp()
      return interaction.reply({ embeds: [embed] })
    }

    if (interaction.commandName === 'stats') {
      const [pilots, flights, totalHoursAgg, liveCount] = await Promise.all([
        prisma.pilot.count(),
        prisma.pirep.count({ where: { status: 'ACCEPTED' } }),
        prisma.pirep.aggregate({ where: { status: 'ACCEPTED' }, _sum: { flightTime: true } }),
        prisma.liveFlight.count(),
      ])
      const totalHours = ((totalHoursAgg._sum.flightTime ?? 0) / 60).toFixed(1)
      const embed = new EmbedBuilder()
        .setColor(0x0ea5e9)
        .setTitle('📊 FlySky Airline Stats')
        .addFields(
          { name: '👥 Pilots', value: String(pilots), inline: true },
          { name: '✅ Flights', value: String(flights), inline: true },
          { name: '🕐 Total Hours', value: `${totalHours}h`, inline: true },
          { name: '✈ Currently Flying', value: String(liveCount), inline: true },
        )
        .setFooter({ text: 'FlySky Virtual Airlines System' })
        .setTimestamp()
      return interaction.reply({ embeds: [embed] })
    }
  } catch (err) {
    console.error('Interaction error:', err)
    interaction.reply({ content: '❌ An error occurred.', ephemeral: true })
  }
})

// ─── Announce PIREP acceptance (call from API or webhook) ──────────────────
async function announcePirepAccepted(pirepId) {
  try {
    const pirep = await prisma.pirep.findUnique({
      where: { id: pirepId },
      include: { pilot: { include: { rank: true } } },
    })
    if (!pirep) return

    const guild = await client.guilds.fetch(GUILD_ID)
    const channel = guild.channels.cache.find((c) => c.name === 'pirep-log' || c.name === 'flights')
    if (!channel) return

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle('✅ Flight Accepted')
      .addFields(
        { name: 'Pilot', value: `${pirep.pilot.firstName} ${pirep.pilot.lastName} (\`${pirep.pilot.callsign}\`)`, inline: true },
        { name: 'Flight', value: `\`${pirep.flightNumber}\``, inline: true },
        { name: 'Route', value: `${pirep.depIcao} → ${pirep.arrIcao}`, inline: true },
        { name: 'Duration', value: `${Math.floor(pirep.flightTime / 60)}h ${pirep.flightTime % 60}m`, inline: true },
        { name: 'Landing Rate', value: pirep.landingRate ? `${Math.round(pirep.landingRate)} fpm` : 'N/A', inline: true },
        { name: 'Points Earned', value: String(pirep.score), inline: true },
      )
      .setTimestamp()

    await channel.send({ embeds: [embed] })
  } catch (err) {
    console.error('Announce error:', err)
  }
}

// ─── Rank sync ─────────────────────────────────────────────────────────────
async function syncPilotRole(discordUserId, rankCode) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID)
    await guild.members.fetch()
    const member = guild.members.cache.get(discordUserId)
    if (!member) return

    // Remove all rank roles, add new one
    const rankRoles = guild.roles.cache.filter((r) => r.name.startsWith('FSK-'))
    await member.roles.remove(rankRoles)
    const newRole = guild.roles.cache.find((r) => r.name === `FSK-${rankCode}`)
    if (newRole) await member.roles.add(newRole)
  } catch (err) {
    console.error('Role sync error:', err)
  }
}

registerCommands().then(() => client.login(TOKEN))
module.exports = { announcePirepAccepted, syncPilotRole }
