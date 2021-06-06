var args = process.argv; args.shift(); args.shift();
var cliUrl = args[0];

const { spawn } = require('child_process');
const http = require('http');
const disk = require('fs');


let host = http.createServer(function(req,rsp)
{
    if(req.method == "GET")
    {
        rsp.statusCode=200;
        rsp.end(disk.readFileSync(__dirname+"/index.html"));
        return;
    };

    if(req.method == "POST")
    {
        var bufr = "";
        req.on("data", function(text)
        {
            bufr += text;
        });

        req.on("end",function()
        {
            const ls = spawn("youtube-dl", [bufr,"--extract-audio","--embed-thumbnail"]);

            ls.stdout.on("data", (data) => {
              console.log(`stdout: ${data}`);
            });

            ls.stderr.on("data", (data) => {
              console.error(`stderr: ${data}`);
            });

            ls.on("close", (code) => {
              console.log(`done`);
            });

            rsp.statusCode=200;
            rsp.end(bufr);
            return;
        });

    };
});

host.listen(1234,"0.0.0.0");
