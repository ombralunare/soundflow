
// globals - prep our environment
// -----------------------------------------------------------------------------------------------------------------------------
    var args = process.argv; // get list of arguments as array from command-line
    args.shift(); args.shift(); // rip out the 1st & 2nd as we dont need them, we only want what the cli user typed
    var cliUrl = args[0]; // grabs 1st item

    const { spawn } = require('child_process'); // function - gets spawn process
    const http = require('http'); // needed to create http server
    const disk = require('fs'); // needed to read file
    const archiver = require('archiver');
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
                let path = (__dirname+(req.url||""));
                let stat = disk.statSync(req.url);

                if(!req.url || (req.url == "/"))
                {
                    rsp.statusCode=200;
                    rsp.end(disk.readFileSync(__dirname+"/index.html"));
                    return;
                };

                if(!fs.existsSync(path))
                {
                    rsp.statusCode=404;
                    rsp.end();
                    return;
                };

                if(stat.isFile(path))
                {
                    rsp.statusCode=200;
                    rsp.end(disk.readFileSync(path));
                    return;
                };
            };

            if(req.method == "POST") // if ANY request method is 'POST' ..
            {
                var trgt = ""; // collected data from client, stored here
                req.on("data", function(text){trgt += text});

                req.on("end",function()
                {
                    var maxl,char,bufr,last,diff,nbfr,sent,fldr,path;

                    maxl = (1000 * 1000);
                    char = ".";
                    bufr = copy(char,maxl);
                    last = 0;
                    diff = 0;
                    nbfr = "";
                    sent = "";
                    fldr = trgt.split(".be/").pop().split("?v=").pop();
                    path = (__dirname+"/"+fldr);

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
                            rsp.end();
                            console.log("done");

                            console.log("compressing into zip ...");

                            const output = disk.createWriteStream(path + '/example.zip');
                            const archive = archiver('zip',
                            {
                                zlib: { level: 9 } // Sets the compression level.
                            });

                            output.on('close', function()
                            {
                                console.log(archive.pointer() + ' total bytes');
                                console.log('archiver has been finalized and the output file descriptor has closed.');
                            });

                            output.on('end', function()
                            {
                                console.log('Data has been drained');
                            });

                            archive.on('warning', function(err)
                            {
                                 if (err.code === 'ENOENT')
                                 {
                                     // log warning
                                 }
                                 else
                                 {
                                     throw err;          //show error
                                }
                            });


                            archive.on('error', function(err)
                            {
                                throw err;
                            });


                            archive.pipe(output);

                            const file1 = path + '/file1.txt';
                            archive.append(disk.createReadStream(file1), { name: 'file1.txt' });

                            // append a file from string
                            archive.append('string cheese!', { name: 'file2.txt' });

                            // append a file from buffer
                            const bfr3 = bfr.from('buff it!');
                            archive.append(bfr3, { name: 'file3.txt' });

                            // append a file
                            archive.file('file1.txt', { name: 'file4.txt' });

                            // append files from a sub-directory and naming it `new-subdir` within the archive
                            archive.directory('subdir/', 'new-subdir');

                            // append files from a sub-directory, putting its contents at the root of archive
                            archive.directory('subdir/', false);

                            // append files from a glob pattern
                            archive.glob('file*.txt', {cwd:path});

                            // finalize the archive (ie we are done appending files but streams have yet to finish)
                            // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
                            archive.finalize();


                            const url ="";      //download File from link and check when/if complete...
                            const file = disk.createWriteStream("./uploads/exp.mp3"); //?? - url, "file/txt"
                            https.get(url, async function (response)
                                {
                                response.pipe(file);
                                console.log("downloading started");

                                // if(error)        //not sure if that's right
                                {
                                response.on("error", (err) =>
                                {
                                console.log("some error occurred while downloading");
                                throw err;
                                });

                                response.on("end", () =>
                                {
                                    console.log("it worked, download completed");
                                });

                            });

                            // const express = require('express')
                            //     // require fs package to read files
                            //     var fs = require('fs');
                            //     const app = express()
                            //     const port = 9000
                            //     const AdmZip = require('adm-zip');
                            //     var uploadDir = fs.readdirSync(__dirname+"/upload");
                            //
                            //     app.get('/', (req, res) => {
                            //
                            // const zip = new AdmZip();
                            //
                            //     for(var i = 0; i < uploadDir.length;i++){
                            //     zip.addLocalFile(__dirname+"/upload/"+uploadDir[i]);
                            //         }
                            //
                            return;
                        },                          //make it 'downloadable' for User... WORK IN PROGRESS!
                    );
                });

            };
        });

        host.listen(1234,"0.0.0.0");  // The Host! (and an 'event listener')

        const cli = spawn("firefox", ["http://localhost:1234","--window-size=360,200"]);
    };
// -----------------------------------------------------------------------------------------------------------------------------
