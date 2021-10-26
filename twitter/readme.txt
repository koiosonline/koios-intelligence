The goal of this tool is the see which twitter accounts are being followed over time.
You input a list of accounts and run this tool every day.
Then it checks the new followings of the previous day (e.g. previous run of this tool)

Preconditions:
create a folder in the home folder, for example twitter
store getfollows.js in this folder (rename getfollows.js.txt to getfollows.js)
Install node.js  (see https://nodejs.org  )
Run "npm install node-fetch"  (in the directory twitter)
      
On MacOs, start a command promt and execute: chmod +x go.command

Get a bearer token and save this in the file ".token" (in the directory twitter)
You can request that here: https://developer.twitter.com/en
At the end you get 3 codes (API key, Secret key, Bearer token). Put the Bearer token in the file ".token"

On MacOs Doubleclick on go.command  (preferably 1x per day)
On Windows Doubleclick on go.cmd (preferably 1x per day)
    
The first time it will take a long time, just let it run.

Input: handles.txt
This is a text files, which contains the twitter accounts you want to follow. One name per line, without an @.

Output: log.csv  (which can be loaded in excel)
log.csv contains lines with 3 fields, separated by ";":
account;followedaccount;date

Sideeffects:
The tool creates a file: status.json which remembers the number of follows of each user.
A directory "db" is created. In this directory, a file is created for each of the accounts you follow.
This file contains the list of accounts that are followed by that account.
