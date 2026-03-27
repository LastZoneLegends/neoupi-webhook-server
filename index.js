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

app.post("/create-order", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const orderId = "ORD_" + Date.now();

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
          order_id: orderId,
          customer_mobile: "9999999999",
          redirect_url: "https://lastzone.netlify.app/wallet",
          webhook_url:
            "https://neoupi-webhook-server.onrender.com/neoupi-webhook"
        })
      }
    );

    const data = await response.json();

    console.log("NeoUPI response:", data);

    if (!data.payment_url) {
      return res.status(400).json({
        error: "Payment URL not received",
        response: data
      });
    }

    res.json({
      payment_url: data.payment_url
    });
  } catch (err) {
    console.log("Create order error:", err);
    res.status(500).json({
      error: "Order creation failed"
    });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
