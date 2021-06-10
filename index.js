
// globals - prep our environment
// -----------------------------------------------------------------------------------------------------------------------------
    var args = process.argv; // get list of arguments as array from command-line
    args.shift(); args.shift(); // rip out the 1st & 2nd as we dont need them, we only want what the cli user typed
    var cliUrl = args[0]; // grabs 1st item

    const { spawn } = require("child_process"); // function - gets spawn process
    const http = require("http"); // needed to create http server
    const disk = require("fs"); // needed to read file
    const zlib = require("zip-local");
    const mime = require("mime-types");
// -----------------------------------------------------------------------------------------------------------------------------




// func ::  copy : things
// -----------------------------------------------------------------------------------------------------------------------------
    const copy = function(what,times)
    {
        if((typeof times)!="number"){times=1}; let resl;
        if((typeof what)=="string")
        {
            resl = ""; while(resl.length < (what.length * times)){resl += what};
            return resl;
        };
    };
// -----------------------------------------------------------------------------------------------------------------------------




// function :: ytdl : uses spawn to wield the super awesome youtube-dl .. needs only a url and a callback function
// -----------------------------------------------------------------------------------------------------------------------------
    const ytdl = function(url,dst,progress,done)
    {
        const cli = spawn("youtube-dl", ["--extract-audio","--embed-thumbnail",url], {cwd:dst});

        cli.stdout.on("data", (data) =>
        {
            data = (data+""); // convert data to plain string (text)
            if((data.indexOf("[download]") < 0) || (data.indexOf("% of") < 0) || (data.indexOf(" at ") < 0)) // if missing
            {return}; // not interesting

            let prcn = data.split("[download]").pop().trim().split(" of ")[0];
            prcn = Math.ceil(prcn.split("%").join("") * 1);
            progress(prcn);
        });

        cli.stderr.on("data", (data) =>
        {
            if((data+"").indexOf(" thumbnail ") > 0){return}; // not interesting
            console.error(`stderr: ${data}`);
        });

        cli.on("close", (code) =>
        {
            done();
        });
    };
// -----------------------------------------------------------------------------------------------------------------------------
// usage :: example : ytdl("http://youtu.be/kb2hbjh2vj, ()=>{});




// cond :: CLI : for command line interface only - this should end here, as an argument was given, and download the url
// -----------------------------------------------------------------------------------------------------------------------------
    if (cliUrl)
    {
        ytdl
        (
            cliUrl,

            (args[1] || "."),

            function(dne)
            {
                console.log(dne+" ...almost there");
            },

            function()
            {
                console.log("done .. Enjoy!");
            }
        );
    };
// -----------------------------------------------------------------------------------------------------------------------------





// cond :: GUI : for Frontside..
// -----------------------------------------------------------------------------------------------------------------------------
    if (!cliUrl)
    {
        let host = http.createServer(function(req,rsp) //declaring Variable: 'host' , creating a unique http server
        {
            if(req.method == "GET") // if ANY request method is 'GET' .. then serve index
            {
                let path,stat;
                path = (req.url||""); if(path.startsWith("/")){path = path.slice(1)};
                path = (__dirname +"/"+ (path||"index.html"));

                if(!disk.existsSync(path)){rsp.statusCode=404; rsp.end(); return}; // Not Found .. exits here if so
                stat = disk.statSync(path);

                if(stat.isFile(path))
                {
                    rsp.statusCode=200;
                    rsp.setHeader("Content-Type",mime.lookup(path));
                    rsp.end(disk.readFileSync(path));
                    return;
                };

                rsp.statusCode=403;
                rsp.end(); return;
            };

            if(req.method == "POST") // if ANY request method is 'POST' ..
            {
                var trgt = ""; // collected data from client, stored here
                req.on("data", function(text){trgt += text});

                req.on("end",function()
                {
                    var maxl,char,bufr,last,diff,nbfr,sent,hash,path;

                    maxl = (1000 * 1000);
                    char = ".";
                    bufr = copy(char,maxl);
                    last = 0;
                    diff = 0;
                    nbfr = "";
                    sent = "";
                    hash = trgt.split(".be/").pop().split("?v=").pop();
                    path = (__dirname+"/"+hash);

                    if(disk.existsSync(path))
                    {
                        let cmd1 = spawn("rm", ["-rf",path], {cwd:__dirname});
                        let cmd2 = spawn("rm", ["-rf",(path+".zip")], {cwd:__dirname});
                    };

                    setTimeout(()=>
                    {
                        disk.mkdirSync(path);

                        rsp.statusCode = 200;
                        rsp.setHeader("Content-Type","text/plain");
                        rsp.setHeader("Content-Length",maxl);
                        rsp.flushHeaders();

                        ytdl
                        (
                            trgt,
                            path,
                            function(prc)
                            {
                                // console.log(prc);
                                let nprc = ((prc*10) *1000);
                                diff = Math.ceil(nprc - last);
                                if(!prc || !diff){return};
                                last = nprc;
                                nbfr = bufr.slice(0,diff);
                                rsp.write(nbfr,"utf8");
                            },
                            function()
                            {
                                console.log("fetch done");
                                console.log("compressing into zip ...");
                                zlib.sync.zip(path).compress().save(`${__dirname}/${hash}.zip`);
                                rsp.end();
                                console.log("all done");
                            },
                        );
                    },500);
                });

            };
        });

        host.listen(1234,"0.0.0.0");  // The Host! (and an 'event listener')

        const cli = spawn("firefox", ["http://localhost:1234","--window-size=360,200"]);
    };
// -----------------------------------------------------------------------------------------------------------------------------
