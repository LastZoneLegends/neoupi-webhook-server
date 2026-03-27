const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

/*
IMPORTANT:
Later we will paste Firebase service account JSON here
*/

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
}

let db = null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
}

/*
Health check route
*/

app.get("/", (req, res) => {
  res.send("NeoUPI webhook server running");
});

/*
Webhook route
*/

app.post("/webhook", async (req, res) => {
  try {
    console.log("Webhook received:", req.body);

    const { userId, amount, status } = req.body;

    if (status === "success") {
      await db.collection("users").doc(userId).update({
        walletBalance: admin.firestore.FieldValue.increment(amount),
        depositedBalance: admin.firestore.FieldValue.increment(amount),
      });

      await db.collection("transactions").add({
        userId,
        amount,
        type: "deposit",
        status: "success",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.send("Webhook processed successfully");
  } catch (err) {
    console.log(err);
    res.status(500).send("Webhook failed");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
