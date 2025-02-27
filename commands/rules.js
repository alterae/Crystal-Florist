const { SlashCommandBuilder } = require("@discordjs/builders");
const helpers = require("../helpers");

module.exports = {
    modOnly: true,

    rulesetOptions: {
        name: "default ruleset",
        channel: null,
        rules: [
            "this is a rule!"
        ],
    },

    data: new SlashCommandBuilder()
        .setName("rules")
        .setDescription("Modify rules!"),

    async execute(interaction) {
        let { rulesets } = require("../data/data.json");

        let replyEmbed;
        let specific = null;

        if (Object.keys(rulesets).length === 0) {
            replyEmbed = helpers.createEmbed({
                title: "No rulesets exist!",
                description: "Would you like to create one? (yes/no)",
                author: interaction.user
            });

            specific = "createRuleset";
        }
        else {
            replyEmbed = helpers.createEmbed({
                title: "Select a ruleset",
                description: "Send the name of the ruleset you'd like to edit!\nAlternatively, say \"new ruleset\" to create a new one!",
                author: interaction.user,
                fields: [
                    {
                        name: "Rulesets",
                        value: Object.keys(rulesets).join("\n")
                    }
                ]
            });

            specific = "selectRuleset";
        }
        
        await interaction.reply({ embeds: [replyEmbed] });
        const replyMessage = await interaction.fetchReply();

        return await this.getInput(60, interaction, replyEmbed, replyMessage, specific=specific);
    },

    async getInput(waitTime, interaction, replyEmbed, replyMessage, specific=null) {
        // Define a filter for message collection
        const filter = (message) => message.author.id == interaction.user.id;

        // Wait for 1 message with a specific timeout
        await interaction.channel.awaitMessages({
            filter,
            max: 1,
            time: waitTime * 1000,
            errors: ["time"]
        }).then(async (messages) => {
            // Get the collected message
            let message = messages.first();
            let outputString = "";
            message.delete();

            if (specific === "createRuleset") {
                if (message.content.toLowerCase() === "no") {
                    replyEmbed.setTitle("Alright!");
                    replyEmbed.setDescription("No ruleset created!");
                    return replyMessage.edit({ embeds: [replyEmbed] });
                }
            }
        });
    }
}