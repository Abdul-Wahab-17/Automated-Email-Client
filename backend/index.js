



const connect_to_db = require("./db/db");
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

connect_to_db();

const app = express();
app.use(cors());

const port = 5000;

// Flexible schema for your existing collection
const schema = new mongoose.Schema({}, { strict: false });
const Data = mongoose.model("furqan_hci_collection", schema, "furqan_hci_collection");
// Model name, Schema, Collection name


// New schema for storing customer history
const historySchema = new mongoose.Schema(
  {
    email: { type: String, index: true },
    conversations: { type: Array, default: [] }
  },
  { strict: false }
);

const CustomerHistory = mongoose.model(
  "customer_history",
  historySchema,
  "customer_history"
);




// Get all data
app.get("/api/data", async (req, res) => {
  try {
    const allData = await Data.find();
    res.json({
      message: "Data fetched successfully",
      data: allData
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
// 🚀 Get all emails that have already been displayed (onscreen)
app.get("/messages/onscreen", async (req, res) => {
  try {
    const emailsOnScreen = await Data.find({ status: "onscreen" })
      .sort({ createdAT: 1 }); // sort by creation time

    const transformed = emailsOnScreen.map(email => ({
      id: email._id,
      sender: email.client_email,
      senderName: email.client_email.split('@')[0] || "Unknown",
      subject: email.email_subject || "No Subject",
      customerEmail: email.orignal_email,
      createdAT: email.createdAT,
      customerEmailSummary: email.summaryOfOrignal_email,
      Reply_of_email: email.llm_reply,
    }));

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🚀 Get all new pending emails (for polling) and mark them as "onscreen"
app.get("/messages/pending", async (req, res) => {
  try {
    // Find all pending emails
    const pendingEmails = await Data.find({ status: "pending" }).sort({ createdAT: 1 });

    // Update their status to "onscreen" so they won't be fetched again
    const ids = pendingEmails.map(email => email._id);
    if (ids.length > 0) {
      await Data.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "onscreen" } }
      );
    }

    const transformed = pendingEmails.map(email => ({
      id: email._id,
      sender: email.client_email,
      senderName: email.client_email.split('@')[0] || "Unknown",
      subject: email.email_subject || "No Subject",
      customerEmail: email.orignal_email,
      createdAT: email.createdAT,
      customerEmailSummary: email.summaryOfOrignal_email,
      Reply_of_email: email.llm_reply,
    }));

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// now sending reply to email 
app.use(express.json()); // Add this to parse JSON body

app.post("/send-email/:id", async (req, res) => {
  const messageId = req.params.id;
  const { llm_reply } = req.body; // Get the edited reply from frontend
  console.log("llm reply front front end is : ", llm_reply);

  try {
    // Find the email by MongoDB _id
    let msg = await Data.findOne({ _id: messageId });
    if (!msg) return res.status(404).json({ error: "Message not found" });

    // Convert Mongoose document to plain JavaScript object
    msg = msg.toObject();

    // Update the llm_reply in the database with the edited version
    if (llm_reply) {
      await Data.updateOne(
        { _id: messageId },
        { $set: { llm_reply: llm_reply } }
      );
      // Update msg object to send the new reply to webhook
      msg.llm_reply = llm_reply;
    }

    // Send the message to your n8n webhook
    console.log("message is ", msg);
    console.log("Updated llm_reply:", msg.llm_reply);
    console.log("Sending message to n8n webhook:......................................");
    const webhookUrl = "http://localhost:5678/webhook/send-email";
    console.log("Sending message to send ...........................................:");
    const fetchResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });

    const result = await fetchResponse.json();

    // Update status in DB to "sent"
    await Data.updateOne({ _id: messageId }, { $set: { status: "sent" } });

    res.json({ success: true, n8nResult: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});








// // ⏰ CRON JOB: Every 15 minutes delete all documents with status = "sent"
// const cron = require("node-cron");

// cron.schedule("*/15 * * * *", async () => {
//   try {
//     console.log("Running cleanup cron job...");

//     const result = await Data.deleteMany({ status: "sent" });

//     console.log(`Deleted ${result.deletedCount} sent messages`);
//   } catch (error) {
//     console.error("Cron job error:", error);
//   }
// });

const cron = require("node-cron");

cron.schedule("*/1 * * * *", async () => {
  try {
    console.log("Running cleanup cron job...");

    const sentMessages = await Data.find({ status: "sent" });

    for (const msg of sentMessages) {
      const email = msg.client_email;

      await CustomerHistory.updateOne(
        { email: email },
        { $push: { conversations: msg } },
        { upsert: true }
      );
    }

    const result = await Data.deleteMany({ status: "sent" });

    console.log(`Archived and deleted ${result.deletedCount} sent messages`);
  } catch (error) {
    console.error("Cron job error:", error);
  }
});






app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
