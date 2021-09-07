const koa = require("koa");
const router = require("koa-router")();
const bodyparser = require("koa-bodyparser");
const fs = require("mz/fs");
// const mime = require("mime");
const axios = require("axios").default;


const app = new koa();
app.use(bodyparser());


app.use(async (ctx, next) => {
    console.log(ctx.request.method + " " + ctx.request.url);
    await next();
});

router.get("/", async (ctx, next) => {
    ctx.response.type = "text/html";
    ctx.response.body = await fs.readFile("./index.html");
});

router.post("/api/translate", async (ctx, next) => {
    const rawText = ctx.request.body.rawText || "";
    // ctx.response.type = "text/plain";
    // ctx.response.body = rawText;
    await axios({
        url: `http://fanyi.youdao.com/translate?&doctype=json&type=EN2ZH_CN&i=${rawText}`,
        method: 'get',
    }).then(response => {
        const data = response.data
        const targetText = data.translateResult[0][0].tgt
        ctx.response.type = "text/plain";
        ctx.response.body = targetText;
    })
});


// 注册路由
app.use(router.routes());

// 监听端口
app.listen(30000);
const server_port = 30000;
const server_url = "localhost:" + server_port;
console.log(`The server is running at %o...`, server_url);