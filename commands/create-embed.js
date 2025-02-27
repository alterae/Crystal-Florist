const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageCollector } = require("discord.js");
const helpers = require("../helpers");

module.exports = {
    modOnly: true,

    channel: null,
    validOptions: {
        "channel": "channel",
        "title": "string",
        "description": "string",
        "color": "int",
        "user": "user",
        "footer text": "string",
        "footer image": "url",
        "timestamp": "boolean"
    },

    data: new SlashCommandBuilder()
        .setName("create-embed")
        .setDescription("Create an embed using messages!"),

    async execute(interaction) {
        this.channel = null;

        // Create the preview embed
        let outputEmbed = helpers.createEmbed({
            title: "Preview embed",
            description: "This is what your embed will look like!",
            color: "#ffffff",
            timestamp: false
        });

        // Create the message embed
        let replyEmbed = helpers.createEmbed({
            title: `Creating embed...`,
            description: "What would you like to change?\n\n*Say \"cancel\" to cancel creation*",
            author: interaction.user
        });

        replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
        
        await interaction.reply({ embeds: [outputEmbed, replyEmbed] });
        const replyMessage = await interaction.fetchReply();

        await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
    },

    async getInput(waitTime, interaction, outputEmbed, replyEmbed, replyMessage, specific=null) {
        // Define a filter for message collection
        const filter = (message) => message.author.id == interaction.user.id;

        // Wait for 1 message with a specific timeout
        await interaction.channel.awaitMessages({
            filter,
            max: 1
        }).then(async (messages) => {
            // Get the collected message
            let message = messages.first();
            let outputString = "";
            message.delete();
            replyEmbed.fields = [];

            if (this.channel !== null) {
                replyEmbed.setTitle(`Creating embed for channel ${this.channel.name}`);
            }

            // If they try to finish the embed
            if (message.content.toLowerCase() === "done") {
                // If theyve given a channel
                if (this.channel) {
                    // Edit the message
                    replyEmbed.setTitle("Success!");
                    replyEmbed.setDescription("Embed sent!");
                    replyMessage.edit({ embeds: [replyEmbed] });

                    // Send the embed
                    return this.channel.send({ embeds: [outputEmbed] });
                }
                
                // Otherwise, they havent given a channel
                // Tell them they have to
                replyEmbed.setDescription("You must specify the channel you want me to send the embed in!\n\n*Say \"cancel\" to cancel creation*");
                replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                // Get input
                return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
            }

            // If they cancel after being asked for something specific
            if (specific && message.content.toLowerCase() === "cancel") {
                // Return to default state
                replyEmbed.setDescription("What would you like to change?\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                // Get input
                return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
            }

            // If they cancel without being asked something specific
            if (message.content.toLowerCase() === "cancel") {
                // Edit the embed, stop listening
                replyEmbed.setTitle("Alright!");
                replyEmbed.setDescription("Embed creation cancelled!");
                return replyMessage.edit({ embeds: [replyEmbed] });
            }

            // If they were prompted for a channel
            if (specific === "channel") {
                // If their message isnt a channel tag
                if (!/<#(\d+)>/.test(message.content)) {
                    // Edit embeds to say so
                    replyEmbed.setDescription("Please enter a valid channel!\n\n*Say \"cancel\" to go back*");
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage, "channel");
                }

                return interaction.guild.channels.fetch(message.content.substring(2, message.content.length - 1)).then(async (channel) => {
                    this.channel = channel;
                    replyEmbed.setTitle(`Creating embed for channel ${this.channel.name}`);
    
                    // Edit embeds to say so
                    replyEmbed.setDescription("Channel set successfully!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                    replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
    
                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
                });
            }

            // If they were prompted for a title
            if (specific === "title") {
                outputEmbed.setTitle(message.content);
                replyEmbed.setDescription("Title changed!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
            }

            if (specific === "description") {
                outputEmbed.setDescription(message.content);
                replyEmbed.setDescription("Description changed!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
            }

            if (specific === "color") {
                let color = message.content.split(" ")[0];

                if (color.startsWith("#")) {
                    color = color.substring(1);
                }

                if (!color.startsWith("0x")) {
                    color = `0x${color}`;
                }

                if (isNaN(Number(color))) {
                    replyEmbed.setDescription("Please enter a valid color!\n\n*Say \"cancel\" to go back*");
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage, "color");
                }

                outputEmbed.setColor(Number(color));
                replyEmbed.setDescription(`Color changed to ${color}!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*`);
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
            }

            if (specific === "user") {
                if (message.content.toLowerCase() === "none") {
                    outputEmbed.author = null;
                    replyEmbed.setDescription("User successfully removed!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                    replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
    
                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
                }

                // If their message isnt a user ping
                if (!/<@!(\d+)>/.test(message.content)) {
                    // Edit embeds to say so
                    replyEmbed.setDescription("Please enter a valid user!\n\n*Say \"cancel\" to go back*");
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage, "user");
                }

                let member = interaction.guild.members.cache.get(message.content.substring(3, message.content.length - 1));
                outputEmbed.setAuthor(member.user.username, member.user.avatarURL());

                replyEmbed.setDescription("User set successfully!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
            }

            if (specific === "footer text") {
                if (message.content.toLowerCase() === "none") {
                    outputEmbed.setFooter(null);
                    replyEmbed.setDescription("Footer successfully removed!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                    replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
    
                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
                }

                outputEmbed.setFooter(message.content, outputEmbed.footer ? outputEmbed.footer.iconURL : null);
                replyEmbed.setDescription("Footer text set successfully!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
            }

            if (specific === "footer image") {
                if (outputEmbed.footer === null) {
                    replyEmbed.setDescription("You must set footer text before you can set a footer image!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                    replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
                }

                if (message.content.toLowerCase() === "none") {
                    outputEmbed.setFooter(outputEmbed.footer.text, null);
                    replyEmbed.setDescription("Footer image successfully removed!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                    replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
    
                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
                }

                try {
                    let messageToURL = new URL(message.content);
                } catch (error) {
                    replyEmbed.setDescription("Please enter a valid image URL!\n\n*Say \"cancel\" to go back*");
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                    // Get input
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage, "footer image");
                }

                outputEmbed.setFooter(outputEmbed.footer.text, message.content);
                replyEmbed.setDescription("Footer image set successfully!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
            }

            if (specific !== null) {
                replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
                return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
            }

            // If the message content isnt a valid option
            if (!Object.keys(this.validOptions).includes(message.content.toLowerCase())) {
                // Edit embeds to say so
                replyEmbed.setDescription("Please enter a valid field to edit!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*");
                replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });

                // Get input
                return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
            }

            let waitTime_ = 60*5;

            switch (message.content.toLowerCase()) {
                case "channel": outputString = "Send the channel you would like to send this embed in!"; break;
                case "title": outputString = "Send the title you want the embed to have!"; break;
                case "description": outputString = "Send the description you want the embed to have!"; waitTime_ = 60*10; break;
                case "color": outputString = "Send the color you would like the embed to have, formatted as a hex code!"; break;
                case "user": outputString = "Ping the user you would like the embed to have as its author, or say \"none\" to remove the author!"; break;
                case "footer text": outputString = "Send the text you would like the footer to have, or say \"none\" to remove the footer!"; break;
                case "footer image": outputString = "Send a link to the image you would like the footer to have, or say \"none\" to remove the image!"; break;
                case "timestamp":
                    let timestampEnabled;
                    if (outputEmbed.timestamp !== null) {
                        outputEmbed.setTimestamp(null);
                        timestampEnabled = false;
                    }
                    else {
                        outputEmbed.setTimestamp();
                        timestampEnabled = true;
                    }

                    replyEmbed.setDescription(`Timestamp toggled ${timestampEnabled ? "on" : "off"}!\n\n*Say \"cancel\" to cancel creation, or \"done\" to finish*`);
                    replyEmbed.addField("Valid Fields", Object.keys(this.validOptions).join("\n"));
                    replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
                    return await this.getInput(60*5, interaction, outputEmbed, replyEmbed, replyMessage);
                default: outputString = "what"; break;
            }
            
            replyEmbed.setDescription(`${outputString}\n\n*Say \"cancel\" to go back*`);
            replyMessage.edit({ embeds: [outputEmbed, replyEmbed] });
            
            // Get input
            return await this.getInput(waitTime_, interaction, outputEmbed, replyEmbed, replyMessage, message.content.toLowerCase());
        }).catch((error) => {
            console.error(error);
            return interaction.followUp("Five minutes have passed with no response!\n(That, or I somehow got an error!)\nEmbed creation cancelled.");
        });
    }
}