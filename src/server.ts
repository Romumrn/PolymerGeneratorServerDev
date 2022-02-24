import express from 'express';
import * as jobmanagerClient from 'ms-jobmanager';
import { jobOptProxyClient } from 'ms-jobmanager';
import bodyParser from 'body-parser';
import * as path from 'path';
import SocketIo from 'socket.io';

// add router in express app
const PORT = process.env.PORT || 3001;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.get("/api/data", (req, res) => {
    console.log("data")
    res.sendFile(path.resolve(__dirname + "/../data/DataForm.json"));
});

const server = require('http').createServer(app)
const io = SocketIo(server, { path: '/socket' });

server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});



jobmanagerClient.start({ port: 6001, TCPip: "127.0.0.1" })
    .then(() => {
        console.log("connected")
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

        io.on('connection', socket => {
            socket.on("testpolyply", (omydata: any) => {
                console.log(omydata)

                //Get forcfefield 
                const ff = omydata['forcefield']
                const jsonInStr = JSON.stringify(omydata)
                console.log("json in string send to serveur", jsonInStr)
                // On envoi le contenu de la string directement dans l'input 
                // Input transforme tout en stream 
                const jobOptpolyply: jobOptProxyClient = {
                    "exportVar": {
                        "ff": ff
                    },
                    "script": "bin/test_polyply.sh",
                    "inputs": {
                        "polyplyenv": "/data3/rmarin/polyply-env/bin/activate",
                        "json": jsonInStr,
                    }
                }

                const jobPolyply = jobmanagerClient.push(jobOptpolyply);

                jobPolyply.on("completed", (stdout: any, stderr: any) => {
                    console.log("job is completed")
                    const chunks: any[] = [];
                    stdout.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
                    //stdout.on('error', (err) => reject(err));
                    stdout.on('end', () => socket.emit( "itpDone", Buffer.concat(chunks).toString('utf8')));

                })
            })
        })



    })
    .catch(() => console.log("fail"))

