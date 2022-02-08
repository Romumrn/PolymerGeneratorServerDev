const express = require("express");

const PORT = process.env.PORT || 3001;

const app = express();


app.get("/data", (req, res) => {
    res.sendFile(path = __dirname + "/data/DataForm.json");
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
