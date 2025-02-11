import { WebSocketServer } from "ws"
import { URL } from "url"

export default (expressServer)=>{
    // create a websocket instance with no server 
    const websocketServer = new WebSocketServer({
        noServer : true ,
        path : "/websocket"
    })

    expressServer.on("upgrade",(request,socket,head)=>{
        // request -> The request from client
        // scoket -> is the socket connection from client(browser)
        // head -> frist dispatch
        websocketServer.handleUpgrade(request, socket, head, (websocket) => {
            websocketServer.emit('connection', websocket, request);
        });
    })


    websocketServer.on("connection",(websocket,request)=>{
        const queryParams = new URL(request.url, `http://${request.headers.host}`).searchParams;
        const ping = queryParams.get('ping');  // Extract query parameter 'ping'
        console.log('Received query param ping:', ping);


        websocket.on("message",(message)=>{
            const parsedMessage = JSON.parse(message);
            console.log("parsedMessage",parsedMessage);
            websocket.send(JSON.stringify(message));
        })

    })

    
    return websocketServer;

}