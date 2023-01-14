import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";

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
    const participante = req.body;

    const userSchema = joi.object({
        name: joi.string().required()
    });

    const validation = userSchema.validate(participante);

    if(validation.error){
        let errors = validation.error.details.map((detail) => detail.message);
        console.log(errors);
        return res.sendStatus(422);
    }

    const { name } = req.body;

    try {

        const usuarioExiste = await db.collection("participants").findOne({name});

        if(usuarioExiste) return res.status(409).send("Usuário já está cadastrado");
    
        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({
            from: name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format('HH:mm:ss')
        });
    
        res.sendStatus(201);   

    } catch (error) {
        
        console.log(error); 
        res.status(500).send("Deu algo errado no servidor");
    }

    
});


server.get("/participants", async (req, res) => {

    try {

        const dados = await db.collection("participants").find().toArray()

        return res.send(dados);

    } catch (error) {
        res.status(500).send("Erro no servidor");
    }
})

server.post("/messages", async (req,res) => {
    const { user } = req.headers; 
    console.log(req.headers);
    const mensagem = req.body;

    
     const userSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message','private_message').required()
     });   

     const validation = userSchema.validate(mensagem, { abortEarly: false});


    if(validation.error){
        let errors = validation.error.details.map((detail) => detail.message);
        console.log(errors);
        return res.sendStatus(422);
    }


    const { to, text, type } = req.body;


    try {

        const usuarioExiste = await db.collection("participants").findOne({name: user});

        if(!usuarioExiste) return res.status(422).send("Usuário não encontrado");

        await db.collection("messages").insertOne({
            from: user,
            to,
            text,
            type,
            time: dayjs().format('HH:mm:ss')
        })

        return res.sendStatus(201);

    } catch (error) {

        console.log(error);
        res.sendStatus(422);
    }

});

server.get("/messages", async (req,res) => {
    const limit = parseInt(req.query.limit);
    const { user } = req.headers;

    console.log(limit);

    try {
        const mensagens = await db.collection("messages").find().toArray();

        const mensagensFiltradas = mensagens.filter(mensagem => {

            const { from, to, type } = mensagem;
            const mensagemDoUsuario = from === user;
            const mensagemParaUsuario = to === user;
            const mensagemPublica = type === "message"|| to === "Todos";

            if(mensagemDoUsuario || mensagemParaUsuario || mensagemPublica){
                return true;
            } else {
                return false;
            }
        });

        if(!limit || limit > mensagensFiltradas.length){

            return res.send(mensagensFiltradas);

        } else {
        
            let start = mensagensFiltradas.length - limit;
            res.send([...mensagensFiltradas].splice(start,limit));
        }
        

    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta: ${PORT}.`);
});