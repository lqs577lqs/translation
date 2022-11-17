const fs = require("fs")
const axios = require("axios");
const CryptoJS = require("crypto-js");

class Translation {
    constructor(youDaoPram, basePath=""){
        this.ydParam = youDaoPram;
        this.basePath = basePath;
    }

    
    handleFiles() {
        console.log("this>>>", this);
        if(!this.filesPaths?.length) return;
        const filepath = this.filesPaths.pop();
        console.log("filepath>>>", filepath);
        fs.readFile(filepath, (function (err, data) {
            if (err) {
                return console.error(err);
            }
            let obj;
            try {
                obj=JSON.parse(Translation.fomatFileStr(data.toString().split("export default")[1]));
            } catch (error) {
                console.log("error>>>", error);
            }
            const filepathArr = filepath.split("/");
            filepathArr.shift();

            Translation.translate(obj, filepathArr.join("/"), this.ydParam, this.basePath).then((response)=>{
                console.log(response + "：执行完成");
            }).finally(()=>{
                this.handleFiles();
            })
        }).bind(this));
    }


    setFolders(folders) {
        this.folders = folders;
        this.filesPaths = this.folders.reduce((acc,next)=>{
            return acc.concat(Translation.getAllFiles(this.basePath + "input/" + next));
        },[])
        return this;
    }

    setYouDaoParam(youDaoPram) {
        this.ydParam = youDaoPram;
    }
    
    static flatObj (obj, arr){
        if(!obj) return;
        for(let key in obj) {
            if(typeof obj[key] === "string") {
                arr.push({key: key, value: obj[key]})
            } else {
               Translation.flatObj(obj[key], arr);
            }
        }
    }

    static setValue (obj, arr) {
        if(!obj) return;
        for(let key in obj) {
            if(typeof obj[key] === "string") {
                const temp = arr.find(item=> item.key === key);
                if(temp) {
                    obj[key] = temp.value
                }
            } else {
                Translation.setValue(obj[key], arr);
            }
        }
    }

    static fomatFileStr (str) {
        return str.replace(/(['"])?(\d{4})-(\d{1,2})-(\d{1,2})?\s*,/g, '"$2-$3-$4",')
                    // 通过@colon@替换“:”，防止日期格式报错
                    .replace(/(['"])?(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})(['"])?\s*,/g, '"$2-$3-$4 $5@colon@$6@colon@$7",')
                    .replace(/(['"])?([a-z0-9A-Z\u4e00-\u9fa5_]+)(['"])?\s*:/g, '"$2": ')
                    // .replace(/:\s*(['"])?([a-z0-9A-Z\u4e00-\u9fa5_]+)(['"])?\s*,/g, ': "$2",')
                    .replace(/@colon@/g, ":")
                    .replace(/:\s*,/g, `:"",`)
                    .replace(/:\s*,\s*}/g, `:""}`)
                    .replace(/:\s*,\s"/g, `:"","`)
                    .replace(/:\s*,\s'/g, `:"",'`)
                    .replace(/,\s*}/g, "}")
                    .replaceAll("'",'"')
                    .replaceAll("};","}");
    }

    static getAllFiles(root){
        var res = [] , files = fs.readdirSync(root);
        res = files.map(filename=> root + "/" +filename);
        return res
    }

    
    static truncate(q){
        var len = q.length;
        if(len<=20) return q;
        return q.substring(0, 10) + len + q.substring(len-10, len);
    }

    static translate (obj, filename ,{
        appKey,
        key
    }, basePath) {
        return new Promise(resolve=> {
            
            const flatData = [];
            //取出所有key, value
            Translation.flatObj(obj, flatData);

            const promises = flatData.map(item=> {
                const curtime = Math.round(new Date().getTime()/1000);
                const salt = (new Date).getTime();
                const str1 = appKey + Translation.truncate(item.value) + salt + curtime + key;
                const sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);
                //翻译字符
                return axios({
                    url: "https://openapi.youdao.com/api",
                    method: "POST",
                    data: {
                        q: item.value,
                        appKey: appKey,
                        salt: salt,
                        from: "zh-CHS",
                        to: "th",
                        sign: sign,
                        signType: "v3",
                        curtime: curtime,
                    },
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                    }
                })
            })
            Promise.all(promises).then(response=>{
                const result = flatData.map((item,index) => {
                    return {
                        ...item,
                        value: response[index]?.data?.translation && response[index]?.data?.translation[0]
                    }
                })
                Translation.setValue(obj, result);

                fs.writeFile(basePath + 'output/' + filename, "export default " + JSON.stringify(obj, null, "\t"),  function(err) {
                    if (err) {
                        return console.error(err);
                    }
                    resolve(filename);
                });
            });
        })
    }
}

module.exports = Translation;