const express = require("express");
const path = require("node:path");

const projectRoot = __dirname;
process.env.MEGAMAN_DATA_DIR ||= path.join(projectRoot, "data", "megaman");

const megamanApi = require("./server/megaman.cjs");
const app = express();

app.use(megamanApi);
app.use(express.static(path.join(projectRoot, "public")));

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

app.listen(port, "0.0.0.0", () => {
  console.log(`MEGAMAN running at http://localhost:${port}`);
});
