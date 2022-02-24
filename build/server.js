"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const jobmanagerClient = (0, tslib_1.__importStar)(require("ms-jobmanager"));
const body_parser_1 = (0, tslib_1.__importDefault)(require("body-parser"));
const path = (0, tslib_1.__importStar)(require("path"));
// add router in express app
const PORT = process.env.PORT || 3001;
const app = (0, express_1.default)();
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.get("/data", (req, res) => {
    console.log("data");
    res.sendFile(path.resolve(__dirname + "/../data/DataForm.json"));
});
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
jobmanagerClient.start({ port: 6001, TCPip: "127.0.0.1" })
    .then(() => {
    console.log("connected");
    // const jobOpt: jobOptProxyClient = {
    //     "exportVar": {
    //         "json": 1
    //     },
    //     "script": "bin/test_script.sh"
    // }
    // const job = jobmanagerClient.push(jobOpt);
    // job.on("completed", (stdout: any, stderr: any) => {
    //     console.log("job is completed")
    // })
    app.post("/testPolyply", (req, res) => {
        const jobOptpolyply = {
            "exportVar": {
                "json": req.body
            },
            "script": "bin/test_polyply.sh",
            "inputs": {
                "myinputfile1": "data/DataForm.json",
                "polyplyenv": "/data3/rmarin/polyply-env/bin/activate"
            }
        };
        const jobPolyply = jobmanagerClient.push(jobOptpolyply);
        jobPolyply.on("completed", (stdout, stderr) => {
            console.log("job is completed");
            const chunks = [];
            stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            //stdout.on('error', (err) => reject(err));
            stdout.on('end', () => console.log(Buffer.concat(chunks).toString('utf8')));
        });
    });
})
    .catch(() => console.log("fail"));
