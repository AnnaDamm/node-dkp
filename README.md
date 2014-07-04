# node-dkp
node-dkp is a DKP system for MMORPGs written in NodeJS. It handles raid or guild meeting registrations and tracks items that members got within the raids, as well as points given or taken.

![](/screenshots/screenshots_together.png)
([Weitere Screenshots](/screenshots))

## Pre-Requisits
* MongoDB server >= 2.2.x
* NodeJS  >= 0.10.x
* Redis Server >= 2.6.x


## Installation
Clone via git:

````sh
git clone https://github.com/Arany/node-dkp.git
cd node-dkp
./install.js
````


Or install via npm:

````sh
npm install node-dkp
cd node_modules/node-dkp
./install.js
````

The install script will run you through the configuration of your server and set up an admin account.

### Upgrading
Via git:

````sh
git pull
./update.sh
````

Via npm:

````sh
npm update node-dkp
````

## Running the server

To run the server, run this command in the node-dkp directory:

````sh
./app.js
````

You can use [forever](https://github.com/nodejitsu/forever) to run it as a deamon in the background:

````sh
forever start /path/to/node-dkp/app.js
````

## Setting things up
Once the server is running, you can access it via browser and login to your admin account. You can set up your page name, raid types, item drops, characters roles / classes, etc.

After that, click on "New event" and start with your first raid!


## Contribution
You can help translate node-dkp into other languages at Transifex: https://www.transifex.com/projects/p/node-dkp

If you find bugs or have feature requests, please go to [Issues](/../../issues)

## License
[GPLv2](LICENSE)
