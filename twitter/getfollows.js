
// https://developer.twitter.com/en/docs/twitter-api/users/follows/introduction

const fetch = require("node-fetch");
const fsp = require('fs').promises;
var globaltoken =  "Bearer "; // add the bearer globaltoken itself after this string
var global_twitter_error=false;
var globalhandlestatus={}

function sleep(ms) {
    try {var prom=new Promise(resolve => setTimeout(resolve, ms)); } catch (error) {console.log(error); }
    return prom
}

async function GetLinesFile(filename) {
    var csvbuffer;
    try {
        csvbuffer = await fsp.readFile(filename);
    } catch (error) { // ignore
        //console.log(error);
        return [];
    }
    
    const csv = csvbuffer.toString('utf8');  
    var allTextLines = csv.split(/\r\n|\n/);
    return allTextLines;
}    

async function GetSCVFile(filename) {
    allTextLines=await GetLinesFile(filename);
    var lines = [];
    while (allTextLines.length) {
        lines.push(allTextLines.shift().split(';'));
    }
	return lines;
}    


async function TwitterAPI(query) {
    const method = "GET";
    const options = {
      method: method,
      headers: {
        "Content-type": "application/json",
        Authorization: globaltoken,
      },
    };
    
  if (global_twitter_error)
        return "error";
  try {
      var q=`https://api.twitter.com/2/${query}`;
      //console.log(q);
      const response = await fetch(q,options);
      //console.log(response);
      if (response.status !=200) {
          console.log(response.statusText);
          global_twitter_error=true;
          return response.statusText;
      }
      let data = await response.json();
      return data;
  } catch (error) {
    console.log(error);
    return "error";
  }
}    


    
async function getIdFromName(name) {
    if (global_twitter_error) return {id:0,fc:0};
    //if (++globalratelimitusers >= 300) {
        console.log(`Get id of name: ${name} (wait 2 sec)`); // or 3 seconds
        await sleep(2*1000);
    // }
    let res=await TwitterAPI(`users/by/username/${name}`);    
    return res?.data?.id;
}    



var globalratelimitusers=0;
var globalratelimitfollowing=0;
async function getFollowing(checkname,getall) {
    var pt=""
    var extra=""
    var res 
    var list=[]
    var id=globalhandlestatus[checkname].id;
    var fc=globalhandlestatus[checkname].newfc;
    if (global_twitter_error) return [];
    do {
        //if (++globalratelimitfollowing >= 15) {
            console.log(`Get ${Math.min(fc,1000)} follows of ${checkname} (wait 60 sec)`);
            await sleep(60*1000);
       // }
        res=await TwitterAPI(`users/${id}/following?max_results=1000&user.fields=public_metrics${extra}`);  
        fc -= 1000;
        //console.log(res);
        pt=res?.meta?.next_token;
        extra=`&pagination_token=${pt}`
        //console.log(pt);
         if (res?.data) {
             for (let i = 0; i < res.data.length; i++) {
               list.push( { un:res.data[i].username,
                            id:res.data[i].id,
                            fc:res.data[i].public_metrics.following_count 
                          });
             }     
         }
    } while (pt && getall &&!global_twitter_error); // if getall==true, then first time; get all records
    return list;
}   

function fix(str,n) {
    str=String(str)
    if (!n) n=20;
    str=str.replace(/\n/g,' ') // remove new lines
    str=str.replace(/\r/g,' ') // remove new lines
    str=str.replace(/[^0-9a-zA-Zë_]/g,' ')   // change unsupported chars to space // keep ë
    return str.substring(0,n).padEnd(n, ' ')
}


//var prevcount=globalhandlestatus[analyselist[i]].fc;        
        //if (!prevcount) { // don't log if it is the first time, too many false positives
          //continue;
        //}


async function updateAppend(checkname) {
    var fn=`db/${checkname}.txt`;
    var savedlist=await GetLinesFile(fn);
    var followinglist=await getFollowing(checkname,savedlist.length==0);
    var updated=[];
    var toadd="";
    for (let i = 0; i < followinglist.length; i++) {
        var un=followinglist[i].un;
        if (!savedlist.includes(un)) {
            toadd +=un+"\n";
            updated.push(un);
        }
        
        
    }    
    if (toadd)
        await fsp.appendFile(fn,toadd); 
    globalhandlestatus[checkname].fc=globalhandlestatus[checkname].newfc    
    globalhandlestatus[checkname].newfc=undefined;
   
    if (savedlist.length==0) return []; // new file, dont log all the entries
    return updated;
}    





//globalhandlestatus
async function Analyse(analyselist) {
    console.log(`Checking ${analyselist.length} accounts`);
    //console.log(analyselist);
    var ids="";
    for (let i=0;i<analyselist.length;i++) {
        //console.log(analyselist[i]);
        ids +=globalhandlestatus[analyselist[i]].id;
        if (i!=analyselist.length-1) ids +=",";
    }
    console.log(ids);
    
   // if (++globalratelimitusers >= 300) {
        console.log(`Analyse ${analyselist.length} accounts (wait 2 sec)`); // or 3 seconds
        await sleep(2*1000);
    //}
    
    let res=await TwitterAPI(`users?user.fields=public_metrics&ids=${ids}`);
    var updates=0;
    var updatelist=[];
    //console.log(res);
    var log="";
    for (let i=0;i<analyselist.length;i++) {
        var checkname=analyselist[i];
        //console.log(checkname);
        var prevcount=globalhandlestatus[checkname].fc;
        //console.log(res.data[i]);
        var fc=res.data[i].public_metrics.following_count;        
        globalhandlestatus[checkname].newfc = fc; 
        if (prevcount == fc || fc==0) {
            continue;
        }
        console.log(`Need to check ${checkname} had ${prevcount} and now has ${fc}`);
        updatelist.push(checkname);
    }
    
    var d=new Date();var mm=d.getMonth()+1;var yy=d.getFullYear();var dd=d.getDate();        
    for (let i=0;i<updatelist.length;i++) {
        var checkname=updatelist[i];        
        var updated=await updateAppend(checkname);  
        for (let i=0;i<updated.length;i++) 
           log+=`${checkname}\t${updated[i]}\t${dd}-${mm}-${yy}\n`;
        updates+=updated.length    
        if (log) {
            await logstr(log);    
            log=""; 
        }
        var save=JSON.stringify(globalhandlestatus,null," ");
        await fsp.writeFile('status.json', save);   // save frequently // is up to date now 
    }
    
    return updates
}    

async function logstr(str) {
    try {
        await fsp.appendFile("log.csv",str);
    } catch(error) { 
        console.log("Can't access log file"); 
        process.exit(1); // exit because being able to log is the main goal
    }
}    

var startTime, endTime;

async function start(n) {
  startTime = new Date();
  var str=`\t\t\t=======Start scan: Analyse ${n} accounts at ${startTime.toLocaleString()}\n`;
  await logstr(str);
  console.log(str);
};

async function end(n,totalupdates) {
  endTime = new Date();
  var timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds 
  var seconds = Math.round(timeDiff);
  //console.log(seconds + " seconds");
  var str=`\t\t\t=======End scan: ${n} accounts checked. New follows ${totalupdates} in ${seconds} seconds ${endTime.toLocaleString()}\n`;
  await logstr(str);
  console.log(str);
}



async function go() {   
    try {var bearer =(await fsp.readFile(".token")).toString().trim(); }catch (error) {} // bearer token
    if (!bearer) { console.log("Can't find file .token");return;}    
    globaltoken +=bearer;
    
    var inputfile="handles.txt";
    try { await fsp.mkdir("db"); } catch (error) {} // ignore errors

    var handles=await GetLinesFile(inputfile);
    
    var statusjson
    try { statusjson=await fsp.readFile("status.json");} catch (error) {} // ignore errors // saved in Analyse
    if (statusjson)
        globalhandlestatus= JSON.parse(statusjson.toString())
    if (!handles[handles.length-1])
        handles.pop(); // get rid of last empty line
    await start(handles.length); 
    
    var totalupdates=0;
    var analyselist=[];
    var count=0;
    for (let i=0;(i<handles.length) && !global_twitter_error;i++) { // get all id's
        var checkname=handles[i];   
        if (!checkname) continue;        
        if (!globalhandlestatus[checkname]) globalhandlestatus[checkname]={};
        if (!globalhandlestatus[checkname].id) globalhandlestatus[checkname].id=await getIdFromName(checkname); 
        if (!globalhandlestatus[checkname].id) {// somehow id now found
            console.log(`Id for ${checkname} not found`);
        } else            
            analyselist.push(checkname)
        if (++count ==10 || (i==handles.length-1))  {                    
            totalupdates +=await Analyse(analyselist);
            count=0;
            analyselist=[];
        }        
    }  
    await end(handles.length,totalupdates);
}  

go()

//fsPromises.rename(oldPath, newPath)