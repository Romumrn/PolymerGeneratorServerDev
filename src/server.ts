import express from 'express';
import * as jobmanagerClient from 'ms-jobmanager';
import { jobOptProxyClient } from 'ms-jobmanager';
import bodyParser from 'body-parser';
import * as path from 'path';
import SocketIo from 'socket.io';
import glob from 'glob';
import ItpFile, { TopFile } from 'itp-parser';

// add router in express app
const PORT = process.env.PORT || 3001;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//Build a dictionnary with all molecule avaible and a dictionnary with linking rules

app.get("/api/data", (req, res) => {
    let avaibleData: any = {}
    let testdico: any = {}
    const pathPolyplyData =
        glob("/data3/rmarin/polyply_1.0-master/polyply/data/*/*.+(itp|ff)", async function (er, files) {
            for (let file of files) {
                let forcefield = file.split('/')[6]

                const itp = await ItpFile.read(file);
                for (let e of itp.getField('moleculetype')) {
                    if (!e.startsWith(';')) {
                        const mol = e.split(' ')[0]
                        if (Object.keys(avaibleData).includes(forcefield)) {
                            avaibleData[forcefield].push(mol)
                        }
                        else {
                            avaibleData[forcefield] = [mol]
                        }
                        if (Object.keys(testdico).includes(forcefield)) {
                            testdico[forcefield].push(mol)
                        }
                        else {
                            testdico[forcefield] = [mol]
                        }
                    }

                }

            }
            // console.log(avaibleData)
            // console.log("data")
            res.send(avaibleData);
        })


});

app.get("/api/fastaconversion", (req, res) => {
    const fasta = {
        'CYS': 'C', 'ASP': 'D', 'SER': 'S', 'GLN': 'Q', 'LYS': 'K',
        'ILE': 'I', 'PRO': 'P', 'THR': 'T', 'PHE': 'F', 'ASN': 'N',
        'GLY': 'G', 'HIS': 'H', 'LEU': 'L', 'ARG': 'R', 'TRP': 'W',
        'ALA': 'A', 'VAL': 'V', 'GLU': 'E', 'TYR': 'Y', 'MET': 'M'
    }
    res.send(fasta);
})


app.get("/api/rulestest", (req, res) => {
    let testdico: any = {}
    const pathPolyplyData =
        glob("/data3/rmarin/polyply_1.0-master/polyply/data/*/*.+(itp|ff)", async function (er, files) {
            for (let file of files) {
                let forcefield = file.split('/')[6]
                //Decouper document en plusieure parties avec moleculetype 

                const itps = await ItpFile.readMany(file);
                //Plusiuer molecule type dans le fichier !!
                for (const itp of itps) {
                    for (let e of itp.getField('moleculetype')) {
                        if (!e.startsWith(';')) {
                            const mol = e.split(' ')[0]
                            let atoms = []

                            for (let atomline of itp.getField('atoms')) {
                                if (!atomline.startsWith(';')) {
                                    //;id  type resnr residu atom cgnr   charge
                                    let atomsplit = atomline.split(' ').filter(x => x !== " ").filter(x => x !== "")
                                    atoms.push(atomsplit[4])
                                }

                            }

                            if (Object.keys(testdico).includes(forcefield)) {
                                testdico[forcefield][mol] = atoms
                            }
                            else {
                                testdico[forcefield] = {}
                                testdico[forcefield][mol] = atoms
                            }
                        }

                    }
                    for (let e of itp.getField('link')) {
                        console.log(e)
                    }
                    for (let e of itp.getField('bonds')) {
                        console.log(e)
                    }
                }
            }
            res.send(testdico);
        })


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
                //console.log(omydata)

                //Get forcfefield 
                const ff = omydata['forcefield']
                const jsonInStr = JSON.stringify(omydata)

                // On envoi le contenu de la string directement dans l'input 
                // Input transforme tout en stream 
                const jobOptpolyply: jobOptProxyClient = {
                    "exportVar": {
                        "polyplyenv": "/data3/rmarin/poly-env/bin/activate",
                        "ff": ff
                    },
                    "script": "bin/test_polyply.sh",
                    "inputs": {
                        "json": jsonInStr,
                        "martiniForceField": "/data3/rmarin/martini_v3.0.0.itp",
                    }
                }

                const jobPolyply = jobmanagerClient.push(jobOptpolyply);

                jobPolyply.on("completed", (stdout: any, stderr: any) => {
                    console.log("job is completed")
                    const chunks: any[] = [];
                    stdout.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
                    //stdout.on('error', (err) => reject(err));
                    stdout.on('end', () => {
                        //Cut str in a list, first itp and second gromacs file
                        const res = Buffer.concat(chunks).toString('utf8').split("STOP\n")
                        socket.emit("res", res)
                    });
                })
            })
        })



    })
    .catch(() => console.log("fail"))

