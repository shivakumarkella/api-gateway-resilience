import express from "express";

const app = express();

app.get("/slow", async (req, res) => {
  const delay = Number(req.query.delay || 3000);

  await new Promise((r) => setTimeout(r, delay));

  res.json({ status: "slow response", delay });
});

app.listen(4000, () => {
  console.log("Slow service running on port 4000");
});
