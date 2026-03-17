require("dotenv").config();
const mongoose = require("mongoose");
const Chat = require("./models/Chat");

async function viewChatHistory() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const count = await Chat.countDocuments();
    console.log(`Total chat entries: ${count}`);

    const history = await Chat.find().sort({ timestamp: -1 }).limit(5);
    history.forEach((h, i) => {
      console.log(`\n--- History ${i + 1} ---`);
      console.log(`Time: ${h.timestamp.toLocaleString()}`);
      console.log(`User: ${h.question}`);
      console.log(`Bot: ${h.answer.substring(0, 50)}...`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

viewChatHistory();
