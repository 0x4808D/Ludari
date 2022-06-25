const { v4 } = require('uuid');
const readline = require('readline');
const isAdmin = require('is-admin');
const fetch = require('node-fetch');
const fs = require('fs');
const execFile = require('child_process').spawn;

const BASE_URL = "aHR0cHM6Ly9tYXBsZXN0YXJzMi50by9hcGkv";
const EXE_PATH = "Li94NjQvTWFwbGVTdGFyczIuZXhl";
const XML_HASH = "8a0f6bffe08d6582062be9d37563ad9b45f6c530be0989609005888b917adbd9";

function getString(input) {
    const buff = Buffer.from(input, 'base64');
    return buff.toString('ascii');
}

function saveString(input) {
    const buff = Buffer.from(input, 'utf-8')
    return buff.toString('base64');
}

async function login(data) {
    return fetch(getString(BASE_URL) + 'launcher/login', {
        'headers': {
            'accept': '*/*',
            'content-type': 'application/json',
            'cookie': '',
        },
        'body': JSON.stringify(data),
        'method': 'POST',
    });
}

async function getLoginToken(data, cookies) {
    return fetch(getString(BASE_URL) + 'launcher/generate', {
        'headers': {
            'accept': '*/*',
            'content-type': 'application/json',
            'cookie': cookies,
        },
        'body': JSON.stringify(data),
        'method': 'POST',
    });
}

function getFingerprint() {
    const fingerprint = {
        "u": {
            "Uid": `S-1-5-32-${v4()}`,
            "Gid": `S-1-5-32-544-${v4()}`,
            "Username": `User`,
            "Name": "",
            "HomeDir": "C:\\Users\\User"
        },
        "h": "Windows 10 Home",
        "i": "10.0.0.0",
        "m": [
            "00:00:00:00:00:00"
        ]
    };
    return saveString(JSON.stringify(fingerprint));
}

function getInput(query, isPassword) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.stdoutMuted = isPassword;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (!rl.stdoutMuted)
            rl.output.write(stringToWrite);
    };

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

function getCookies(response) {
    const entries = response.headers.raw()['set-cookie'];
    return entries.map((entry) => {
        const cookie = entry.split(';');
        const data = cookie[0];
        return data;
    }).join(';');
}

function launchClient(token) {
    const client = execFile(getString(EXE_PATH), [`/sid:0`, `/passport:${token}`], {
        detached: true,
    });
    client.unref();
}

function getSavedInfo() {
    try {
        const data = fs.readFileSync('ludari.session', 'utf8');
        const info = data.split('\n');
        return {
            username: getString(info[0]),
            password: getString(info[1]),
            fingerprint: info[2]
        };
    } catch (e) {
        return null;
    }
}

function saveInfo(username, password, fingerprint) {
    fs.writeFileSync('ludari.session', `${saveString(username)}\n${saveString(password)}\n${fingerprint}`);
}

(async () => {
    const hasAdmin = await isAdmin();
    if (!hasAdmin) {
        console.log('Ludari must be launched with administrator rights.')
        await new Promise(r => setTimeout(() => { r() }, 5000));
        process.exit(1);
    }

    const saved = getSavedInfo();

    const loginData = saved ?? {
        fingerprint: '',
        username: '',
        password: ''
    };
    if (!saved) {
        loginData.fingerprint = getFingerprint();
        console.log(`Generated Fingerprint...`);

        const save = await getInput('Save Username/Password? [y/n]', false);
        loginData.username = await getInput('Enter Username: ', false);
        console.log('Enter Password: ');
        loginData.password = await getInput('', true);

        if (save.toLowerCase() === 'y') {
            saveInfo(loginData.username, loginData.password, loginData.fingerprint);
        }
    }

    const loginResponse = await login(loginData);

    const loginCookies = getCookies(loginResponse);

    const tokenResponse = await getLoginToken({
        fingerprint: loginData.fingerprint,
        id: XML_HASH,
    }, loginCookies);

    const data = await tokenResponse.json();

    launchClient(data.data);
    await new Promise(r => setTimeout(() => { r() }, 1000));
    process.exit(1);
})();
