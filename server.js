import express from "express";
import cors from "cors"
import websockets from "./websockets/index.js";
import { Buffer } from "buffer"
import "dotenv/config.js"

const app = express();
const port = process.env.PORT || 3502 ;

app.use(express.json())
app.use(cors({ origin : "*" }))

const connections = {}
const webhooks = {};



app.get("/test/sse",(req,res)=>{
    const { connectionId } = req.query;
    if(req.headers["accept"] === "text/event-stream"){
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("content-type","text/event-stream")
            res.setHeader("cache-control","no-cache")
            res.setHeader("connection","keep-alive")
            // polyfill
            if (req.headers['x-requested-with'] == 'XMLHttpRequest') {
    
                console.log("Need Polyfill for that browser");
            }
            connections[connectionId] = res;
            req.on('close', () => {
                if(connections[connectionId]){
                    // console.log(`connectionid : ${connectionId} closed`)
                    delete connections[connectionId];
                }
            });
            res.write("data : Connected\n\n")
    }else{
        return res.json({ error : "Should be an Event stream" , message : "Make 'accept' header text/event-stream "})
    }
})


app.get("/data",(req,res)=>{
    const { data , randomKey } =  req.query;
    const response = connections[randomKey];
    if (response) {
        response.write(`data: ${data}\n\n`);
        res.send("ok");
    } else {
        res.status(404).send("Connection not found");
    }
})


// This is for oAuth flow
app.get("/prod/sse",(req,res)=>{
    const { randomKey } = req.query;
    console.log(`Redirect call with randomKey : ${randomKey} connected`);
    if(req.headers["accept"] === "text/event-stream"){
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("content-type","text/event-stream")
        res.setHeader("cache-control","no-cache")
        res.setHeader("connection","keep-alive")
        // polyfill
        if (req.headers['x-requested-with'] == 'XMLHttpRequest'){

            console.log("Need Polyfill for that browser");
        }
        connections[randomKey] = res;
        req.on('close', () => {
            if(connections[randomKey]){
                console.log(`randonKey : ${randomKey} closed`)
                delete connections[randomKey];
            }
        });
        res.write("data : Connected\n\n");
    }else{
        return res.json({ error : "Should be an Event stream" , message : "Make 'accept' header text/event-stream "})
    }
})

// This will be hit by Third Party App At the time of OAuth Flow.
app.get("/prod/code",(req,res)=>{
    // This Url will be Hit By the Integrations App which contains [code & randomKey] that needs to be sent to Frontend;
    const { code , state } = req.query;
    try {
        const { sessionId , code_verifier } = JSON.parse(Buffer.from(state,"base64").toString())
        const frontendResponse = connections[sessionId];
        console.log(sessionId,code_verifier)
        if(!frontendResponse){
            res.status(401).send("Frontend Have not registered for SSE Events");
            // May be we need some sort of timeout so that we can inform that the authentication flow is hault;
            return;
        }else{
            // console.log(`Hit From Integrations App with code:${code} and randomKey : ${randomKey}`)
            frontendResponse.write(`data: code-${code}\n\n`);
            frontendResponse.write(`data: code_verifier-${code_verifier}\n\n`);
            res.sendStatus(200);
            // console.log("Sent Data to client")
            return;
        }
    } catch (error) {
        res.status(400).json({ message : "State is Not a valid JSON, please check your state parameter passed to OAuth client" });
    }
    
})



// This is for Webhook Purpose.
app.get("/webhook/sse",(req,res)=>{
    const { webhookRandomKey } = req.query;
    console.log(`Webhook with this randomKey : ${webhookRandomKey} started SSE connection`);
    if(req.headers["accept"] === "text/event-stream"){
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("content-type","text/event-stream")
        res.setHeader("cache-control","no-cache")
        res.setHeader("connection","keep-alive")
        // polyfill
        if (req.headers['x-requested-with'] == 'XMLHttpRequest'){

            console.log("Need Polyfill for that browser");
        }
        webhooks[webhookRandomKey] = res;
        req.on('close', () => {
            if(webhooks[webhookRandomKey]){
                console.log(`randomKey : ${webhookRandomKey} closed`)
                delete webhooks[webhookRandomKey];
            }
        });
        res.write("data : Connected\n\n");
    }else{
        return res.json({ error : "Should be an Event stream" , message : "Make 'accept' header text/event-stream "})
    }
})

// This will be Hit by Third Party Apps
app.post("/webhook/acuity/:randomKey", (req,res)=>{
    const { randomKey } = req.params;
    console.log(req.params)
    console.log("From Webhook Hit",randomKey)
    const frontendResponse = webhooks[randomKey];
    if(!frontendResponse){
        // So this webhook needs to be deleted , so respond with status code 400;
        console.log("Frontend Response Not Found")
    }else{
        console.log("data",req.body,req.params,req.query)
        frontendResponse.write(`data:${"Webhook data"}\n\n`);
    }
    res.sendStatus(200);
})


const server = app.listen(port,()=>{
    console.log(`Server started on port ${port}`)
})


websockets(server);