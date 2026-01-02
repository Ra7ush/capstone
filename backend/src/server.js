import express from "express";
import path from "path";
import { ENV } from "./config/env.js";

const __dirname = path.resolve(); // this will resolve the path of the current directory which is the root directory

const app = express();

app.get("/api/commes", (req, res) => {
  res.status(200).json({
    message: "Hello World!",
  });
});

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../admin/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../admin", "dist", "index.html"));
  });
}

app.listen(ENV.PORT, () => {
  console.log(`http://localhost:${ENV.PORT}`);
});
