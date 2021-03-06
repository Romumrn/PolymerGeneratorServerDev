import express from 'express';
//import * as jobmanagerClient from 'ms-jobmanager';
import { PromiseManager } from '/data3/rmarin/projet_polyply/msjob-aspromise';
import { jobOptProxyClient } from 'ms-jobmanager';
import bodyParser from 'body-parser';
import SocketIo from 'socket.io';
import glob from 'glob';
import ItpFile, { TopFile } from 'itp-parser';


interface ErrorToClient {
    disjoint: boolean,
    errorlinks: any[]
}

// add router in express app
const PORT = process.env.PORT || 3001;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PATH = "/data3/rmarin/projet_polyply"
const PATHDATA = "/data3/rmarin/projet_polyply/PolymerGeneratorServerDev/data/"
//Build a dictionnary with all molecule avaible and a dictionnary with linking rules

const jobmanagerClient = new PromiseManager("localhost", 6001)

app.get("/api/data", (req, res) => {
    let avaibleData: any = {}
    let testdico: any = {}
    const pathPolyplyData =
        glob(PATH + "/polyply_1.0-master/polyply/data/*/*.+(itp|ff)", async function (er, files) {
            for (let file of files) {
                let forcefield = file.split('/')[7]

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
            console.log("Sending forcefields and residues data")
            res.send(avaibleData);
        })


});

app.get("/api/databetter", async (req, res) => {
    console.log("databetter")
    let avaibleData: any = {}
    //glob.sync(PATHDATA + ff + "/*.itp").join('')
    let listfile = glob.sync(PATH + "/polyply_1.0-master/polyply/data/*/*.+(itp|ff)").map(f => { return f })

    for (let file of listfile) {
        let forcefield = file.split('/')[7]

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

            }
        }
    }

    for (let ff of Object.keys(avaibleData)) {
        let list2 = glob.sync(PATHDATA + ff + "/*.itp").map(f => { return f })
        for (let file of list2) {
            let forcefield = file.split('/')[6]

            const itp = await ItpFile.read(file);
            for (let e of itp.getField('moleculetype')) {
                e = e.split('\t')[0]
                if (!e.startsWith(';')) {
                    const mol = e.split(' ')[0]
                    if (Object.keys(avaibleData).includes(forcefield)) {
                        avaibleData[forcefield].push(mol)
                    }
                    else {
                        avaibleData[forcefield] = [mol]
                    }
                }
            }
        }
    }

    //remove duplkiicate 
    for (let forcefield of Object.keys(avaibleData)) {
        avaibleData[forcefield] = [...new Set(avaibleData[forcefield])];
    }

    res.send(avaibleData);
    console.log("Sending forcefields and residues data")
})


app.get("/api/customdata/:forcefield", (req, res) => {
    let avaibleData: any = {}
    let testdico: any = {}
    console.log(req.params)
    let ff = req.params.forcefield
    const pathPolyplyData =
        glob(PATHDATA + ff + "/*.itp", async function (er, files) {
            for (let file of files) {
                let forcefield = file.split('/')[7]
                const itp = await ItpFile.read(file);
                for (let e of itp.getField('moleculetype')) {
                    e = e.split('\t')[0]
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


const server = require('http').createServer(app)
const io = SocketIo(server, { path: '/socket' });

server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});



function checkResult(result: string): boolean {
    let restemp = result.split("STOP\n")
    //process error str
    let processerror = restemp[1].split('\n').filter((line: string) => line.startsWith('WARNING - general ')).filter((line: string) => !line.startsWith('WARNING - general - Node '))
    console.log(processerror)
    if (processerror.length === 0) {
        return false
    }
    else {
        return true
    }
}

function parseError(result: string) {
    let processerror = result.split('STOP')[1].split('\n').filter((line: string) => line.startsWith('WARNING - general ')).filter((line: string) => !line.startsWith('WARNING - general - Node '))

    //init le dico d'erreur potentiel
    let dicErreur: ErrorToClient = { disjoint: false, errorlinks: [] }
    if (processerror.filter((line: string) => line.startsWith('WARNING - general - Your molecule consists of disjoint parts.Perhaps links were not applied correctly.'))) {
        dicErreur.disjoint = true
    }
    let wronglinkmerror = processerror.filter((line: string) => line.startsWith("WARNING - general - Missing link between"))
    for (let i of wronglinkmerror) {
        let splitline = i.split(' ')
        let resname1 = splitline[9]
        let idname1 = parseInt(splitline[8]) - 1
        let resname2 = splitline[13]
        let idname2 = parseInt(splitline[12]) - 1
        dicErreur.errorlinks.push([resname1, idname1, resname2, idname2])
    }
    return dicErreur
}

(async () => {
    try {
        await jobmanagerClient.start();
    }
    catch (error) {
        console.log(error)
    }
    console.log("connected")

    io.on('connection', socket => {
        socket.on("runpolyply", async (dataFromClient: any) => {
            //const data = { polymer: jsonpolymer, density: density, name: name }

            console.log("Run polyply gen itp")

            //Get forcefield 
            const ff = dataFromClient['polymer']['forcefield']
            //-f martini_v3.0.0_phospholipids_v1.itp
            const additionalfile = PATHDATA + ff + "/martini_v3.0.0_phospholipids_v1.itp"
            const jsonInStr = JSON.stringify(dataFromClient.polymer)
            const name = dataFromClient['name']
            const density = dataFromClient['density']
            const jobOpt1: jobOptProxyClient = {
                "exportVar": {
                    "polyplyenv": PATH + "/polyply_1.0/venv/bin/activate",
                    "ff": ff,
                    "density": density,
                    "name": name,
                    "file": additionalfile
                },
                "script": "bin/generate_itp.sh",
                "inputs": {
                    "json": jsonInStr,
                    "martiniForceField": PATH + "/martini_v3.0.0.itp",
                }
            }

            const result = await jobmanagerClient.push(jobOpt1);

            console.log(checkResult(result))
            if (checkResult(result)) {
                console.log("Oups pas de fichier gro")
                socket.emit("oups", parseError(result))
            }
            else {

                //Then on fait la requete pour le gro
                console.log("yes on passe au gro")
                const itp = result.split('STOP')[0]
                socket.emit("itp", itp)

                //Liste les fichier itp du champs de force 
                //Tres belle ligne (1h de travail)
                let bordelitp = glob.sync(PATHDATA + ff + "/*.itp").map(f => { return "#include " + f + "\r" }).join('')

                //super stupid variable pour avoir un retour a la ligne
                const stupidline = '\r'
                const topfilestr =
                    // bordelitp +
                    `#include "${PATH + "/martini_v3.0.0.itp"}"${stupidline}
                    #include "polymere.itp"${stupidline}
                    [ system ]${stupidline}
                    ; name${stupidline}
                    mylovelypolymer${stupidline}
                    [ molecules ]${stupidline}
                    ; name  number${stupidline}
                    ${name} 1 ${stupidline}`

                const jobOpt2: jobOptProxyClient = {
                    "exportVar": {
                        "polyplyenv": PATH + "/polyply_1.0/venv/bin/activate",
                        "density": density,
                        "name": name,
                        "top": topfilestr,
                    },
                    "script": "bin/generate_coords.sh",
                    "inputs": {
                        "itp": itp,
                        "martiniForceField": PATH + "/martini_v3.0.0.itp",
                    }
                }
                const groJob = await jobmanagerClient.push(jobOpt2);
                socket.emit("gro", groJob)

            }
        })
    }
    )
})()
