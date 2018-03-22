module.exports = {
    version: "1.0",
    schema: {
        "urls": [
            "//iframe/@src",
            "//article/div/div[1]/div[7]/a/@href",
            (data) => {
                let links = [];
                let regex = /src=\"(https\:\/\/openload\.co\/embed\/[^\"]*)\"/ig;
                let match = regex.exec(data);
                while (match != null) {
                    links.push(match[1]);
                    match = regex.exec(data);
                }
                return links;
            }
        ]
    }
}