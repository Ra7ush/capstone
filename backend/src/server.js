import express from "express";

const app = express();

app.get("/api/commes", (req, res) => {
  res.status(200).json({
    message: "Hello World!",
  });
});

app.listen(3000, () => {
  console.log(`http://localhost:3000`);
});
