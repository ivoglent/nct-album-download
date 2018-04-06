const async = require('async');
class Downloader{
    constructor(url, path) {
        this.url = url;
        this.path = path;
        this.songs  = [];
    }

    request(url) {
        return new Promise(((resolve, reject) => {
            let http = require("https");
            console.log('Requesting to', url);
            let data = '';
            http.get(url, function (response) {
                response.setEncoding('utf8');
                response.on('data', function (chunk) {
                    data += (chunk);
                });
                response.on("end", () => {
                   resolve(data);
                });
            }).on('error', function (error) {
                reject(error);
            });
        }))
    }

    download(path, url) {
        return new Promise(((resolve, reject) => {
            let http = require('https');
            const options = {
                hostname: 'www.nhaccuatui.com',
                port: 443,
                path: url,
                method: 'GET',
                headers: {
                    Referer: this.url,
                    "Content-Type" : "application/json",
                }
            };
            http.get(options, function (response) {
                let json = '';
                response.on('data', function (chunk) {
                    json += (chunk);
                });
                response.on("end", () => {
                    let info = JSON.parse(json);
                    if (info && info.error_code === 0) {
                        let fs = require('fs');
                        let file = fs.createWriteStream(path);
                        console.log('Downloading ', info.data.stream_url, '...');
                        let request = require('request')(info.data.stream_url).pipe(file);
                        request.on('close', function () {
                            resolve();
                        });
                        request.on('error', function(err) {
                            fs.unlink(path).then(function () {
                                reject(err);
                            });

                        })
                    } else {
                        console.error('Can not get downloadable url');
                    }
                });
            }).on('error', function (error) {
                reject(error);
            });

        }))
    }

    downloadSongs() {
        let self = this;
        if (this.songs.length) {
            async.eachLimit(this.songs, 1, function (song, next) {
                let path = require('path').join(self.path, song.name + '.mp3');
                console.log('Downloading', song);
                self.download(path, song.url).then(function (result) {
                    next();
                }).catch(function (error) {
                    console.log(error);
                    next();
                });
            }, function (error, result) {
                if (error) {
                    console.error(error);
                }
                console.log('DONE!', self.songs.length, ' songs downloaded');
                console.log(result);
            })
        } else {
            console.error('No song found');
        }
    }

    start() {
        let self = this;
        this.request(this.url).then(function (html) {
            if (html) {
                let data = html.match(/titleplay="(.*?)" id="item_content_(.*?)"/ig);
                if (data && data.length > 0) {
                    data.forEach(function (pair) {
                        let nameData = pair.match(/titleplay="(.*?)"/i);
                        let idData = pair.match(/id="item_content_(.*?)"/i);
                        let name = nameData[1].normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace('/', '-').replace(/\s/ig, '-');
                        let id = idData[1];
                        let url = '/download/song/' + id + '_128';
                        self.songs.push({
                            name : name,
                            url : url
                        });
                    });
                    console.log(self.songs); //process.exit();

                    self.downloadSongs();

                } else {
                    console.log('No song found', data);
                }
            } else {
                console.error('No html response');
            }
        }).catch((error) => {
            console.log(error);
        })
    }
}


let agrs = process.argv.slice(2);
let downloader = new Downloader(agrs[0], agrs[1]);
downloader.start();
