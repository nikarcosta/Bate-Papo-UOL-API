import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db(); 
} catch (error) {
    console.log("Deu erro no servidor");
}


const server = express();

server.use(express.json());
server.use(cors());



server.post("/participants", async (req, res) => {
    const { name } = req.body;

    try {

        const usuarioExiste = await db.collection("participants").findOne({name});

        if(usuarioExiste) return res.status(409).send("Usuário já está cadastrado");
    
        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')});
    
        res.sendStatus(201);   

    } catch (error) {
        
        console.log(error); 
        res.status(500).send("Deu algo errado no servidor");
    }

    
});


server.get("/participants", async (res, req) => {

    try {
        const dados = await db.collection("participants").find().toArray()

        return res.send(dados)
    } catch (error) {
        res.status(500).send("Erro no servidor");
    }
})


const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta: ${PORT}.`);
});