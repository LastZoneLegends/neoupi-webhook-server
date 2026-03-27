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

app.post("/neoupi-webhook", async (req, res) => {
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

app.post("/create-order", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const response = await fetch(
      "https://neoupi.com/apis/v1/pay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEOUPI_SECRET_KEY}`
        },
        body: JSON.stringify({
          amount: amount,
          user_id: userId,
          currency: "INR"
        })
      }
    );

    const data = await response.json();

    console.log("NeoUPI response:", data);

    res.json({
      payment_url: data.payment_url
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Order creation failed"
    });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
