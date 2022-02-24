const express = require("express");
const jobManagerClient = require('ms-jobmanager');
const bodyParser = require("body-parser");

// add router in express app


const PORT = process.env.PORT || 3001;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/data", (req, res) => {
    res.sendFile(path = __dirname + "/data/DataForm.json");
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

app.post("/sendjson", (req, res) => {
    console.log(req.body);
});

jobManagerClient.start({ port: 6001, TCPip: "127.0.0.1" })
    .then(() => {
        console.log("connected")
        const jobOpt = {
            "exportVar": {
                "json": { 'key1': 'val1', 'key2': [0, 1] }
            },
            "script": "test_script.sh"
        }

        const job = jobManagerClient.push(jobOpt);

        job.on("Completed", (stdout, stderr) => {
            console.log("job is completed")
        })
    })
    .catch(() => console.log("fail"))

