const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');
const app = new Koa();

app.use(cors());

app.use(koaBody());

const router = new Router();

const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

app.use(router.routes()).use(router.allowedMethods());

const userNames = [];

router.get('/check', async (ctx) => {
  ctx.response.body = 'hello';
  ctx.response.status = 200;
});

router.post('/users', async (ctx) => {
  const name = ctx.request.body.name;
  const lowerCasedName = name.toLowerCase();
  const nameExists = userNames.some((name) => {
    return name.toLowerCase() === lowerCasedName;
  });
  if (nameExists) {
    ctx.throw(400, 'User name already exists!')
  }
  userNames.push(name);
  ctx.response.status = 204;
});

const clients = new Map();

wsServer.on('connection', (ws) => {
  clients.set(ws, userNames[userNames.length - 1]);
  [...wsServer.clients]
    .filter(o => clients.has(o))
    .forEach(o => o.send(JSON.stringify(userNames)));

  ws.on('message', (msg) => {
    [...wsServer.clients]
      .filter(o => clients.has(o))
      .forEach(o => o.send(msg));
  });

  ws.on('close', function () {
    const quitedUserName = clients.get(ws);
    const userIndex = userNames.findIndex((userName) => userName === quitedUserName);
    userNames.splice(userIndex, 1);
    clients.delete(ws);
    [...wsServer.clients]
      .filter(o => clients.has(o))
      .forEach(o => o.send(JSON.stringify(userNames)));
  });
});

const port = process.env.PORT || 7070;
server.listen(port);