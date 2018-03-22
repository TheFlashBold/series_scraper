const request = require('request');
const xpath = require('xpath');
const DOMParser = require('xmldom').DOMParser;
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const process = require('process');
const exec = require('child_process').exec;
const ProgressBar = require('cli-progress');

const downloadCommand = "QT_QPA_PLATFORM=offscreen youtube-dl \"%url%\" --external-downloader aria2c --external-downloader-args \"-s 16 -x 16\" --output \"./dl/%(title)s.%(ext)s\"";
const downloadCommandWindows = "youtube-dl \"%url%\" --external-downloader aria2c --external-downloader-args \"-s 16 -x 16\" --output \"./dl/%(title)s.%(ext)s\"";

let sites = {};

let sitesJS = fs.readdirSync("sites");
sitesJS.forEach(site => {
    let sitename = site.replace(".js", "");
    sites[sitename] = require('./sites/' + site);
});

function getHostName(url) {
    let match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
        return match[2];
    }
    else {
        return null;
    }
}

if (process.argv.length > 2) {
    let urls = process.argv;
    urls.shift();
    urls.shift();

    urls.map((url) => {
        let host = getHostName(url);
        let site = sites[host];
        if (!site) {
            console.log("Site has no module " + host);
        }
        let schema = site.schema;
        return getData(url, schema).then(async (data) => {
            console.log(data);
            for(let i = 0; i < data.urls.length; i++){
                await downloadFile(data.urls[i], true);
            }
            /*
            return downloadFile(data.urls[0]);
            data.urls.map((dlurl) => {
            });
            */
        });
    });
}

async function downloadFile(url, async = false) {
    return new Promise(async (resolve, reject) => {
        let cmd = exec(downloadCommandWindows.replace("%url%", url));

        let bar;
        if(async) {
            bar = new ProgressBar.Bar({}, ProgressBar.Presets.legacy);
            bar.start(100, 0);
        }
        let percent = 0;

        cmd.stdout.on('data', (data) => {
            let percentData = data.toString().match(/\((\d{1,2})%\)/);
            if (percentData != null && percentData.length && percentData.length > 0) {
                percent = parseInt(percentData[1].replace("%", ""));
                if(async) {
                    bar.update(percent);
                }
            }
        });

        cmd.on('exit', (code) => {
            if(async) {
                bar.update(100);
                bar.stop();
            }
            console.log('Download done ' + url);
            return resolve();
        });
    });
}


function errorHandler(err) {
    //TODO: write to file
}

function getData(url, schema) {
    return new Promise((resolve, reject) => {
        return request({uri: url,}, function (error, response, body) {
            var xml = body;
            var doc = new DOMParser({errorHandler: errorHandler}).parseFromString(xml);

            let data = {};

            for (let i = 0; i < Object.keys(schema).length; i++) {
                let key = Object.keys(schema)[i];
                let paths = schema[key];

                let value = "";

                if (paths instanceof Array) {
                    for (let j = 0; j < paths.length; j++) {
                        if (paths[j] instanceof Function) {
                            value = paths[j](value);
                        } else if (value === "") {
                            let path = paths[j];
                            try {
                                value = xpath.select(path, doc);
                                value = value.toString().trim();
                                console.log(value);
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    }
                } else {
                    try {
                        value = xpath.select(paths, doc);
                        console.log(value);
                        value = value.toString().trim();
                    } catch (e) {
                        console.log(e);
                    }
                }
                data[key] = value;
            }

            return resolve(data);
        });
    });
}

/*

getData("http://www.anime-kishi-ger-dub.tv/2018/02/rakudai-kishi-no-cavalry.html", test).then((data) => {
    console.log("downloadMovie \"" + data.urls.join("\" & downloadMovie \"") + "\"");
});


/*
getData("https://bs.to/serie/S-W-A-T/1", serienSchema).then((data) => {
    console.log(data);
});


/*

getData("https://bs.to/serie/S-W-A-T/1/6-Undercover-Einsatz/OpenLoadHD", folgenSchema).then((data) => {
    console.log(data);
});

/*
function doStuff() {
    let data = [];
    if (fs.existsSync(path.resolve('data.json'))) {
        try {
            data = JSON.parse(fs.readFileSync(path.resolve('data.json'), 'UTF-8'));
        } catch (e) {
            console.log(e);
            return;
        }
    }
    let time = new Date();

    let urls = [];

    let schema = {};

    if (fs.existsSync(path.resolve('urls.json'))) {
        urls = JSON.parse(fs.readFileSync(path.resolve('urls.json'), 'UTF-8'));
    }

    if (fs.existsSync(path.resolve('schema.json'))) {
        schema = JSON.parse(fs.readFileSync(path.resolve('schema.json'), 'UTF-8'));
    }

    return new Promise.map(urls, (url) => {
        return getData(url, schema);
    }).then((result) => {
        let obj = {
            time: time,
            data: result
        };
        console.log(JSON.stringify(result, null, 4));
        data.push(obj);
        fs.writeFileSync(path.resolve('data.json'), JSON.stringify(data, null, 4), 'UTF-8');
    });
}

doStuff();


let rule = new schedule.RecurrenceRule();

rule.hour = [0, 6, 12, 18];
rule.minute = 0;

let j = schedule.scheduleJob(rule, function () {
    doStuff();
});
*/